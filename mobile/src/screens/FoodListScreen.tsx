import React, { useMemo, useState } from 'react'
import {
  View,
  FlatList,
  ListRenderItem,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { useFoods, filterFoods } from '@/hooks/useFoods'
import { FoodGroup, IFood } from '@/types/food'
import { FoodListItem } from '@/components/FoodListItem'
import { SearchBar } from '@/components/SearchBar'
import { GroupFilterTabs } from '@/components/GroupFilterTabs'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

/**
 * Main food browsing screen
 * Displays a searchable, filterable list of foods
 * - Search by name/vendor (debounced filtering)
 * - Filter by food group
 * - Tap to view food detail
 */
export function FoodListScreen(): React.ReactElement {
  const query = useFoods()
  const { data: foods, isLoading, error, refetch } = query
  const [searchText, setSearchText] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const debouncedSearchText = useDebouncedValue(searchText, 220)

  // Type-safe foods array
  const foodsArray: IFood[] = foods && Array.isArray(foods) ? foods : []

  // Derive filtered list from search + group
  const filteredFoods = useMemo(
    () =>
      filterFoods(
        foodsArray,
        debouncedSearchText,
        selectedGroup as FoodGroup | null
      ),
    [foodsArray, debouncedSearchText, selectedGroup]
  )

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
      <View style={styles.resultsSection}>
        <FlatList
          style={styles.list}
          stickyHeaderIndices={[0]}
          ListHeaderComponent={
            <View style={styles.stickyHeader}>
              <SearchBar
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search foods..."
              />
              <GroupFilterTabs selected={selectedGroup} onSelect={setSelectedGroup} />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyText}>No foods found</Text>
            </View>
          }
          data={filteredFoods}
          renderItem={({ item }: Parameters<ListRenderItem<IFood>>[0]) => (
            <FoodListItem
              id={item.id!}
              name={item.name}
              subtype={item.subtype}
              vendor={item.vendor}
              calories={item.nutrition.calories}
            />
          )}
          keyExtractor={(item) => String(item.id)}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'flex-start',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  resultsSection: {
    flex: 1,
    minHeight: 0,
  },
  stickyHeader: {
    backgroundColor: '#fff',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
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
