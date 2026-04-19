import { useDailyLog } from '@/hooks/useDailyLog'
import { IDailyLogItem } from '@/types/dailylog'
import { INutrition } from '@/types/food'
import { useQuery } from '@tanstack/react-query'

// Mock the api module
jest.mock('@/services/api', () => ({
  get: jest.fn(),
}))

// Mock @tanstack/react-query
jest.mock('@tanstack/react-query')

// Mock console methods to avoid cluttering test output
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

// Sample nutrition data for tests
const sampleNutrition: INutrition = {
  serving_size_description: '1 serving',
  serving_size_oz: 8,
  serving_size_g: 240,
  calories: 100,
  total_fat_g: 2,
  saturated_fat_g: 0.5,
  trans_fat_g: 0,
  cholesterol_mg: 0,
  sodium_mg: 200,
  total_carbs_g: 20,
  fiber_g: 4,
  total_sugar_g: 12,
  added_sugar_g: 0,
  protein_g: 5,
  vitamin_d_mcg: 0,
  calcium_mg: 200,
  iron_mg: 2,
  potassium_mg: 300,
}

// Sample daily log items for tests
const sampleDailyLogItems: IDailyLogItem[] = [
  {
    id: 1,
    user_id: 1,
    food_id: 1,
    recipe_id: null,
    date: '2026-04-18',
    servings: 1,
    ordinal: 1,
    nutrition: sampleNutrition,
  },
  {
    id: 2,
    user_id: 1,
    food_id: 2,
    recipe_id: null,
    date: '2026-04-18',
    servings: 2,
    ordinal: 2,
    nutrition: sampleNutrition,
  },
]

describe('useDailyLog hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    consoleLogSpy.mockClear()
    consoleErrorSpy.mockClear()
  })

  afterAll(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  it('(a) delegates to useQuery with queryKey ["daily-log", date] and staleTime 5min', () => {
    const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>
    const testDate = '2026-04-18'

    mockUseQuery.mockReturnValue({
      data: sampleDailyLogItems,
      isLoading: false,
      error: null,
      isFetching: false,
      isError: false,
      isSuccess: true,
      status: 'success',
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      isFetched: true,
      isPending: false,
      isLoadingError: false,
      isPaused: false,
      isPlaceholderData: false,
      isRefetching: false,
      isStale: false,
    } as any)

    useDailyLog(testDate)

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['daily-log', testDate],
        staleTime: 5 * 60 * 1000,
      })
    )
  })

  it('(b) returns isLoading=true while fetching', () => {
    const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>

    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isFetching: true,
      isError: false,
      isSuccess: false,
      status: 'pending',
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      isFetched: false,
      isPending: true,
      isLoadingError: false,
      isPaused: false,
      isPlaceholderData: false,
      isRefetching: false,
      isStale: false,
    } as any)

    const result = useDailyLog('2026-04-18')

    expect(result.isLoading).toBe(true)
    expect(result.data).toBeUndefined()
  })

  it('(c) returns error on network failure', () => {
    const mockError = new Error('Network error')
    const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>

    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError as any,
      isFetching: false,
      isError: true,
      isSuccess: false,
      status: 'error',
      dataUpdatedAt: 0,
      errorUpdatedAt: Date.now(),
      failureCount: 1,
      failureReason: mockError,
      isFetched: true,
      isPending: false,
      isLoadingError: true,
      isPaused: false,
      isPlaceholderData: false,
      isRefetching: false,
      isStale: false,
    } as any)

    const result = useDailyLog('2026-04-18')

    expect(result.error).toBe(mockError)
    expect(result.isError).toBe(true)
  })

  it('(d) returns data array on success', () => {
    const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>

    mockUseQuery.mockReturnValue({
      data: sampleDailyLogItems,
      isLoading: false,
      error: null,
      isFetching: false,
      isError: false,
      isSuccess: true,
      status: 'success',
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      isFetched: true,
      isPending: false,
      isLoadingError: false,
      isPaused: false,
      isPlaceholderData: false,
      isRefetching: false,
      isStale: false,
    } as any)

    const result = useDailyLog('2026-04-18')

    expect(result.data).toEqual(sampleDailyLogItems)
    expect(Array.isArray(result.data)).toBe(true)
    expect(result.data?.length).toBe(2)
  })
})
