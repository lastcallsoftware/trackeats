import React from 'react'
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native'

interface CuisineFilterTabsProps {
  cuisines: string[]
  selected: string | null
  onSelect: (cuisine: string | null) => void
}

/**
 * Horizontally scrollable filter chips for cuisine types
 * Shows 'All' chip plus one chip per unique cuisine
 * Selected chip is highlighted
 */
export const CuisineFilterTabs: React.FC<CuisineFilterTabsProps> = ({
  cuisines,
  selected,
  onSelect,
}) => {
  // Sort cuisines for consistent ordering
  const sortedCuisines = [...cuisines].sort()

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

      {/* Cuisine chips */}
      {sortedCuisines.map((cuisine) => (
        <TouchableOpacity
          key={cuisine}
          style={[styles.chip, selected === cuisine && styles.chipSelected]}
          onPress={() => onSelect(cuisine)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, selected === cuisine && styles.chipTextSelected]}>
            {cuisine}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  contentContainer: {
    paddingHorizontal: 12,
    gap: 8,
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
