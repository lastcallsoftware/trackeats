import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { IIngredient, IRecipe } from '@/types/recipe'
import { IFood } from '@/types/food'

interface RecipeCompositionViewProps {
  ingredients: IIngredient[]
  foods: IFood[]
  recipes: IRecipe[]
}

/**
 * Ingredient breakdown component for recipe composition
 * Resolves food/recipe references and displays nutritional contributions
 */
export const RecipeCompositionView: React.FC<RecipeCompositionViewProps> = ({
  ingredients,
  foods,
  recipes,
}) => {
  // Sort ingredients by ordinal
  const sortedIngredients = [...ingredients].sort((a, b) => a.ordinal - b.ordinal)

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>
        Ingredients ({sortedIngredients.length})
      </Text>

      {sortedIngredients.length === 0 ? (
        <Text style={styles.emptyText}>No ingredients</Text>
      ) : (
        sortedIngredients.map((ingredient) => {
          let name = 'Unknown'
          let calories = 0

          // Resolve food ingredient
          if (ingredient.food_ingredient_id) {
            const food = foods.find((f) => f.id === ingredient.food_ingredient_id)
            if (food) {
              name = food.name
              calories = food.nutrition.calories * ingredient.servings
            }
          }

          // Resolve recipe ingredient (fallback)
          if (ingredient.recipe_ingredient_id && !ingredient.food_ingredient_id) {
            const recipe = recipes.find((r) => r.id === ingredient.recipe_ingredient_id)
            if (recipe) {
              name = recipe.name
              calories = recipe.nutrition.calories * ingredient.servings
            }
          }

          return (
            <View key={ingredient.id} style={styles.ingredientRow}>
              <View style={styles.ingredientInfo}>
                <Text style={styles.ingredientName} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={styles.ingredientMeta}>
                  {ingredient.servings} servings
                </Text>
              </View>
              <Text style={styles.ingredientCalories}>
                {Math.round(calories)} cal
              </Text>
            </View>
          )
        })
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ingredientInfo: {
    flex: 1,
    marginRight: 12,
  },
  ingredientName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  ingredientMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  ingredientCalories: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    minWidth: 60,
    textAlign: 'right',
  },
})
