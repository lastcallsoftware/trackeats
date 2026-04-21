/**
 * Home group layout - defines screen navigation for authenticated users
 */

import { Stack } from 'expo-router';
import authStore from '@/store/authStore';

export default function HomeLayout() {
  const { username } = authStore();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen name="index" options={{ title: `Logged in as ${username}` }} />
    </Stack>
  );
}
