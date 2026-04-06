export const TABLE_PREFERENCES_DEBOUNCE_MS = 600
export const MANDATORY_COLUMN_VISIBILITY = "mandatory" as const
export const AUTH_CHANGED_EVENT = "trackeats-auth-changed"
export const RECIPE_RECALC_TIMEOUT_MS = 10_000

export type ColumnVisibilityPreference = boolean | typeof MANDATORY_COLUMN_VISIBILITY

export type TableColumnsPreferences = {
	columnVisibility: Record<string, ColumnVisibilityPreference>
}

export const FOODS_COLUMNS_PREFERENCES_KEY = "foods.columns"
export const DEFAULT_FOODS_COLUMNS_PREFERENCES: TableColumnsPreferences = {
	columnVisibility: {
		"id": false,
		"group": false,
		"vendor": true,
		"name": MANDATORY_COLUMN_VISIBILITY,
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

export const RECIPES_COLUMNS_PREFERENCES_KEY = "recipes.columns"
export const DEFAULT_RECIPES_COLUMNS_PREFERENCES: TableColumnsPreferences = {
	columnVisibility: {
		"id": false,
		"cuisine": true,
		"name": MANDATORY_COLUMN_VISIBILITY,
		"total_yield": true,
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
		"price": true,
		"price_per_serving": true,
		"price_per_calorie": true,
	},
}


export const FOOD_INGREDIENTS_COLUMNS_PREFERENCES_KEY = "food.ingredient.columns"
export const DEFAULT_FOOD_INGREDIENTS_COLUMNS_PREFERENCES: TableColumnsPreferences = {
	columnVisibility: {
		"id": false,
		"group": false,
		"vendor": true,
		"name": MANDATORY_COLUMN_VISIBILITY,
		"subtype": true,
		"description": false,
		"size_description": false,
		"size_oz": false,
		"size_g": false,
		"servings": false,
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
		"nutrition_added_sugar_g": true,
		"nutrition_protein_g": true,
		"nutrition_vitamin_d_mcg": false,
		"nutrition_calcium_mg": false,
		"nutrition_iron_mg": false,
		"nutrition_potassium_mg": false,
		"price": false,
		"price_per_serving": true,
		"price_per_oz": false,
		"price_per_calorie": false,
		"price_date": false,
		"shelf_life": false,
	},
}


export const RECIPE_INGREDIENTS_COLUMNS_PREFERENCES_KEY = "recipe.ingredient.columns"
export const DEFAULT_RECIPE_INGREDIENTS_COLUMNS_PREFERENCES: TableColumnsPreferences = {
	columnVisibility: {
		"id": false,
		"cuisine": false,
		"name": MANDATORY_COLUMN_VISIBILITY,
		"total_yield": false,
		"servings": false,
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
		"nutrition_added_sugar_g": true,
		"nutrition_protein_g": true,
		"nutrition_vitamin_d_mcg": false,
		"nutrition_calcium_mg": false,
		"nutrition_iron_mg": false,
		"nutrition_potassium_mg": false,
		"price": false,
		"price_per_serving": true,
		"price_per_calorie": false,
	},
}

export const DAILYLOG_COLUMNS_PREFERENCES_KEY = "dailylog.columns"
export const DEFAULT_DAILYLOG_COLUMNS_PREFERENCES: TableColumnsPreferences = {
	columnVisibility: {
		"id": false,
		"label": MANDATORY_COLUMN_VISIBILITY,
		"servings": false,
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
		"nutrition_added_sugar_g": true,
		"nutrition_protein_g": true,
		"nutrition_vitamin_d_mcg": false,
		"nutrition_calcium_mg": false,
		"nutrition_iron_mg": false,
		"nutrition_potassium_mg": false,
		"price": true,
		"price_per_serving": true,
		"notes": true,
	},
}


export const getDefaultColumnsPreferences = (storageKey: string): TableColumnsPreferences | null => {
	if (storageKey === FOODS_COLUMNS_PREFERENCES_KEY) {
		return DEFAULT_FOODS_COLUMNS_PREFERENCES
	}
	if (storageKey === RECIPES_COLUMNS_PREFERENCES_KEY) {
		return DEFAULT_RECIPES_COLUMNS_PREFERENCES
	}
	if (storageKey === FOOD_INGREDIENTS_COLUMNS_PREFERENCES_KEY) {
		return DEFAULT_FOOD_INGREDIENTS_COLUMNS_PREFERENCES
	}
	if (storageKey === RECIPE_INGREDIENTS_COLUMNS_PREFERENCES_KEY) {
		return DEFAULT_RECIPE_INGREDIENTS_COLUMNS_PREFERENCES
	}
	if (storageKey === DAILYLOG_COLUMNS_PREFERENCES_KEY) {
		return DEFAULT_DAILYLOG_COLUMNS_PREFERENCES
	}
	return null
}

export const getMandatoryColumnIds = (storageKey: string): string[] => {
	const defaults = getDefaultColumnsPreferences(storageKey)
	if (!defaults) {
		return []
	}

	return Object.entries(defaults.columnVisibility)
		.filter(([, value]) => value === MANDATORY_COLUMN_VISIBILITY)
		.map(([columnId]) => columnId)
}

export const toVisibilityState = (
	columnVisibility: Record<string, ColumnVisibilityPreference>
): Record<string, boolean> => {
	const next: Record<string, boolean> = {}
	for (const [columnId, value] of Object.entries(columnVisibility)) {
		next[columnId] = value === MANDATORY_COLUMN_VISIBILITY ? true : value
	}
	return next
}

export const enforceMandatoryColumns = (
	storageKey: string,
	columnVisibility: Record<string, boolean>
): Record<string, boolean> => {
	const next = { ...columnVisibility }
	for (const mandatoryColumnId of getMandatoryColumnIds(storageKey)) {
		next[mandatoryColumnId] = true
	}
	return next
}
