/**
 * Foods stack layout - defines the navigation structure for food browsing
 * Includes FoodListScreen (index) and FoodDetailScreen (dynamic [id] route)
 */

import { Stack } from 'expo-router';

export default function FoodsLayout() {
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
          title: 'Food List',
          headerTitle: 'Food List',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Food Details',
          headerTitle: 'Food Details',
        }}
      />
    </Stack>
  );
}
