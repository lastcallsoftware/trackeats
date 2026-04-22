/**
 * NutritionLabel - displays nutrition facts in a 2-column format
 * Maps all 18 nutrition fields to USDA label order
 */

import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { INutrition } from '@/types/food';

// Map INutrition field names to display labels in USDA order
const NUTRITION_FIELD_LABELS: Record<keyof INutrition, string> = {
  serving_size_description: 'Serving Size',
  serving_size_oz: 'Serving Size (oz)',
  serving_size_g: 'Serving Size (g)',
  calories: 'Calories',
  total_fat_g: 'Total Fat (g)',
  saturated_fat_g: 'Saturated Fat (g)',
  trans_fat_g: 'Trans Fat (g)',
  cholesterol_mg: 'Cholesterol (mg)',
  sodium_mg: 'Sodium (mg)',
  total_carbs_g: 'Total Carbs (g)',
  fiber_g: 'Dietary Fiber (g)',
  total_sugar_g: 'Total Sugar (g)',
  added_sugar_g: 'Added Sugar (g)',
  protein_g: 'Protein (g)',
  vitamin_d_mcg: 'Vitamin D (mcg)',
  calcium_mg: 'Calcium (mg)',
  iron_mg: 'Iron (mg)',
  potassium_mg: 'Potassium (mg)',
};

interface NutritionLabelProps {
  nutrition: INutrition;
  servings?: number;
  servingSizeG?: number;
  servingSizeOz?: number;
  // servingSizeDescription is included for API compatibility,
  // though nutrition already contains serving_size_description
  servingSizeDescription?: string;
  // Fields to exclude from the nutrition label display
  excludeFields?: Array<keyof INutrition>;
  trailingRows?: Array<{ label: string; value: string }>;
}

export const NutritionLabel: React.FC<NutritionLabelProps> = ({
  nutrition,
  servings,
  servingSizeG,
  servingSizeOz,
  servingSizeDescription,
  excludeFields,
  trailingRows,
}) => {
  const allFields: Array<keyof INutrition> = [
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

  const fields = excludeFields
    ? allFields.filter((field) => !excludeFields.includes(field))
    : allFields;

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '—';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return '—';
  };

  const servingSizeValue = [
    servingSizeDescription || nutrition.serving_size_description,
    servingSizeG != null ? `${formatValue(servingSizeG)} g` : null,
    servingSizeOz != null ? `${formatValue(servingSizeOz)} oz` : null,
  ]
    .filter((part) => part && part !== '—')
    .join(', ');

  return (
    <ScrollView style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {servings != null && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: '#e0e0e0',
          }}
        >
          <Text style={{ fontSize: 14, color: '#333', flex: 1 }}>
            Servings
          </Text>
          <Text style={{ fontSize: 14, color: '#333', fontWeight: '600' }}>
            {formatValue(servings)}
          </Text>
        </View>
      )}

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: '#e0e0e0',
        }}
      >
        <Text style={{ fontSize: 14, color: '#333', flex: 1 }}>
          Serving Size
        </Text>
        <Text style={{ fontSize: 14, color: '#333', fontWeight: '600' }}>
          {servingSizeValue || '—'}
        </Text>
      </View>

      {fields.map((field) => (
        <View
          key={field}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: '#e0e0e0',
          }}
        >
          <Text style={{ fontSize: 14, color: '#333', flex: 1 }}>
            {NUTRITION_FIELD_LABELS[field]}
          </Text>
          <Text style={{ fontSize: 14, color: '#333', fontWeight: '600' }}>
            {formatValue(nutrition[field])}
          </Text>
        </View>
      ))}

      {trailingRows?.map((row) => (
        <View
          key={row.label}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: '#e0e0e0',
          }}
        >
          <Text style={{ fontSize: 14, color: '#333', flex: 1 }}>
            {row.label}
          </Text>
          <Text style={{ fontSize: 14, color: '#333', fontWeight: '600' }}>
            {row.value}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};
