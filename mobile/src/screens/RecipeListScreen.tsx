import React, { useState, useMemo } from 'react'
import {
  View,
  FlatList,
  ListRenderItem,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { useRecipes, filterRecipes } from '@/hooks/useRecipes'
import { IRecipe } from '@/types/recipe'
import { RecipeListItem } from '@/components/RecipeListItem'
import { SearchBar } from '@/components/SearchBar'
import { CuisineFilterTabs } from '@/components/CuisineFilterTabs'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

/**
 * Main recipe browsing screen
 * Displays a searchable, filterable list of recipes
 * - Search by name (debounced filtering)
 * - Filter by cuisine
 * - Tap to view recipe detail
 */
export function RecipeListScreen(): React.ReactElement {
  const query = useRecipes()
  const { data: recipes, isLoading, error, refetch } = query
  const [searchText, setSearchText] = useState('')
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null)
  const debouncedSearchText = useDebouncedValue(searchText, 220)

  // Type-safe recipes array
  const recipesArray: IRecipe[] = recipes && Array.isArray(recipes) ? recipes : []

  // Extract unique non-null cuisines for filter tabs
  const uniqueCuisines = useMemo(() => {
    const cuisineSet = new Set<string>()
    recipesArray.forEach((recipe) => {
      if (recipe.cuisine) {
        cuisineSet.add(recipe.cuisine)
      }
    })
    return Array.from(cuisineSet)
  }, [recipesArray])

  // Derive filtered list from search + cuisine
  const filteredRecipes = useMemo(
    () => filterRecipes(recipesArray, debouncedSearchText, selectedCuisine),
    [recipesArray, debouncedSearchText, selectedCuisine]
  )

  // Loading state
  if (isLoading && recipesArray.length === 0) {
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
        <Text style={styles.errorText}>Failed to load recipes</Text>
        <Text style={styles.errorMessage}>
          {error instanceof Error ? error.message : 'Unknown error'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.7}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Empty state (no recipes available)
  if (recipesArray.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No recipes available</Text>
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
                placeholder="Search recipes..."
              />
              <CuisineFilterTabs
                cuisines={uniqueCuisines}
                selected={selectedCuisine}
                onSelect={setSelectedCuisine}
              />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyText}>No recipes found</Text>
            </View>
          }
          data={filteredRecipes}
          renderItem={({ item }: Parameters<ListRenderItem<IRecipe>>[0]) => (
            <RecipeListItem
              id={item.id!}
              name={item.name}
              cuisine={item.cuisine ?? null}
              totalYield={item.total_yield}
              price={item.price}
              totalCalories={Math.round(item.nutrition.calories)}
              perServingCalories={
                item.servings > 0
                  ? Math.round(item.nutrition.calories / item.servings)
                  : Math.round(item.nutrition.calories)
              }
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
