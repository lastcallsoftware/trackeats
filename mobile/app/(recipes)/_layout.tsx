/**
 * Recipes stack layout - defines the navigation structure for recipe browsing
 * Includes RecipeListScreen (index) and RecipeDetailScreen (dynamic [id] route)
 */

import { Stack } from 'expo-router';

export default function RecipesLayout() {
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
          title: 'Recipe List',
          headerTitle: 'Recipe List',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Recipe Details',
          headerTitle: 'Recipe Details',
        }}
      />
    </Stack>
  );
}
