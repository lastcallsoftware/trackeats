import React, { useMemo } from 'react'
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { IDailyLogItem } from '@/types/dailylog'
import { useFoods } from '@/hooks/useFoods'
import { useRecipes } from '@/hooks/useRecipes'

interface DailyLogListViewProps {
  items: IDailyLogItem[]
  onEdit?: (item: IDailyLogItem) => void
  onDelete?: (item: IDailyLogItem) => void
}

/**
 * DailyLogListView renders a list of daily log entries for a selected date
 * Each entry shows ordinal, food/recipe label, servings, and calories
 * If onEdit and onDelete callbacks are provided, renders Edit and Delete action buttons
 * Optimized with FlatList using batching for performance
 */
export function DailyLogListView({ items, onEdit, onDelete }: DailyLogListViewProps): React.ReactElement {
  const { data: foods = [] } = useFoods()
  const { data: recipes = [] } = useRecipes()

  const foodNameById = useMemo(
    () => new Map(foods.filter((food) => food.id !== undefined).map((food) => [food.id as number, food.name])),
    [foods]
  )

  const recipeNameById = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe.name])),
    [recipes]
  )

  const renderItem = ({ item, index }: { item: IDailyLogItem; index: number }) => {
    // Determine label using resolved item names with ID fallback if lookup data is unavailable.
    const label = item.food_id !== null
      ? (foodNameById.get(item.food_id) ?? `Food #${item.food_id}`)
      : (item.recipe_id !== null
        ? (recipeNameById.get(item.recipe_id) ?? `Recipe #${item.recipe_id}`)
        : 'Unknown item')

    // Extract calories from item.nutrition, default to '—' if not available
    const calories =
      item.nutrition && item.nutrition.calories !== null
        ? item.nutrition.calories.toLocaleString()
        : '—'

    const handleDelete = () => {
      Alert.alert('Delete Entry', 'Are you sure?', [
        { text: 'Cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(item),
        },
      ])
    }

    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemRow}>
          <Text style={styles.ordinalText}>{index + 1}.</Text>
          <Text style={styles.labelText}>{label}</Text>
        </View>
        <View style={styles.itemRow}>
          <Text style={styles.detailText}>Servings: {item.servings}</Text>
          <Text style={styles.caloriesText}>{calories} cal</Text>
        </View>
        {(onEdit || onDelete) && (
          <View style={styles.actionRow}>
            {onEdit && (
              <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(item)} activeOpacity={0.7}>
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    )
  }

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => String(item.id)}
      initialNumToRender={10}
      maxToRenderPerBatch={5}
      scrollEnabled={false}
      contentContainerStyle={styles.listContainer}
    />
  )
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  itemContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ordinalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    minWidth: 30,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginLeft: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  caloriesText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
})
