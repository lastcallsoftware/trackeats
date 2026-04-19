import React, { useState, useMemo } from 'react'
import {
  View,
  FlatList,
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

/**
 * Main recipe browsing screen
 * Displays a searchable, filterable list of recipes
 * - Search by name (debounced)
 * - Filter by cuisine
 * - Tap to view recipe detail
 */
export function RecipeListScreen(): React.ReactElement {
  const query = useRecipes()
  const { data: recipes, isLoading, error, refetch } = query
  const [searchText, setSearchText] = useState('')
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null)

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
  const filteredRecipes = filterRecipes(recipesArray, searchText, selectedCuisine)

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
      <SearchBar value={searchText} onChangeText={setSearchText} />
      <CuisineFilterTabs
        cuisines={uniqueCuisines}
        selected={selectedCuisine}
        onSelect={setSelectedCuisine}
      />

      {filteredRecipes.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyText}>No recipes found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecipes}
          renderItem={({ item }) => (
            <RecipeListItem
              id={item.id!}
              name={item.name}
              cuisine={item.cuisine ?? null}
              servings={item.servings}
              price={item.price}
              calories={item.nutrition.calories}
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
    justifyContent: 'flex-start',
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
