import { aggregateNutrition } from '@/utils/nutritionAggregation'
import { IDailyLogItem } from '@/types/dailylog'
import { INutrition } from '@/types/food'

// Sample nutrition data for tests
const sampleNutrition1: INutrition = {
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

const sampleNutrition2: INutrition = {
  serving_size_description: '1 piece',
  serving_size_oz: 4,
  serving_size_g: 120,
  calories: 150,
  total_fat_g: 3,
  saturated_fat_g: 1,
  trans_fat_g: 0.1,
  cholesterol_mg: 10,
  sodium_mg: 300,
  total_carbs_g: 25,
  fiber_g: 2,
  total_sugar_g: 15,
  added_sugar_g: 5,
  protein_g: 8,
  vitamin_d_mcg: 2,
  calcium_mg: 150,
  iron_mg: 1.5,
  potassium_mg: 400,
}

describe('aggregateNutrition function', () => {
  it('(a) sums all 18 fields across 2 entries', () => {
    const items: IDailyLogItem[] = [
      {
        id: 1,
        user_id: 1,
        food_id: 1,
        recipe_id: null,
        date: '2026-04-18',
        servings: 1,
        ordinal: 1,
        nutrition: sampleNutrition1,
      },
      {
        id: 2,
        user_id: 1,
        food_id: 2,
        recipe_id: null,
        date: '2026-04-18',
        servings: 1,
        ordinal: 2,
        nutrition: sampleNutrition2,
      },
    ]

    const result = aggregateNutrition(items)

    // Verify serving sizes are placeholder
    expect(result.serving_size_description).toBe('Total')
    expect(result.serving_size_oz).toBe(12) // 8 + 4
    expect(result.serving_size_g).toBe(360) // 240 + 120

    // Verify all 18 numeric fields are summed
    expect(result.calories).toBe(250) // 100 + 150
    expect(result.total_fat_g).toBe(5) // 2 + 3
    expect(result.saturated_fat_g).toBe(1.5) // 0.5 + 1
    expect(result.trans_fat_g).toBe(0.1) // 0 + 0.1
    expect(result.cholesterol_mg).toBe(10) // 0 + 10
    expect(result.sodium_mg).toBe(500) // 200 + 300
    expect(result.total_carbs_g).toBe(45) // 20 + 25
    expect(result.fiber_g).toBe(6) // 4 + 2
    expect(result.total_sugar_g).toBe(27) // 12 + 15
    expect(result.added_sugar_g).toBe(5) // 0 + 5
    expect(result.protein_g).toBe(13) // 5 + 8
    expect(result.vitamin_d_mcg).toBe(2) // 0 + 2
    expect(result.calcium_mg).toBe(350) // 200 + 150
    expect(result.iron_mg).toBe(3.5) // 2 + 1.5
    expect(result.potassium_mg).toBe(700) // 300 + 400
  })

  it('(b) handles null nutrition entry (treats as zero)', () => {
    const items: IDailyLogItem[] = [
      {
        id: 1,
        user_id: 1,
        food_id: 1,
        recipe_id: null,
        date: '2026-04-18',
        servings: 1,
        ordinal: 1,
        nutrition: sampleNutrition1,
      },
      {
        id: 2,
        user_id: 1,
        food_id: null,
        recipe_id: 1,
        date: '2026-04-18',
        servings: 1,
        ordinal: 2,
        nutrition: null, // Null nutrition
      },
    ]

    const result = aggregateNutrition(items)

    // Should only sum the first item (second has null nutrition)
    expect(result.calories).toBe(100)
    expect(result.protein_g).toBe(5)
    expect(result.total_carbs_g).toBe(20)
  })

  it('(c) handles empty array (returns zeroed INutrition)', () => {
    const items: IDailyLogItem[] = []

    const result = aggregateNutrition(items)

    // Verify all fields are zero (except serving_size_description which is 'Total')
    expect(result.serving_size_description).toBe('Total')
    expect(result.serving_size_oz).toBe(0)
    expect(result.serving_size_g).toBe(0)
    expect(result.calories).toBe(0)
    expect(result.total_fat_g).toBe(0)
    expect(result.saturated_fat_g).toBe(0)
    expect(result.trans_fat_g).toBe(0)
    expect(result.cholesterol_mg).toBe(0)
    expect(result.sodium_mg).toBe(0)
    expect(result.total_carbs_g).toBe(0)
    expect(result.fiber_g).toBe(0)
    expect(result.total_sugar_g).toBe(0)
    expect(result.added_sugar_g).toBe(0)
    expect(result.protein_g).toBe(0)
    expect(result.vitamin_d_mcg).toBe(0)
    expect(result.calcium_mg).toBe(0)
    expect(result.iron_mg).toBe(0)
    expect(result.potassium_mg).toBe(0)
  })

  it('(d) handles entry with undefined nutrition fields gracefully', () => {
    const nutritionWithUndefined: INutrition = {
      serving_size_description: '1 serving',
      serving_size_oz: 8,
      serving_size_g: 240,
      calories: 100,
      total_fat_g: undefined as any,
      saturated_fat_g: undefined as any,
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

    const items: IDailyLogItem[] = [
      {
        id: 1,
        user_id: 1,
        food_id: 1,
        recipe_id: null,
        date: '2026-04-18',
        servings: 1,
        ordinal: 1,
        nutrition: nutritionWithUndefined,
      },
    ]

    const result = aggregateNutrition(items)

    // Should handle undefined fields gracefully using nullish coalescing
    expect(result.calories).toBe(100)
    expect(result.total_fat_g).toBe(0) // undefined -> 0
    expect(result.saturated_fat_g).toBe(0) // undefined -> 0
    expect(result.protein_g).toBe(5)
  })
})
