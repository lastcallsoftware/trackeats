import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { IIngredient } from '@/types/recipe'

/**
 * React Query hook for fetching and caching recipe ingredients
 * Fetches from GET /api/recipe/{recipeId}/ingredient
 * Caches for 5 minutes (staleTime)
 * Logs fetch lifecycle for observability
 */
export function useIngredients(
  recipeId: number
): ReturnType<typeof useQuery<IIngredient[], Error>> {
  return useQuery({
    queryKey: ['recipe-ingredients', recipeId],
    queryFn: async (): Promise<IIngredient[]> => {
      console.log(`[RECIPES] Fetching ingredients for recipe ${recipeId}`)

      try {
        const response = await api.get<IIngredient[]>(
          `/api/recipe/${recipeId}/ingredient`
        )
        const ingredients = response.data
        console.log(
          `[RECIPES] Loaded ${ingredients.length} ingredients for recipe ${recipeId}`
        )
        return ingredients
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error(
          `[RECIPES] Error loading ingredients for recipe ${recipeId}: ${message}`
        )
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
