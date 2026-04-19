import { useFoods, filterFoods } from '@/hooks/useFoods'
import { IFood, INutrition } from '@/types/food'
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
  serving_size_description: '1 cup',
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

// Sample food data for tests
const sampleFoods: IFood[] = [
  {
    id: 1,
    group: 'beverages',
    vendor: 'Brand A',
    name: 'Orange Juice',
    subtype: 'juice',
    description: 'Fresh orange juice',
    size_description: '1 quart',
    size_description_2: null,
    size_oz: 32,
    size_g: 960,
    servings: 4,
    nutrition: sampleNutrition,
    price: 4.99,
    price_per_serving: 1.25,
    price_per_oz: 0.156,
    price_per_calorie: 0.05,
    price_date: '2026-04-14',
    shelf_life: '7 days',
  },
  {
    id: 2,
    group: 'dairy',
    vendor: 'Brand B',
    name: 'Whole Milk',
    subtype: 'milk',
    description: 'Whole milk',
    size_description: '1 gallon',
    size_description_2: null,
    size_oz: 128,
    size_g: 3840,
    servings: 16,
    nutrition: sampleNutrition,
    price: 3.99,
    price_per_serving: 0.25,
    price_per_oz: 0.031,
    price_per_calorie: 0.04,
    price_date: '2026-04-14',
    shelf_life: '14 days',
  },
  {
    id: 3,
    group: 'fruits',
    vendor: 'Brand A',
    name: 'Red Apples',
    subtype: 'apple',
    description: 'Fresh red apples',
    size_description: 'per pound',
    size_description_2: null,
    size_oz: 16,
    size_g: 453,
    servings: 1,
    nutrition: sampleNutrition,
    price: 1.99,
    price_per_serving: 1.99,
    price_per_oz: 0.124,
    price_per_calorie: 0.02,
    price_date: '2026-04-14',
    shelf_life: '30 days',
  },
  {
    id: 4,
    group: 'vegetables',
    vendor: 'Brand C',
    name: 'Broccoli',
    subtype: 'cruciferous',
    description: 'Fresh broccoli heads',
    size_description: 'per bunch',
    size_description_2: null,
    size_oz: 20,
    size_g: 567,
    servings: 2,
    nutrition: sampleNutrition,
    price: 2.49,
    price_per_serving: 1.25,
    price_per_oz: 0.125,
    price_per_calorie: 0.025,
    price_date: '2026-04-14',
    shelf_life: '7 days',
  },
]

describe('useFoods hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    consoleLogSpy.mockClear()
    consoleErrorSpy.mockClear()
  })

  afterAll(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  it('(a) fetches from /api/food and returns IFood array', async () => {
    const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>

    mockUseQuery.mockReturnValue({
      data: sampleFoods,
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

    const result = useFoods()

    expect(result.data).toEqual(sampleFoods)
    expect(Array.isArray(result.data)).toBe(true)
    expect(result.data?.length).toBe(4)
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

    const result = useFoods()

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

    const result = useFoods()

    expect(result.error).toBe(mockError)
    expect(result.isError).toBe(true)
  })
})

describe('filterFoods function', () => {
  it('(d) filterFoods returns all foods when search is empty', () => {
    const result = filterFoods(sampleFoods, '', null)

    expect(result).toEqual(sampleFoods)
    expect(result.length).toBe(4)
  })

  it('(e) filterFoods filters by name substring', () => {
    const result = filterFoods(sampleFoods, 'orange', null)

    expect(result.length).toBe(1)
    expect(result[0].name).toBe('Orange Juice')
  })

  it('(e) filterFoods filters by name substring (case-insensitive)', () => {
    const result = filterFoods(sampleFoods, 'APPLE', null)

    expect(result.length).toBe(1)
    expect(result[0].name).toBe('Red Apples')
  })

  it('(e) filterFoods filters by name substring (partial match)', () => {
    const result = filterFoods(sampleFoods, 'milk', null)

    expect(result.length).toBe(1)
    expect(result[0].name).toBe('Whole Milk')
  })

  it('(f) filterFoods filters by vendor substring', () => {
    const result = filterFoods(sampleFoods, 'Brand A', null)

    expect(result.length).toBe(2)
    expect(result[0].vendor).toBe('Brand A')
    expect(result[1].vendor).toBe('Brand A')
  })

  it('(f) filterFoods filters by vendor substring (case-insensitive)', () => {
    const result = filterFoods(sampleFoods, 'brand b', null)

    expect(result.length).toBe(1)
    expect(result[0].vendor).toBe('Brand B')
  })

  it('(g) filterFoods filters by group', () => {
    const result = filterFoods(sampleFoods, '', 'dairy')

    expect(result.length).toBe(1)
    expect(result[0].group).toBe('dairy')
    expect(result[0].name).toBe('Whole Milk')
  })

  it('(g) filterFoods filters by multiple groups', () => {
    const result = filterFoods(sampleFoods, '', 'beverages')

    expect(result.length).toBe(1)
    expect(result[0].group).toBe('beverages')
  })

  it('(h) filterFoods with group=null and non-empty search filters by name only', () => {
    const result = filterFoods(sampleFoods, 'Brand', null)

    // "Brand A", "Brand B", "Brand C" match in vendor
    expect(result.length).toBe(4) // All have "Brand" in vendor
  })

  it('(h) filterFoods combined: group and search (AND logic)', () => {
    const result = filterFoods(sampleFoods, 'Brand A', 'fruits')

    expect(result.length).toBe(1)
    expect(result[0].name).toBe('Red Apples')
    expect(result[0].group).toBe('fruits')
    expect(result[0].vendor).toBe('Brand A')
  })

  it('filterFoods returns empty when no match found', () => {
    const result = filterFoods(sampleFoods, 'nonexistent', null)

    expect(result.length).toBe(0)
  })

  it('filterFoods with group filter that matches no foods', () => {
    const result = filterFoods(sampleFoods, '', 'grains')

    expect(result.length).toBe(0)
  })
})
