/**
 * NutritionLabel - displays nutrition facts in a 2-column format
 * Maps all 18 nutrition fields to USDA label order
 */

import React, { useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { INutrition, INutritionAlternative } from '@/types/food';

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
  nutritionAlternatives?: INutritionAlternative[];
  servings?: number;
  servingSizeG?: number;
  servingSizeOz?: number;
  // servingSizeDescription is included for API compatibility,
  // though nutrition already contains serving_size_description
  servingSizeDescription?: string;
  // Fields to exclude from the nutrition label display
  excludeFields?: Array<keyof INutrition>;
  // Whether to render the combined "Serving Size" row
  showServingSizeRow?: boolean;
  // Emphasize calories row (larger and bolder) when true
  emphasizeCalories?: boolean;
  trailingRows?: Array<{ label: string; value: string }>;
}

type ServingView = {
  key: string;
  label: string;
  nutrition: INutrition;
};

export const NutritionLabel: React.FC<NutritionLabelProps> = ({
  nutrition,
  nutritionAlternatives,
  servings,
  servingSizeG,
  servingSizeOz,
  servingSizeDescription,
  excludeFields,
  showServingSizeRow = true,
  emphasizeCalories = false,
  trailingRows,
}) => {
  const buildServingViews = (): ServingView[] => {
    const views: ServingView[] = [
      {
        key: 'primary',
        label: nutrition.serving_size_description || 'Primary',
        nutrition,
      },
    ];
    if (nutritionAlternatives) {
      nutritionAlternatives.forEach((alt, i) => {
        views.push({
          key: `alt-${i}`,
          label: alt.nutrition?.serving_size_description || `${alt.serving_value} ${alt.serving_unit}`,
          nutrition: alt.nutrition || nutrition,
        });
      });
    }
    return views;
  };

  const servingViews = buildServingViews();
  const [selectedKey, setSelectedKey] = useState('primary');
  const activeView = servingViews.find((v) => v.key === selectedKey) || servingViews[0];
  const activeNutrition = activeView.nutrition;
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
    servingSizeDescription || activeNutrition.serving_size_description,
    servingSizeG != null ? `${formatValue(servingSizeG)} g` : null,
    servingSizeOz != null ? `${formatValue(servingSizeOz)} oz` : null,
  ]
    .filter((part) => part && part !== '—')
    .join(', ');

  return (
    <ScrollView style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      {servingViews.length > 1 && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: '#e0e0e0',
          }}
        >
          {servingViews.map((view) => {
            const isActive = view.key === selectedKey;
            return (
              <Pressable
                key={view.key}
                onPress={() => setSelectedKey(view.key)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 16,
                  backgroundColor: isActive ? '#007AFF' : '#f0f0f0',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: isActive ? '#fff' : '#333',
                    fontWeight: '600',
                  }}
                >
                  {view.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

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

      {showServingSizeRow && (
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
      )}

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
          <Text
            style={{
              fontSize: emphasizeCalories && field === 'calories' ? 16 : 14,
              color: '#333',
              flex: 1,
              fontWeight: emphasizeCalories && field === 'calories' ? '700' : '400',
            }}
          >
            {NUTRITION_FIELD_LABELS[field]}
          </Text>
          <Text
            style={{
              fontSize: emphasizeCalories && field === 'calories' ? 16 : 14,
              color: '#333',
              fontWeight: emphasizeCalories && field === 'calories' ? '800' : '600',
            }}
          >
            {formatValue(activeNutrition[field])}
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
