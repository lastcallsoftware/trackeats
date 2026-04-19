/**
 * Food detail screen route - dynamic route for viewing individual food details
 * Extracts food id from route params and passes to FoodDetailScreen
 */

import { useLocalSearchParams } from 'expo-router';
import { FoodDetailScreen } from '@/screens/FoodDetailScreen';

export default function FoodDetail() {
  const params = useLocalSearchParams();
  const foodId = params.id ? Number(params.id) : undefined;

  return <FoodDetailScreen foodId={foodId} />;
}
