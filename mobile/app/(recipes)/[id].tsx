/**
 * Recipe detail screen route - dynamic route for viewing individual recipe details
 * Extracts recipe id from route params and passes to RecipeDetailScreen
 */

import { useLocalSearchParams } from 'expo-router';
import { RecipeDetailScreen } from '@/screens/RecipeDetailScreen';

export default function RecipeDetail() {
  const params = useLocalSearchParams();
  const recipeId = params.id ? Number(params.id) : undefined;

  return <RecipeDetailScreen recipeId={recipeId} />;
}
