/**
 * Root layout - conditional navigation based on auth state
 * Handles app initialization and routes between auth and main screens
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, Tabs } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import authStore from '@/store/authStore';

// Create a client for react-query (used in S02)
const queryClient = new QueryClient();

export default function RootLayout() {
  const { isLoggedIn } = authStore();
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize auth on app startup
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.debug('[APP] Initializing auth store');
        await authStore.getState().initialize();
        console.log('[APP] Auth initialized — isLoggedIn:', isLoggedIn);
      } catch (error) {
        console.error('[AUTH INIT ERROR]', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();
  }, []);

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {isLoggedIn ? (
        // Main app (logged in)
        <Tabs
          screenOptions={{
            headerShown: true,
            tabBarActiveTintColor: '#007AFF',
          }}
        >
          <Tabs.Screen
            name="(home)"
            options={{
              title: 'Home',
              tabBarLabel: 'Home',
              headerTitle: 'Home',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="(foods)"
            options={{
              title: 'Foods',
              tabBarLabel: 'Foods',
              headerTitle: 'Foods',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="nutrition-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="(recipes)"
            options={{
              title: 'Recipes',
              tabBarLabel: 'Recipes',
              headerTitle: 'Recipes',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="book-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="(daily-log)"
            options={{
              title: 'Daily Log',
              tabBarLabel: 'Daily Log',
              headerTitle: 'Daily Log',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="calendar-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="(auth)"
            options={{ href: null }}
          />
        </Tabs>
      ) : (
        // Auth screens (not logged in)
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'default',
          }}
        >
          <Stack.Screen name="(auth)" options={{ animation: 'none' }} />
        </Stack>
      )}
    </QueryClientProvider>
  );
}
