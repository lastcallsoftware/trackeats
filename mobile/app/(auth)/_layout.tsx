/**
 * Auth group layout - defines screen navigation for unauthenticated users
 */

import { Redirect, Stack } from 'expo-router';
import authStore from '@/store/authStore';

export default function AuthLayout() {
  const { isLoggedIn } = authStore();

  if (isLoggedIn) {
    return <Redirect href="/(home)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'default',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="confirm" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="index" options={{ animation: 'none' }} />
    </Stack>
  );
}
