/**
 * Daily Log stack layout - defines the navigation structure for daily log viewing
 * Includes DailyLogScreen (index)
 */

import { Stack } from 'expo-router';

export default function DailyLogLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        animation: 'default',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Daily Log',
          headerTitle: 'Daily Log',
        }}
      />
    </Stack>
  );
}
