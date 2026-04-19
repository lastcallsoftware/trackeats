import { useRecipes, filterRecipes } from '@/hooks/useRecipes'
import { IRecipe } from '@/types/recipe'
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
  calories: 500,
  total_fat_g: 15,
  saturated_fat_g: 5,
  trans_fat_g: 0,
  cholesterol_mg: 30,
  sodium_mg: 600,
  total_carbs_g: 60,
  fiber_g: 5,
  total_sugar_g: 15,
  added_sugar_g: 5,
  protein_g: 20,
  vitamin_d_mcg: 2,
  calcium_mg: 200,
  iron_mg: 3,
  potassium_mg: 400,
}

// Sample recipe data for tests
const sampleRecipes: IRecipe[] = [
  {
    id: 1,
    cuisine: 'Italian',
    name: 'Spaghetti Carbonara',
    total_yield: 4,
    servings: 4,
    nutrition_id: 1,
    nutrition: sampleNutrition,
    price: 12.5,
    price_per_serving: 3.13,
    price_per_calorie: 0.025,
  },
  {
    id: 2,
    cuisine: 'Mexican',
    name: 'Chicken Tacos',
    total_yield: 6,
    servings: 6,
    nutrition_id: 2,
    nutrition: sampleNutrition,
    price: 15.0,
    price_per_serving: 2.5,
    price_per_calorie: 0.03,
  },
  {
    id: 3,
    cuisine: 'Asian',
    name: 'Vegetable Stir Fry',
    total_yield: 4,
    servings: 4,
    nutrition_id: 3,
    nutrition: sampleNutrition,
    price: 10.0,
    price_per_serving: 2.5,
    price_per_calorie: 0.02,
  },
  {
    id: 4,
    cuisine: null,
    name: 'Simple Salad',
    total_yield: 2,
    servings: 2,
    nutrition_id: 4,
    nutrition: sampleNutrition,
    price: 5.0,
    price_per_serving: 2.5,
    price_per_calorie: 0.01,
  },
]

describe('useRecipes hook', () => {
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

    mockUseQuery.mockReturnValue({
      data: sampleRecipes,
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

    const result = useRecipes()

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['recipes'],
        staleTime: 5 * 60 * 1000,
      })
    )

    expect(result.data).toEqual(sampleRecipes)
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

    const result = useRecipes()

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

    const result = useRecipes()

    expect(result.error).toBe(mockError)
    expect(result.isError).toBe(true)
  })
})

describe('filterRecipes function', () => {
  it('(b) returns all recipes when search is empty and cuisine is null', () => {
    const result = filterRecipes(sampleRecipes, '', null)

    expect(result).toEqual(sampleRecipes)
    expect(result.length).toBe(4)
  })

  it('(c) filters by name substring (case-insensitive)', () => {
    const result = filterRecipes(sampleRecipes, 'spaghetti', null)

    expect(result.length).toBe(1)
    expect(result[0].name).toBe('Spaghetti Carbonara')
  })

  it('(c) filters by name substring (uppercase search)', () => {
    const result = filterRecipes(sampleRecipes, 'TACOS', null)

    expect(result.length).toBe(1)
    expect(result[0].name).toBe('Chicken Tacos')
  })

  it('(c) filters by partial name match', () => {
    const result = filterRecipes(sampleRecipes, 'stir', null)

    expect(result.length).toBe(1)
    expect(result[0].name).toBe('Vegetable Stir Fry')
  })

  it('(d) filters by cuisine (case-insensitive equality)', () => {
    const result = filterRecipes(sampleRecipes, '', 'Italian')

    expect(result.length).toBe(1)
    expect(result[0].cuisine).toBe('Italian')
  })

  it('(d) filters by cuisine (lowercase search)', () => {
    const result = filterRecipes(sampleRecipes, '', 'mexican')

    expect(result.length).toBe(1)
    expect(result[0].cuisine).toBe('Mexican')
  })

  it('(d) filters by cuisine (uppercase search)', () => {
    const result = filterRecipes(sampleRecipes, '', 'ASIAN')

    expect(result.length).toBe(1)
    expect(result[0].cuisine).toBe('Asian')
  })

  it('(e) applies AND logic: name + cuisine combined', () => {
    const result = filterRecipes(sampleRecipes, 'Chicken', 'Mexican')

    expect(result.length).toBe(1)
    expect(result[0].name).toBe('Chicken Tacos')
    expect(result[0].cuisine).toBe('Mexican')
  })

  it('(e) applies AND logic: name matches but cuisine does not', () => {
    const result = filterRecipes(sampleRecipes, 'Salad', 'Italian')

    expect(result.length).toBe(0)
  })

  it('(f) excludes recipes with null cuisine when cuisine filter is set', () => {
    const result = filterRecipes(sampleRecipes, '', 'Italian')

    // Should only match Italian, not the null-cuisine recipe
    expect(result.length).toBe(1)
    expect(result[0].cuisine).toBe('Italian')
    expect(result.some((r) => r.cuisine === null)).toBe(false)
  })

  it('(f) includes recipes with null cuisine when no cuisine filter is set', () => {
    const result = filterRecipes(sampleRecipes, '', null)

    // Should include the null-cuisine recipe
    expect(result.length).toBe(4)
    expect(result.some((r) => r.cuisine === null)).toBe(true)
  })

  it('(g) returns empty when no recipes match', () => {
    const result = filterRecipes(sampleRecipes, 'nonexistent', null)

    expect(result.length).toBe(0)
  })

  it('(g) returns empty when cuisine filter matches no recipes', () => {
    const result = filterRecipes(sampleRecipes, '', 'French')

    expect(result.length).toBe(0)
  })
})
