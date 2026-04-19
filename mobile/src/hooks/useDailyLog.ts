import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { IDailyLogItem } from '@/types/dailylog'

/**
 * React Query hook for fetching and caching daily log items for a specific date
 * Fetches from GET /api/dailylogitem with date parameter
 * Caches per-date with 5 minute staleTime
 * Logs fetch lifecycle for observability
 * Returns items sorted by ordinal ascending
 */
export function useDailyLog(date: string): ReturnType<typeof useQuery<IDailyLogItem[], Error>> {
  return useQuery({
    queryKey: ['daily-log', date],
    queryFn: async (): Promise<IDailyLogItem[]> => {
      console.log(`[DAILY_LOG] Fetching daily log for ${date}`)

      try {
        const response = await api.get<IDailyLogItem[]>('/api/dailylogitem', {
          params: { date },
        })
        const items = response.data

        // Sort by ordinal ascending
        const sorted = [...items].sort((a, b) => a.ordinal - b.ordinal)

        console.log(`[DAILY_LOG] Loaded ${sorted.length} entries for ${date}`)
        return sorted
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[DAILY_LOG] Error loading daily log for ${date}: ${message}`)
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
