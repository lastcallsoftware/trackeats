import { INutrition } from '@/types/food'
import { IDailyLogItem } from '@/types/dailylog'

/**
 * Aggregate nutrition data across multiple daily log items.
 * Sums all 18 numeric nutrition fields across items with non-null nutrition.
 * Non-numeric fields (serving_size_description, serving size fields) are set to
 * placeholder values since they don't meaningfully aggregate.
 * Treats null and undefined nutrition entries as zero contribution.
 */
export function aggregateNutrition(items: IDailyLogItem[]): INutrition {
  // Initialize accumulator with all zeros
  const totals: INutrition = {
    serving_size_description: 'Total',
    serving_size_oz: 0,
    serving_size_g: 0,
    calories: 0,
    total_fat_g: 0,
    saturated_fat_g: 0,
    trans_fat_g: 0,
    cholesterol_mg: 0,
    sodium_mg: 0,
    total_carbs_g: 0,
    fiber_g: 0,
    total_sugar_g: 0,
    added_sugar_g: 0,
    protein_g: 0,
    vitamin_d_mcg: 0,
    calcium_mg: 0,
    iron_mg: 0,
    potassium_mg: 0,
  }

  // Sum numeric fields across all items with non-null nutrition
  items.forEach((item) => {
    if (!item.nutrition) {
      return // Skip items with null or undefined nutrition
    }

    // Sum the 18 numeric fields
    totals.serving_size_oz += item.nutrition.serving_size_oz ?? 0
    totals.serving_size_g += item.nutrition.serving_size_g ?? 0
    totals.calories += item.nutrition.calories ?? 0
    totals.total_fat_g += item.nutrition.total_fat_g ?? 0
    totals.saturated_fat_g += item.nutrition.saturated_fat_g ?? 0
    totals.trans_fat_g += item.nutrition.trans_fat_g ?? 0
    totals.cholesterol_mg += item.nutrition.cholesterol_mg ?? 0
    totals.sodium_mg += item.nutrition.sodium_mg ?? 0
    totals.total_carbs_g += item.nutrition.total_carbs_g ?? 0
    totals.fiber_g += item.nutrition.fiber_g ?? 0
    totals.total_sugar_g += item.nutrition.total_sugar_g ?? 0
    totals.added_sugar_g += item.nutrition.added_sugar_g ?? 0
    totals.protein_g += item.nutrition.protein_g ?? 0
    totals.vitamin_d_mcg += item.nutrition.vitamin_d_mcg ?? 0
    totals.calcium_mg += item.nutrition.calcium_mg ?? 0
    totals.iron_mg += item.nutrition.iron_mg ?? 0
    totals.potassium_mg += item.nutrition.potassium_mg ?? 0
  })

  return totals
}
