// app/(modals)/_layout.tsx
import { Stack } from 'expo-router';
import { COLORS } from '@constants/design';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        contentStyle: { backgroundColor: COLORS.bg.primary },
        animation: 'slide_from_bottom',
      }}
    />
  );
}
