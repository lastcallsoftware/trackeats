import React, { useState, useEffect } from 'react'
import {
  View,
  ScrollView,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native'
import { useDailyLog } from '@/hooks/useDailyLog'
import { useDailyLogMutation } from '@/hooks/useDailyLogMutation'
import { aggregateNutrition } from '@/utils/nutritionAggregation'
import { DatePicker } from '@/components/DatePicker'
import { DailyLogTotalsView } from '@/components/DailyLogTotalsView'
import { DailyLogListView } from '@/components/DailyLogListView'
import { AddDailyLogEntrySheet } from '@/components/AddDailyLogEntrySheet'
import { EditDailyLogEntrySheet } from '@/components/EditDailyLogEntrySheet'
import { IDailyLogItem } from '@/types/dailylog'

/**
 * DailyLogScreen is the main screen for viewing daily food consumption
 * - Displays a date picker for navigating between dates
 * - Shows aggregated daily nutrition totals
 * - Lists all logged consumption items for the selected date in ordinal order
 * - Handles loading, error, and empty states
 */
export function DailyLogScreen(): React.ReactElement {
  // Initialize with today's date in ISO format (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().slice(0, 10)
  })

  // Sheet visibility state
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<IDailyLogItem | null>(null)

  const { data: entries, isLoading, error, refetch } = useDailyLog(selectedDate)
  const { addEntry, editEntry, deleteEntry } = useDailyLogMutation(selectedDate)

  // Get entries array, default to empty array
  const entriesArray = entries && Array.isArray(entries) ? entries : []

  // Aggregate nutrition from entries
  const totals = aggregateNutrition(entriesArray)

  // Handle delete error
  useEffect(() => {
    if (deleteEntry.isError && deleteEntry.error) {
      console.error('[DAILY_LOG] Mutation error:', deleteEntry.error.message)
      Alert.alert('Error', deleteEntry.error.message ?? 'Failed to delete entry')
    }
  }, [deleteEntry.isError, deleteEntry.error])

  // Get label for editing entry (food or recipe name)
  const editingEntryLabel = editingEntry
    ? editingEntry.food_id !== null
      ? `Food #${editingEntry.food_id}`
      : `Recipe #${editingEntry.recipe_id}`
    : ''

  // Loading state — show only on initial load when no entries yet
  if (isLoading && entriesArray.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  // Error state — show error message with retry button
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load daily log</Text>
        <Text style={styles.errorMessage}>
          {error instanceof Error ? error.message : 'Unknown error'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.7}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Determine empty state — only show after load completes with zero entries
  const showEmptyState = !isLoading && entriesArray.length === 0

  // Render normal screen with date picker, totals, and entries
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <DatePicker date={selectedDate} onDateChange={setSelectedDate} />

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setAddSheetOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>Add Entry</Text>
        </TouchableOpacity>

        {showEmptyState ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyText}>No entries for this date</Text>
          </View>
        ) : (
          <>
            <DailyLogTotalsView nutrition={totals} />
            <DailyLogListView
              items={entriesArray}
              onEdit={(item) => setEditingEntry(item)}
              onDelete={(item) => deleteEntry.mutate(item.id)}
            />
          </>
        )}
      </ScrollView>

      <AddDailyLogEntrySheet
        visible={addSheetOpen}
        date={selectedDate}
        addEntry={addEntry}
        onClose={() => setAddSheetOpen(false)}
      />

      <EditDailyLogEntrySheet
        visible={editingEntry !== null}
        entry={editingEntry}
        label={editingEntryLabel}
        editEntry={editEntry}
        onClose={() => setEditingEntry(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d32f2f',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
})
