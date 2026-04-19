import { INutrition } from '@/types/food'

export type IDailyLogItem = {
  id: number
  user_id: number
  food_id: number | null
  recipe_id: number | null
  date: string // YYYY-MM-DD format
  servings: number
  ordinal: number
  nutrition: INutrition | null
}

/**
 * Request type for adding a new daily log item
 * Requires exactly one of food_id or recipe_id
 */
export type DailyLogItemAddRequest = {
  date: string // YYYY-MM-DD format
  food_id?: number
  recipe_id?: number
  servings: number // Must be > 0
  notes?: string
}

/**
 * Request type for updating an existing daily log item
 * Allows partial updates of servings, food_id, recipe_id, date, and notes
 */
export type DailyLogItemUpdateRequest = {
  recipe_id?: number
  food_id?: number
  servings: number
  date?: string
  notes?: string
}
