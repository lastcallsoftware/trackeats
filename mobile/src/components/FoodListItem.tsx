import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { IFood } from '@/types/food'

interface FoodListItemProps {
  food: IFood
  onPress: () => void
}

/**
 * Pure component for a single food list item
 * Displays food name (bold), vendor (secondary), and calories (right-aligned)
 */
export const FoodListItem: React.FC<FoodListItemProps> = ({ food, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {food.name}
          </Text>
          <Text style={styles.vendor} numberOfLines={1}>
            {food.vendor}
          </Text>
        </View>
        <Text style={styles.calories}>{food.nutrition.calories} cal</Text>
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
  vendor: {
    fontSize: 13,
    color: '#666',
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
