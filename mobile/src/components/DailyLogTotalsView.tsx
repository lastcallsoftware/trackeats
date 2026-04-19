import React from 'react'
import {
  View,
  Text,
  StyleSheet,
} from 'react-native'
import { INutrition } from '@/types/food'
import { NutritionLabel } from '@/components/NutritionLabel'

interface DailyLogTotalsViewProps {
  nutrition: INutrition
}

/**
 * DailyLogTotalsView displays aggregated daily nutrition totals
 * Uses NutritionLabel component to render all 18 nutrition fields
 * Adds a heading 'Daily Totals' above the label
 */
export function DailyLogTotalsView({ nutrition }: DailyLogTotalsViewProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Daily Totals</Text>
      <NutritionLabel nutrition={nutrition} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginVertical: 12,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 8,
  },
})
