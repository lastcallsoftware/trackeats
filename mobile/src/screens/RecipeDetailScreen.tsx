/**
 * RecipeDetailScreen - displays complete recipe details with composition
 * Fetches recipe from useRecipes hook and ingredients from useIngredients hook
 * Renders nutrition label and ingredient breakdown
 */

import React from 'react'
import { ScrollView, Text, View, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native'
import { useRoute } from '@react-navigation/native'
import { useRecipes } from '@/hooks/useRecipes'
import { useIngredients } from '@/hooks/useIngredients'
import { useFoods } from '@/hooks/useFoods'
import { NutritionLabel } from '@/components/NutritionLabel'
import { RecipeCompositionView } from '@/components/RecipeCompositionView'

interface RecipeDetailScreenProps {
  recipeId?: number
}

export const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({
  recipeId: propRecipeId,
}) => {
  // Support both passed prop and route params (for React Navigation)
  const route = useRoute()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routeRecipeId = (route.params as any)?.recipeId
  const recipeId = propRecipeId ?? routeRecipeId

  const { data: recipes, isLoading: recipesLoading, error: recipesError } = useRecipes()
  const { data: ingredients, isLoading: ingredientsLoading, error: ingredientsError, refetch: refetchIngredients } = useIngredients(recipeId || 0)
  const { data: foods } = useFoods()

  // Find the recipe by id from the full list
  const recipe = recipes?.find((r) => r.id === recipeId)

  // Type-safe arrays
  const ingredientsArray = ingredients && Array.isArray(ingredients) ? ingredients : []
  const foodsArray = foods && Array.isArray(foods) ? foods : []
  const recipesArray = recipes && Array.isArray(recipes) ? recipes : []

  // Loading state - recipe
  if (recipesLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  // Error state - recipe fetch
  if (recipesError) {
    return (
      <ScrollView style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading recipe</Text>
        <Text style={styles.errorMessage}>
          {(recipesError as Error)?.message}
        </Text>
      </ScrollView>
    )
  }

  // Recipe not found
  if (!recipe) {
    return (
      <ScrollView style={styles.errorContainer}>
        <Text style={styles.errorText}>Recipe not found</Text>
      </ScrollView>
    )
  }

  // Error state - ingredients fetch
  if (ingredientsError) {
    return (
      <ScrollView style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading ingredients</Text>
        <Text style={styles.errorMessage}>
          {(ingredientsError as Error)?.message}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetchIngredients()} activeOpacity={0.7}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  return (
    <ScrollView style={styles.container}>
      {/* Recipe header */}
      <View style={styles.headerSection}>
        <Text style={styles.recipeName}>{recipe.name}</Text>
        {recipe.cuisine && (
          <Text style={styles.cuisineLabel}>{recipe.cuisine}</Text>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.metaItem}>
            {recipe.servings} servings
          </Text>
          <Text style={styles.metaItem}>
            Yield: {recipe.total_yield}
          </Text>
          <Text style={styles.metaItem}>
            ${recipe.price.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Nutrition label */}
      <View style={styles.divider} />
      <View style={styles.nutritionSection}>
        <NutritionLabel
          nutrition={recipe.nutrition}
          servingSizeDescription={recipe.nutrition.serving_size_description}
        />
      </View>

      {/* Ingredients composition */}
      <View style={styles.divider} />
      {ingredientsLoading ? (
        <View style={styles.loadingSection}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Loading ingredients...</Text>
        </View>
      ) : (
        <RecipeCompositionView
          ingredients={ingredientsArray}
          foods={foodsArray}
          recipes={recipesArray}
        />
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  recipeName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cuisineLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 12,
  },
  metaItem: {
    fontSize: 13,
    color: '#999',
  },
  nutritionSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginVertical: 12,
  },
  loadingSection: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
