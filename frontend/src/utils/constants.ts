export const TABLE_PREFERENCES_DEBOUNCE_MS = 600
export const FOODS_COLUMNS_PREFERENCES_KEY = "foods.columns"
export const RECIPES_COLUMNS_PREFERENCES_KEY = "recipes.columns"

export type TableColumnsPreferences = {
	columnVisibility: Record<string, boolean>
}

export const DEFAULT_FOODS_COLUMNS_PREFERENCES: TableColumnsPreferences = {
	columnVisibility: {
		"id": false,
		"group": false,
		"vendor": true,
		"name": true,
		"subtype": true,
		"description": false,
		"size_description": true,
		"size_oz": false,
		"size_g": false,
		"servings": true,
		"nutrition_id": false,
		"nutrition_serving_size_description": true,
		"nutrition_serving_size_oz": false,
		"nutrition_serving_size_g": false,
		"nutrition_calories": true,
		"nutrition_total_fat_g": false,
		"nutrition_saturated_fat_g": true,
		"nutrition_trans_fat_g": false,
		"nutrition_cholesterol_mg": true,
		"nutrition_sodium_mg": true,
		"nutrition_total_carbs_g": false,
		"nutrition_fiber_g": false,
		"nutrition_total_sugar_g": false,
		"nutrition_added_sugar_g": false,
		"nutrition_protein_g": false,
		"nutrition_vitamin_d_mcg": false,
		"nutrition_calcium_mg": false,
		"nutrition_iron_mg": false,
		"nutrition_potassium_mg": false,
		"price": false,
		"price_per_serving": true,
		"price_per_oz": false,
		"price_per_calorie": true,
		"price_date": false,
		"shelf_life": false,
	},
}

export const DEFAULT_RECIPES_COLUMNS_PREFERENCES: TableColumnsPreferences = {
	columnVisibility: {
		"id": false,
		"cuisine": true,
		"name": true,
		"total_yield": true,
		"servings": true,
		"nutrition_serving_size_description": true,
		"nutrition_serving_size_oz": false,
		"nutrition_serving_size_g": false,
		"nutrition_calories": true,
		"nutrition_total_fat_g": false,
		"nutrition_saturated_fat_g": true,
		"nutrition_trans_fat_g": false,
		"nutrition_cholesterol_mg": true,
		"nutrition_sodium_mg": true,
		"nutrition_total_carbs_g": false,
		"nutrition_fiber_g": false,
		"nutrition_total_sugar_g": false,
		"nutrition_added_sugar_g": false,
		"nutrition_protein_g": false,
		"nutrition_vitamin_d_mcg": false,
		"nutrition_calcium_mg": false,
		"nutrition_iron_mg": false,
		"nutrition_potassium_mg": false,
		"price": true,
		"price_per_calorie": true,
	},
}
