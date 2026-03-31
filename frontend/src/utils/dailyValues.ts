// Recommended Daily Values for a 2,000 calorie diet (FDA standard)
// Source: https://www.fda.gov/food/new-nutrition-facts-label/daily-value-new-nutrition-and-supplement-facts-labels

export const DAILY_VALUES = {
  total_fat_g: 78,           // grams
  saturated_fat_g: 20,       // grams
  trans_fat_g: 0,            // grams (no safe level)
  cholesterol_mg: 300,       // milligrams
  sodium_mg: 2300,           // milligrams
  total_carbs_g: 275,        // grams
  fiber_g: 28,               // grams
  total_sugar_g: null,       // grams (no DV established)
  added_sugar_g: 50,         // grams
  protein_g: 50,             // grams
  vitamin_d_mcg: 20,         // micrograms (800 IU)
  calcium_mg: 1300,          // milligrams
  iron_mg: 18,               // milligrams
  potassium_mg: 4700,        // milligrams
};

export type DailyValuesType = typeof DAILY_VALUES;
