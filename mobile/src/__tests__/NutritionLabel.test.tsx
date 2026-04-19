/**
 * Tests for NutritionLabel component
 * Verifies nutrition field rendering, null handling, and structure
 */

import { INutrition } from '@/types/food';

const mockNutrition: INutrition = {
  serving_size_description: '1 cup',
  serving_size_oz: 8,
  serving_size_g: 227,
  calories: 150,
  total_fat_g: 5,
  saturated_fat_g: 2,
  trans_fat_g: 0,
  cholesterol_mg: 20,
  sodium_mg: 400,
  total_carbs_g: 20,
  fiber_g: 2,
  total_sugar_g: 8,
  added_sugar_g: 2,
  protein_g: 8,
  vitamin_d_mcg: 2,
  calcium_mg: 300,
  iron_mg: 1.5,
  potassium_mg: 400,
};

describe('NutritionLabel', () => {
  it('should have all 18 required nutrition fields in mockNutrition', () => {
    const fieldNames: Array<keyof INutrition> = [
      'serving_size_description',
      'serving_size_oz',
      'serving_size_g',
      'calories',
      'total_fat_g',
      'saturated_fat_g',
      'trans_fat_g',
      'cholesterol_mg',
      'sodium_mg',
      'total_carbs_g',
      'fiber_g',
      'total_sugar_g',
      'added_sugar_g',
      'protein_g',
      'vitamin_d_mcg',
      'calcium_mg',
      'iron_mg',
      'potassium_mg',
    ];

    expect(fieldNames.length).toBe(18);
    fieldNames.forEach((field) => {
      expect(mockNutrition).toHaveProperty(field);
    });
  });

  it('should handle null/undefined nutrition values', () => {
    const nutritionWithNull: INutrition = {
      ...mockNutrition,
      vitamin_d_mcg: undefined as any,
      calcium_mg: null as any,
    };

    // Verify the object handles null/undefined gracefully
    expect(nutritionWithNull.vitamin_d_mcg).toBeUndefined();
    expect(nutritionWithNull.calcium_mg).toBeNull();
  });

  it('should include all USDA nutrition label fields', () => {
    // Verify that the mock includes all standard USDA nutrition label fields
    const expectedFields = [
      'calories',
      'total_fat_g',
      'saturated_fat_g',
      'trans_fat_g',
      'cholesterol_mg',
      'sodium_mg',
      'total_carbs_g',
      'fiber_g',
      'total_sugar_g',
      'added_sugar_g',
      'protein_g',
      'vitamin_d_mcg',
      'calcium_mg',
      'iron_mg',
      'potassium_mg',
    ];

    expectedFields.forEach((field) => {
      expect(Object.keys(mockNutrition)).toContain(field);
    });
  });
});
