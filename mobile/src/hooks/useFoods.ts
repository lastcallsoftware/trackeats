import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { IFood, FoodGroup } from '@/types/food'

/**
 * Pure function to filter foods by search term and group
 * Searches by name and vendor (case-insensitive)
 * Returns foods matching all criteria (AND logic)
 */
export function filterFoods(
  foods: IFood[],
  search: string,
  group: FoodGroup | null
): IFood[] {
  return foods.filter((food) => {
    // Filter by group if specified
    if (group !== null && food.group !== group) {
      return false
    }

    // Filter by search term (name or vendor, case-insensitive)
    if (search.trim() === '') {
      return true
    }

    const searchLower = search.toLowerCase()
    const nameMatch = food.name.toLowerCase().includes(searchLower)
    const vendorMatch = food.vendor.toLowerCase().includes(searchLower)

    return nameMatch || vendorMatch
  })
}

/**
 * React Query hook for fetching and caching foods
 * Fetches from GET /api/food
 * Caches for 5 minutes (staleTime)
 * Logs fetch lifecycle for observability
 */
export function useFoods(): ReturnType<typeof useQuery<IFood[], Error>> {
  return useQuery({
    queryKey: ['foods'],
    queryFn: async (): Promise<IFood[]> => {
      console.log('[FOODS] Fetching food list')

      try {
        const response = await api.get<IFood[]>('/api/food')
        const foods = response.data
        console.log(`[FOODS] Loaded ${foods.length} foods`)
        return foods
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[FOODS] Error loading foods: ${message}`)
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
