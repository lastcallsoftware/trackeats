import React, { useState } from 'react'
import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useFoods, filterFoods } from '@/hooks/useFoods'
import { FoodGroup, IFood } from '@/types/food'
import { FoodListItem } from '@/components/FoodListItem'
import { SearchBar } from '@/components/SearchBar'
import { GroupFilterTabs } from '@/components/GroupFilterTabs'

/**
 * Main food browsing screen
 * Displays a searchable, filterable list of foods
 * - Search by name/vendor (debounced)
 * - Filter by food group
 * - Tap to view food detail
 */
export function FoodListScreen(): React.ReactElement {
  const navigation = useNavigation()
  const query = useFoods()
  const { data: foods, isLoading, error, refetch } = query
  const [searchText, setSearchText] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  // Type-safe foods array
  const foodsArray: IFood[] = foods && Array.isArray(foods) ? foods : []

  // Derive filtered list from search + group
  const filteredFoods = filterFoods(
    foodsArray,
    searchText,
    selectedGroup as FoodGroup | null
  )

  const handleFoodPress = (foodId: number | undefined) => {
    if (foodId !== undefined) {
      // Navigate to food detail screen
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(navigation as any).navigate('FoodDetail', { foodId })
    }
  }

  // Loading state
  if (isLoading && foodsArray.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load foods</Text>
        <Text style={styles.errorMessage}>{error instanceof Error ? error.message : 'Unknown error'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.7}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Empty state (no foods after filtering)
  if (foodsArray.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No foods available</Text>
      </View>
    )
  }

  // Render list
  return (
    <View style={styles.container}>
      <SearchBar value={searchText} onChangeText={setSearchText} />
      <GroupFilterTabs selected={selectedGroup} onSelect={setSelectedGroup} />

      {filteredFoods.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyText}>No foods found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFoods}
          renderItem={({ item }) => (
            <FoodListItem
              food={item}
              onPress={() => handleFoodPress(item.id)}
            />
          )}
          keyExtractor={(item) => String(item.id)}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
        />
      )}
    </View>
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
    paddingHorizontal: 20,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
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
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
