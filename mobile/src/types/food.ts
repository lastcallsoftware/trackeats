export type INutritionAlternative = {
  id: number
  food_id: number
  nutrition_id: number
  nutrition: INutrition
  serving_value: number
  serving_unit: string
  serving_unit_kind: string
  ordinal: number
}

export type INutrition = {
  serving_size_description: string
  serving_size_oz: number
  serving_size_g: number
  calories: number
  total_fat_g: number
  saturated_fat_g: number
  trans_fat_g: number
  cholesterol_mg: number
  sodium_mg: number
  total_carbs_g: number
  fiber_g: number
  total_sugar_g: number
  added_sugar_g: number
  protein_g: number
  vitamin_d_mcg: number
  calcium_mg: number
  iron_mg: number
  potassium_mg: number
  // Structured serving fields (Slice J — read from API responses)
  serving_value: number | null
  serving_unit: string | null
  serving_unit_kind: string | null
}

export type IFood = {
  id?: number
  group: string
  vendor: string
  name: string
  subtype: string
  description: string
  size_description: string
  size_description_2: string | null
  size_oz: number
  size_g: number
  servings: number
  nutrition_id?: number
  nutrition: INutrition
  price: number
  price_per_serving: number
  price_per_oz: number
  price_per_calorie: number
  price_date: string
  shelf_life: string
  source?: string | null
  fdc_id?: number | null
  fdc_data_type?: string | null
  starter_food?: boolean
  // Structured size fields (Slice J — read from API responses)
  size_value: number | null
  size_unit: string | null
  size_unit_kind: string | null
  nutrition_alternatives: INutritionAlternative[]
}

export type FoodGroup =
  | 'beverages'
  | 'condiments'
  | 'dairy'
  | 'fatsAndSugars'
  | 'fruits'
  | 'grains'
  | 'herbsAndSpices'
  | 'nutsAndSeeds'
  | 'preparedFoods'
  | 'proteins'
  | 'vegetables'
  | 'other'
