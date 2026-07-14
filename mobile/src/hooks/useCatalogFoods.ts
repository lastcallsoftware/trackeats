import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { IFood } from '@/types/food'

type CatalogFoodsResponse = {
  items: IFood[]
  total: number
  pageNumber: number
  pageSize: number
  query: string
}

type CatalogCopyResponse = {
  requested_count: number
  created_count: number
  skipped_count: number
  failure_count: number
  items: Array<{ catalog_food_id: number; food_id: number; action: string }>
  failures: Array<{ catalog_food_id: number; error: string }>
}

export function useCatalogFoods(query: string, pageNumber: number, pageSize: number) {
  return useQuery({
    queryKey: ['catalogFoods', query, pageNumber, pageSize],
    queryFn: async (): Promise<CatalogFoodsResponse> => {
      const response = await api.get<CatalogFoodsResponse>('/api/catalog/food', {
        params: {
          query,
          pageNumber,
          pageSize,
        },
      })
      return response.data
    },
    staleTime: 60 * 1000,
  })
}

export function useCopyCatalogFoods() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (foodIds: number[]): Promise<CatalogCopyResponse> => {
      const response = await api.post<CatalogCopyResponse>('/api/catalog/food/copy', {
        food_ids: foodIds,
      })
      return response.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['foods'] })
    },
  })
}
