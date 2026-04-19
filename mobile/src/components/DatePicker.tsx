import React from 'react'
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native'

interface DatePickerProps {
  date: string // YYYY-MM-DD format
  onDateChange: (date: string) => void
}

/**
 * DatePicker component for navigating between dates
 * Displays prev/today/next buttons with the formatted date in between
 * Next button is capped at today — no future dates allowed
 */
export function DatePicker({ date, onDateChange }: DatePickerProps): React.ReactElement {
  const handlePrevDay = () => {
    const current = new Date(date + 'T00:00:00')
    current.setDate(current.getDate() - 1)
    const newDate = current.toISOString().slice(0, 10)
    onDateChange(newDate)
  }

  const handleToday = () => {
    const today = new Date()
    const todayIso = today.toISOString().slice(0, 10)
    onDateChange(todayIso)
  }

  const handleNextDay = () => {
    const current = new Date(date + 'T00:00:00')
    current.setDate(current.getDate() + 1)
    const newDate = current.toISOString().slice(0, 10)

    // Cap at today — do not allow future dates
    const today = new Date()
    const todayIso = today.toISOString().slice(0, 10)
    if (newDate <= todayIso) {
      onDateChange(newDate)
    }
  }

  // Format date for display (e.g., 'Apr 18, 2026')
  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handlePrevDay} activeOpacity={0.7}>
        <Text style={styles.buttonText}>‹ Prev</Text>
      </TouchableOpacity>

      <Text style={styles.dateText}>{displayDate}</Text>

      <TouchableOpacity style={styles.button} onPress={handleToday} activeOpacity={0.7}>
        <Text style={styles.buttonText}>Today</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleNextDay} activeOpacity={0.7}>
        <Text style={styles.buttonText}>Next ›</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
})
