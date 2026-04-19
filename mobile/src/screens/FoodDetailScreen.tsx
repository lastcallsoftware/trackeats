/**
 * FoodDetailScreen - displays complete food nutrition details
 * Fetches food from useFoods hook and renders nutrition label
 */

import React from 'react';
import { ScrollView, Text, View, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useFoods } from '@/hooks/useFoods';
import { NutritionLabel } from '@/components/NutritionLabel';

interface FoodDetailScreenProps {
  foodId?: number;
}

export const FoodDetailScreen: React.FC<FoodDetailScreenProps> = ({ foodId: propFoodId }) => {
  // Support both passed prop and route params (for React Navigation)
  const route = useRoute();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routeFoodId = (route.params as any)?.foodId;
  const foodId = propFoodId ?? routeFoodId;

  const { data: foods, isLoading, error } = useFoods();

  // Find the food by id from the full list
  const food = foods?.find((f) => f.id === foodId);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 20 }}>
        <Text style={{ fontSize: 16, color: '#d32f2f', marginBottom: 12 }}>
          Error loading food details
        </Text>
        <Text style={{ fontSize: 14, color: '#666' }}>{(error as Error)?.message}</Text>
      </ScrollView>
    );
  }

  if (!food) {
    return (
      <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 20 }}>
        <Text style={{ fontSize: 16, color: '#666' }}>Food not found</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
          {food.name}
        </Text>
        <Text style={{ fontSize: 16, color: '#666', marginBottom: 2 }}>
          {food.vendor}
        </Text>
        <Text style={{ fontSize: 14, color: '#999', marginBottom: 16 }}>
          {food.size_description}
        </Text>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: '#e0e0e0', marginVertical: 12 }}>
        <NutritionLabel
          nutrition={food.nutrition}
          servingSizeDescription={food.nutrition.serving_size_description}
        />
      </View>
    </ScrollView>
  );
};
