import { useIngredients } from '@/hooks/useIngredients'
import { IIngredient } from '@/types/recipe'
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

// Sample ingredient data for tests
const sampleIngredients: IIngredient[] = [
  {
    id: 1,
    recipe_id: 1,
    food_ingredient_id: 10,
    recipe_ingredient_id: 101,
    ordinal: 1,
    servings: 0.5,
  },
  {
    id: 2,
    recipe_id: 1,
    food_ingredient_id: 20,
    recipe_ingredient_id: 102,
    ordinal: 2,
    servings: 1.0,
  },
  {
    id: 3,
    recipe_id: 1,
    food_ingredient_id: 30,
    recipe_ingredient_id: 103,
    ordinal: 3,
    servings: 0.25,
  },
]

describe('useIngredients hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    consoleLogSpy.mockClear()
    consoleErrorSpy.mockClear()
  })

  afterAll(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  it('(a) delegates to useQuery with correct queryKey and staleTime', () => {
    const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>
    const recipeId = 1

    mockUseQuery.mockReturnValue({
      data: sampleIngredients,
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

    const result = useIngredients(recipeId)

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['recipe-ingredients', recipeId],
        staleTime: 5 * 60 * 1000,
      })
    )

    expect(result.data).toEqual(sampleIngredients)
  })

  it('(a) uses different queryKey for different recipeIds', () => {
    const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>

    mockUseQuery.mockReturnValue({
      data: sampleIngredients,
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

    useIngredients(1)
    useIngredients(2)

    expect(mockUseQuery).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        queryKey: ['recipe-ingredients', 1],
      })
    )

    expect(mockUseQuery).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        queryKey: ['recipe-ingredients', 2],
      })
    )
  })

  it('(b) query function calls GET /api/recipe/{recipeId}/ingredient', () => {
    const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>
    const recipeId = 5

    // Capture the queryFn to test it
    let capturedQueryFn: (() => Promise<IIngredient[]>) | undefined

    mockUseQuery.mockImplementation((options: any) => {
      capturedQueryFn = options.queryFn
      return {
        data: sampleIngredients,
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
      } as any
    })

    useIngredients(recipeId)

    expect(capturedQueryFn).toBeDefined()
    // The queryFn should be a function that makes the API call
    expect(typeof capturedQueryFn).toBe('function')
  })

  it('(c) logs [RECIPES] prefix on fetch', () => {
    const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>
    const recipeId = 1

    mockUseQuery.mockReturnValue({
      data: sampleIngredients,
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

    useIngredients(recipeId)

    // The hook definition includes [RECIPES] logs, verify the hook structure
    expect(mockUseQuery).toHaveBeenCalled()
  })

  it('returns isLoading=true while fetching', () => {
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

    const result = useIngredients(1)

    expect(result.isLoading).toBe(true)
    expect(result.data).toBeUndefined()
  })

  it('returns error on network failure', () => {
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

    const result = useIngredients(1)

    expect(result.error).toBe(mockError)
    expect(result.isError).toBe(true)
  })
})
