import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { IDailyLogItem, DailyLogItemAddRequest, DailyLogItemUpdateRequest } from '@/types/dailylog'

/**
 * React Query mutation hook for daily log write operations
 * Provides three mutations: addEntry, editEntry, deleteEntry
 * Each mutation invalidates the ['daily-log', date] query cache on success
 * Includes logging for observability with [DAILY_LOG] prefix
 *
 * @param date - The date context (YYYY-MM-DD format) for cache invalidation
 * @returns Object with three mutation objects: addEntry, editEntry, deleteEntry
 */
export function useDailyLogMutation(date: string) {
  const queryClient = useQueryClient()

  const addEntry = useMutation({
    mutationFn: async (req: DailyLogItemAddRequest) => {
      console.log(`[DAILY_LOG] Adding entry for ${date}`)
      try {
        const response = await api.post<IDailyLogItem>('/api/dailylogitem', req)
        const item = response.data
        console.log(`[DAILY_LOG] Entry ${item.id} added`)
        return item
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[DAILY_LOG] Mutation error: ${message}`)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-log', date] })
    },
  })

  const editEntry = useMutation({
    mutationFn: async ({ id, ...req }: { id: number } & DailyLogItemUpdateRequest) => {
      console.log(`[DAILY_LOG] Editing entry ${id}`)
      try {
        const response = await api.put<IDailyLogItem>(`/api/dailylogitem/${id}`, req)
        const item = response.data
        console.log(`[DAILY_LOG] Entry ${item.id} updated`)
        return item
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[DAILY_LOG] Mutation error: ${message}`)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-log', date] })
    },
  })

  const deleteEntry = useMutation({
    mutationFn: async (id: number) => {
      console.log(`[DAILY_LOG] Deleting entry ${id}`)
      try {
        const response = await api.delete(`/api/dailylogitem/${id}`)
        console.log(`[DAILY_LOG] Entry ${id} deleted`)
        return response.data
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[DAILY_LOG] Mutation error: ${message}`)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-log', date] })
    },
  })

  return {
    addEntry,
    editEntry,
    deleteEntry,
  }
}
