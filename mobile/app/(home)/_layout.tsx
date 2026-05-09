/**
 * Home group layout - defines screen navigation for authenticated users
 */

import { Stack, Link } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import authStore from '@/store/authStore';

export default function HomeLayout() {
  const { username, authMethod } = authStore();
  
  const authMethodLabel = authMethod === 'google'
    ? 'Google'
    : authMethod === 'facebook'
      ? 'Facebook'
      : authMethod === 'apple'
        ? 'Apple'
        : 'Email';

  return (
    <Stack
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerTitle: () => (
            <Text style={styles.headerTitleText} numberOfLines={2}>
              {`Logged in as ${username} using ${authMethodLabel}`}
            </Text>
          ),
          headerTitleAlign: 'left',
          headerRight: () => (
            <Link href="/(home)/settings" asChild>
              <Pressable
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Open settings"
              >
                <Ionicons name="settings-outline" size={22} color="#007AFF" />
              </Pressable>
            </Link>
          ),
        }}
      />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="change-password" options={{ title: 'Change Password' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerTitleText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'left',
    maxWidth: 260,
  },
});
