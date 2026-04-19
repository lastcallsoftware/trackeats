import React from 'react'
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { FoodGroup } from '@/types/food'

// Mapping from camelCase enum keys to human-readable labels
const FOOD_GROUP_LABELS: Record<FoodGroup, string> = {
  beverages: 'Beverages',
  condiments: 'Condiments',
  dairy: 'Dairy',
  fatsAndSugars: 'Fats & Sugars',
  fruits: 'Fruits',
  grains: 'Grains',
  herbsAndSpices: 'Herbs & Spices',
  nutsAndSeeds: 'Nuts & Seeds',
  preparedFoods: 'Prepared Foods',
  proteins: 'Proteins',
  vegetables: 'Vegetables',
  other: 'Other',
}

// All food group keys in order
const FOOD_GROUPS: FoodGroup[] = [
  'beverages',
  'condiments',
  'dairy',
  'fatsAndSugars',
  'fruits',
  'grains',
  'herbsAndSpices',
  'nutsAndSeeds',
  'preparedFoods',
  'proteins',
  'vegetables',
  'other',
]

interface GroupFilterTabsProps {
  selected: string | null
  onSelect: (group: string | null) => void
}

/**
 * Horizontally scrollable filter chips for food groups
 * Shows 'All' chip plus one chip per FoodGroup (12 values)
 * Selected chip is highlighted
 */
export const GroupFilterTabs: React.FC<GroupFilterTabsProps> = ({ selected, onSelect }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* All chip */}
      <TouchableOpacity
        style={[styles.chip, selected === null && styles.chipSelected]}
        onPress={() => onSelect(null)}
        activeOpacity={0.7}
      >
        <Text style={[styles.chipText, selected === null && styles.chipTextSelected]}>
          All
        </Text>
      </TouchableOpacity>

      {/* Group chips */}
      {FOOD_GROUPS.map((group) => (
        <TouchableOpacity
          key={group}
          style={[styles.chip, selected === group && styles.chipSelected]}
          onPress={() => onSelect(group)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, selected === group && styles.chipTextSelected]}>
            {FOOD_GROUP_LABELS[group]}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 0,
    paddingVertical: 8,
  },
  contentContainer: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e8e8e8',
    borderWidth: 1,
    borderColor: '#d0d0d0',
  },
  chipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
  },
})
