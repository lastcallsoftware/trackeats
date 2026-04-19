import React, { useRef, useCallback } from 'react'
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native'

interface SearchBarProps {
  value: string
  onChangeText: (text: string) => void
}

/**
 * Search bar component with debounced text input
 * 300ms debounce using useRef setTimeout approach
 */
export const SearchBar: React.FC<SearchBarProps> = ({ value, onChangeText }) => {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChangeText = useCallback(
    (text: string) => {
      // Clear previous timeout
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Set new timeout for debounced callback
      debounceTimerRef.current = setTimeout(() => {
        onChangeText(text)
      }, 300)
    },
    [onChangeText]
  )

  const handleClear = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    onChangeText('')
  }, [onChangeText])

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search foods..."
        placeholderTextColor="#999"
        value={value}
        onChangeText={handleChangeText}
      />
      {value.length > 0 && (
        <TouchableOpacity style={styles.clearButton} onPress={handleClear} activeOpacity={0.7}>
          <Text style={styles.clearButtonText}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 12,
    marginVertical: 12,
    borderRadius: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
    color: '#000',
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#999',
  },
})
