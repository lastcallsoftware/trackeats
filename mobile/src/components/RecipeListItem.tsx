import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { IRecipe } from '@/types/recipe'

interface RecipeListItemProps {
  recipe: IRecipe
  onPress: () => void
}

/**
 * Pure component for a single recipe list item
 * Displays recipe name (bold), cuisine (secondary), servings, price, and calories (right-aligned)
 */
export const RecipeListItem: React.FC<RecipeListItemProps> = ({ recipe, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {recipe.name}
          </Text>
          <Text style={styles.cuisine} numberOfLines={1}>
            {recipe.cuisine || 'No cuisine'}
          </Text>
          <Text style={styles.meta}>
            {recipe.servings} servings • ${recipe.price.toFixed(2)}
          </Text>
        </View>
        <Text style={styles.calories}>{recipe.nutrition.calories} cal</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  cuisine: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  meta: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  calories: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    minWidth: 70,
    textAlign: 'right',
  },
})
