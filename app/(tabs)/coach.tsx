// app/(tabs)/coach.tsx
// AI Coach Chat interface with streaming, quick prompts, image upload.

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp, SlideInRight } from 'react-native-reanimated';

import { supabase } from '@services/supabase';
import { useAuthStore } from '@stores/authStore';
import { useSubscriptionStore } from '@stores/subscriptionStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@constants/design';
import type { ChatMessage } from '@types/index';
import Constants from 'expo-constants';

const QUICK_PROMPTS = [
  { label: "Modify today's workout 💪", msg: "Can you modify today's workout for me?" },
  { label: "What to eat right now? 🍽️", msg: "What should I eat right now based on my goals?" },
  { label: "I'm feeling sore 😣", msg: "I'm feeling sore today. What should I do?" },
  { label: "Analyze my week 📊", msg: "Can you analyze my week's progress?" },
  { label: "Motivation boost 🔥", msg: "Give me a motivation boost!" },
  { label: "Check my form 📸", msg: "I'd like feedback on my exercise form (I'll attach a photo)." },
];

export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { isPro, isTrialActive } = useSubscriptionStore();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');

  // Load conversation history
  const { data: messages = [] } = useQuery({
    queryKey: ['ai-conversations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(100);
      return (data ?? []) as ChatMessage[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  });

  const sendMessage = useCallback(async (text: string, imageUrl?: string | null) => {
    if (!user?.id || (!text.trim() && !imageUrl)) return;
    if (isStreaming) return;

    const msgText = text.trim();
    setInputText('');
    setPendingImage(null);
    setIsStreaming(true);
    setStreamedContent('');

    // Optimistically add user message to UI
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: msgText,
      image_url: imageUrl ?? undefined,
      created_at: new Date().toISOString(),
    };

    queryClient.setQueryData<ChatMessage[]>(['ai-conversations', user.id], (old) => [
      ...(old ?? []),
      tempUserMsg,
    ]);

    // Add streaming placeholder
    const streamId = `stream-${Date.now()}`;
    const streamingMsg: ChatMessage = {
      id: streamId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      is_streaming: true,
    };
    queryClient.setQueryData<ChatMessage[]>(['ai-conversations', user.id], (old) => [
      ...(old ?? []),
      streamingMsg,
    ]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const conversationHistory = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/ai-coach-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: msgText,
          image_url: imageUrl ?? null,
          conversation_history: conversationHistory,
        }),
      });

      if (!res.ok) {
        const errData = await res.json() as { error?: string };
        if (res.status === 429) {
          Alert.alert(
            'Daily Limit Reached',
            errData.error ?? 'Upgrade to Pro for unlimited AI coaching.',
            [{ text: 'OK' }],
          );
          setIsStreaming(false);
          return;
        }
        throw new Error(errData.error ?? 'Chat failed');
      }

      // Read streaming response
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream reader');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.replace('data: ', '');
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
            const content = parsed.choices?.[0]?.delta?.content ?? '';
            if (content) {
              fullContent += content;
              setStreamedContent(fullContent);
              // Update streaming message in cache
              queryClient.setQueryData<ChatMessage[]>(['ai-conversations', user.id], (old) =>
                (old ?? []).map((m) =>
                  m.id === streamId ? { ...m, content: fullContent } : m,
                ),
              );
            }
          } catch {
            // Ignore parse errors in stream chunks
          }
        }
      }

      // Finalize: replace streaming message with real one
      queryClient.setQueryData<ChatMessage[]>(['ai-conversations', user.id], (old) =>
        (old ?? []).map((m) =>
          m.id === streamId
            ? { ...m, content: fullContent, is_streaming: false }
            : m.id === tempUserMsg.id
            ? { ...m, id: `saved-${Date.now()}` }
            : m,
        ),
      );

      // Save assistant message to DB
      await supabase.from('ai_conversations').insert({
        user_id: user.id,
        role: 'assistant',
        content: fullContent,
        model_used: res.headers.get('X-Model-Used') ?? 'gpt-4o-mini',
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[Coach Chat]', error);
      // Remove streaming placeholder
      queryClient.setQueryData<ChatMessage[]>(['ai-conversations', user.id], (old) =>
        (old ?? []).filter((m) => m.id !== streamId && m.id !== tempUserMsg.id),
      );
      Alert.alert('Error', 'Coach is unavailable right now. Please try again.');
    } finally {
      setIsStreaming(false);
      setStreamedContent('');
    }
  }, [user?.id, messages, isStreaming, queryClient]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      // TODO: upload to Supabase storage and get URL
      // For now, set local URI
      setPendingImage(result.assets[0].uri);
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <Animated.View
        entering={SlideInRight.duration(300)}
        style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAI]}
      >
        {!isUser && (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>🤖</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.messageImage} />
          ) : null}
          {item.is_streaming && !item.content ? (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color={COLORS.brand.purpleLight} />
              <Text style={styles.typingText}>Thinking...</Text>
            </View>
          ) : (
            <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
              {item.content}
            </Text>
          )}
        </View>
      </Animated.View>
    );
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={insets.top}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.coachInfo}>
          <View style={styles.coachAvatar}>
            <Text style={styles.coachEmoji}>🤖</Text>
          </View>
          <View>
            <Text style={styles.coachName}>APEX Coach</Text>
            <Text style={styles.coachStatus}>
              {isStreaming ? '✍️ Typing...' : '🟢 Online'}
            </Text>
          </View>
        </View>
        {!isPro && !isTrialActive && (
          <View style={styles.limitBadge}>
            <Text style={styles.limitText}>Free tier</Text>
          </View>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🤖</Text>
            <Text style={styles.emptyTitle}>Hey, I'm APEX Coach</Text>
            <Text style={styles.emptySubtitle}>
              Your 24/7 AI personal trainer. Ask me anything about fitness, nutrition, or your plan.
            </Text>
          </View>
        }
      />

      {/* Quick prompts */}
      {messages.length === 0 && (
        <Animated.ScrollView
          entering={FadeInUp.duration(400)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickPrompts}
          style={styles.quickPromptsContainer}
        >
          {QUICK_PROMPTS.map((p) => (
            <TouchableOpacity
              key={p.label}
              onPress={() => sendMessage(p.msg)}
              style={styles.quickChip}
            >
              <Text style={styles.quickChipText}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.ScrollView>
      )}

      {/* Pending image preview */}
      {pendingImage && (
        <View style={styles.pendingImageRow}>
          <Image source={{ uri: pendingImage }} style={styles.pendingImage} />
          <TouchableOpacity onPress={() => setPendingImage(null)} style={styles.removeImage}>
            <Text style={styles.removeImageText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity onPress={handlePickImage} style={styles.attachButton}>
          <Text style={styles.attachIcon}>📎</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask your coach anything..."
          placeholderTextColor={COLORS.text.tertiary}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage(inputText, pendingImage)}
        />
        <TouchableOpacity
          onPress={() => sendMessage(inputText, pendingImage)}
          style={[styles.sendButton, (!inputText.trim() && !pendingImage) && styles.sendButtonDisabled]}
          disabled={(!inputText.trim() && !pendingImage) || isStreaming}
        >
          {isStreaming ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.sendIcon}>↑</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.subtle,
    backgroundColor: COLORS.bg.secondary,
  },
  coachInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  coachAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.brand.purpleMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  coachEmoji: { fontSize: 20 },
  coachName: {
    fontFamily: TYPOGRAPHY.family.displayMedium,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.primary,
  },
  coachStatus: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.tertiary,
  },
  limitBadge: {
    backgroundColor: COLORS.bg.tertiary,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  limitText: {
    fontFamily: TYPOGRAPHY.family.bodyMedium,
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.tertiary,
  },
  messageList: {
    paddingHorizontal: SPACING.screenPadding,
    paddingVertical: SPACING[4],
    gap: SPACING[3],
    flexGrow: 1,
  },
  messageRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAI: { justifyContent: 'flex-start' },
  avatarCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.brand.purpleMuted,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarEmoji: { fontSize: 16 },
  bubble: {
    maxWidth: '80%',
    borderRadius: RADIUS.xl,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: COLORS.brand.purple,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: COLORS.bg.secondary,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.base,
    lineHeight: 22,
  },
  bubbleTextUser: { color: '#FFFFFF' },
  bubbleTextAI: { color: COLORS.text.secondary },
  messageImage: {
    width: 200, height: 150, borderRadius: RADIUS.md, marginBottom: 6,
  },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.tertiary,
  },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, paddingHorizontal: 32,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size['2xl'],
    color: COLORS.text.primary,
    marginBottom: 8, textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.secondary,
    textAlign: 'center', lineHeight: 24,
  },
  quickPromptsContainer: { maxHeight: 60 },
  quickPrompts: { paddingHorizontal: SPACING.screenPadding, gap: 8, paddingVertical: 8 },
  quickChip: {
    backgroundColor: COLORS.bg.secondary,
    borderWidth: 1, borderColor: COLORS.border.default,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  quickChipText: {
    fontFamily: TYPOGRAPHY.family.bodyMedium,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
  },
  pendingImageRow: {
    paddingHorizontal: SPACING.screenPadding,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingImage: { width: 60, height: 60, borderRadius: RADIUS.md },
  removeImage: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.accent.crimson,
    alignItems: 'center', justifyContent: 'center',
  },
  removeImageText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.subtle,
    backgroundColor: COLORS.bg.secondary,
  },
  attachButton: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  attachIcon: { fontSize: 20 },
  input: {
    flex: 1,
    backgroundColor: COLORS.bg.tertiary,
    borderRadius: RADIUS.xl,
    paddingHorizontal: 14, paddingVertical: 10,
    fontFamily: TYPOGRAPHY.family.body,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.primary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border.default,
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.brand.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: COLORS.bg.elevated },
  sendIcon: {
    fontFamily: TYPOGRAPHY.family.display,
    fontSize: TYPOGRAPHY.size.lg,
    color: '#FFFFFF',
  },
});
