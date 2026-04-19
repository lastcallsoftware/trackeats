import { INutrition } from './food'

/**
 * Recipe ingredient composition
 * Represents a specific ingredient used in a recipe with proportions
 */
export type IIngredient = {
  id: number
  recipe_id: number
  food_ingredient_id: number
  recipe_ingredient_id: number
  ordinal: number
  servings: number
}

/**
 * Recipe definition with aggregated nutrition
 * Recipes are collections of ingredients with their own nutrition calculated from constituent foods
 */
export type IRecipe = {
  id: number
  cuisine: string | null
  name: string
  total_yield: number
  servings: number
  nutrition_id: number
  nutrition: INutrition
  price: number
  price_per_serving?: number
  price_per_calorie?: number
}
