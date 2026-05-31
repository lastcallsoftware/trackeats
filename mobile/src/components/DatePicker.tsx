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
  const todayIso = new Date().toISOString().slice(0, 10)
  const isToday = date === todayIso

  const handlePrevDay = () => {
    const current = new Date(date + 'T00:00:00')
    current.setDate(current.getDate() - 1)
    const newDate = current.toISOString().slice(0, 10)
    onDateChange(newDate)
  }

  const handleToday = () => {
    onDateChange(todayIso)
  }

  const handleNextDay = () => {
    const current = new Date(date + 'T00:00:00')
    current.setDate(current.getDate() + 1)
    const newDate = current.toISOString().slice(0, 10)

    // Cap at today — do not allow future dates
    if (newDate <= todayIso) {
      onDateChange(newDate)
    }
  }

  const selectedDate = new Date(date + 'T00:00:00')

  const displayWeekday = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
  })

  const displayDate = selectedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  const displayYear = selectedDate.toLocaleDateString('en-US', {
    year: 'numeric',
  })

  const nextDisabled = isToday

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.weekdayText}>{displayWeekday}</Text>
            <View style={styles.dateRow}>
              <Text style={styles.dateText}>{displayDate}</Text>
              <Text style={styles.yearText}>{displayYear}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.todayChip, isToday && styles.todayChipActive]}
            onPress={handleToday}
            disabled={isToday}
            activeOpacity={0.8}
          >
            <Text style={[styles.todayChipText, isToday && styles.todayChipTextActive]}>Today</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity style={[styles.navButton, styles.prevButton]} onPress={handlePrevDay} activeOpacity={0.8}>
            <Text style={styles.navButtonText}>‹ Previous</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, nextDisabled && styles.navButtonDisabled]}
            onPress={handleNextDay}
            disabled={nextDisabled}
            activeOpacity={0.8}
          >
            <Text style={[styles.navButtonText, nextDisabled && styles.navButtonTextDisabled]}>Next ›</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#eef6ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d4e8ff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#2f5f97',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#2c5d90',
    marginBottom: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  dateText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#123a66',
  },
  yearText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4f6f8e',
  },
  todayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#7cb7f2',
    backgroundColor: '#fff',
  },
  todayChipActive: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  todayChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a64a6',
  },
  todayChipTextActive: {
    color: '#fff',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#8fc2f3',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  prevButton: {
    borderColor: '#7cb7f2',
  },
  navButtonDisabled: {
    borderColor: '#c8d7e6',
    backgroundColor: '#f2f6fb',
  },
  navButtonText: {
    color: '#15528b',
    fontSize: 14,
    fontWeight: '700',
  },
  navButtonTextDisabled: {
    color: '#9aaebe',
  },
})
