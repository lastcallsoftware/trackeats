import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { IRecipe } from '@/types/recipe'

/**
 * Pure function to filter recipes by search term and cuisine
 * Searches by name (case-insensitive)
 * Returns recipes matching all criteria (AND logic)
 */
export function filterRecipes(
  recipes: IRecipe[],
  search: string,
  cuisine: string | null
): IRecipe[] {
  return recipes.filter((recipe) => {
    // Filter by cuisine if specified
    if (cuisine !== null) {
      // Exclude recipes with null cuisine when filter is set
      if (recipe.cuisine === null) {
        return false
      }
      // Match cuisine case-insensitively
      if (recipe.cuisine.toLowerCase() !== cuisine.toLowerCase()) {
        return false
      }
    }

    // Filter by search term (name, case-insensitive)
    if (search.trim() === '') {
      return true
    }

    const searchLower = search.toLowerCase()
    const nameMatch = recipe.name.toLowerCase().includes(searchLower)

    return nameMatch
  })
}

/**
 * React Query hook for fetching and caching recipes
 * Fetches from GET /api/recipe
 * Caches for 5 minutes (staleTime)
 * Logs fetch lifecycle for observability
 */
export function useRecipes(): ReturnType<typeof useQuery<IRecipe[], Error>> {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: async (): Promise<IRecipe[]> => {
      console.log('[RECIPES] Fetching recipe list')

      try {
        const response = await api.get<IRecipe[]>('/api/recipe')
        const recipes = response.data
        console.log(`[RECIPES] Loaded ${recipes.length} recipes`)
        return recipes
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[RECIPES] Error loading recipes: ${message}`)
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
