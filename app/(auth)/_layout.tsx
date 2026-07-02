// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';
import { COLORS } from '@constants/design';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg.primary },
        animation: 'fade',
      }}
    />
  );
}
