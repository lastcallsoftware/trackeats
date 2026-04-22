import { memo, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { formatRecipeMetaLine } from '@/utils/recipeFormatting'

interface RecipeListItemProps {
  id: number
  name: string
  cuisine: string | null
  totalYield: number
  totalCalories: number
  perServingCalories: number
  price: number
}

export const RecipeListItem = memo(function RecipeListItem({
  id,
  name,
  cuisine,
  totalYield,
  totalCalories,
  perServingCalories,
  price,
}: RecipeListItemProps) {
  const router = useRouter()
  const handlePress = useCallback(() => {
    router.push(`/(recipes)/${id}`)
  }, [id, router])

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.name}>
            {name}
          </Text>
          <Text style={styles.cuisine} numberOfLines={1}>
            {cuisine ? cuisine.charAt(0).toUpperCase() + cuisine.slice(1) : 'No cuisine'}
          </Text>
          <Text style={styles.meta}>
            {formatRecipeMetaLine(totalYield, totalCalories, price)}
          </Text>
        </View>
        <Text style={styles.calories}>{perServingCalories} cal</Text>
      </View>
    </TouchableOpacity>
  )
})

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
