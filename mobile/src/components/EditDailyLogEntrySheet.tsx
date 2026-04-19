import React, { useState, useEffect } from 'react'
import {
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { IDailyLogItem } from '@/types/dailylog'

type MutationState = {
  mutate: (data: any) => void
  isPending: boolean
  isError: boolean
  isSuccess: boolean
  error: { message: string } | null
}

interface EditDailyLogEntrySheetProps {
  visible: boolean
  entry: IDailyLogItem | null
  label: string
  editEntry: MutationState
  onClose: () => void
}

/**
 * EditDailyLogEntrySheet is a modal for editing servings of an existing entry
 * - Shows read-only label of the food or recipe
 * - Allows editing servings (decimal number, must be > 0)
 * - Calls editEntry.mutate with { id, servings }
 * - Shows errors via Alert.alert
 */
export function EditDailyLogEntrySheet({
  visible,
  entry,
  label,
  editEntry,
  onClose,
}: EditDailyLogEntrySheetProps): React.ReactElement {
  const [servingsText, setServingsText] = useState('')

  // Pre-fill servings when entry changes
  useEffect(() => {
    if (entry) {
      setServingsText(String(entry.servings))
    }
  }, [entry, visible])

  // Handle submit
  const handleSubmit = () => {
    if (!entry) return

    // Validate servings
    const servings = parseFloat(servingsText)
    if (isNaN(servings) || servings <= 0) {
      Alert.alert('Validation Error', 'Servings must be greater than 0')
      return
    }

    console.log('[DAILY_LOG] Editing entry', entry.id)

    // Call mutation
    editEntry.mutate({
      id: entry.id,
      servings,
    })
  }

  // Handle mutation success
  useEffect(() => {
    if (editEntry.isSuccess) {
      console.log('[DAILY_LOG] Entry', entry?.id, 'updated')
      setServingsText('')
      onClose()
    }
  }, [editEntry.isSuccess, entry?.id, onClose])

  // Handle mutation error
  useEffect(() => {
    if (editEntry.isError && editEntry.error) {
      console.error('[DAILY_LOG] Mutation error:', editEntry.error.message)
      Alert.alert('Error', editEntry.error.message ?? 'Failed to edit entry')
    }
  }, [editEntry.isError, editEntry.error])

  if (!entry) {
    return <Modal visible={visible} />
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Edit Entry</Text>
          </View>

          {/* Label (read-only) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Item</Text>
            <View style={styles.labelContainer}>
              <Text style={styles.labelText}>{label}</Text>
            </View>
          </View>

          {/* Servings Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Servings</Text>
            <TextInput
              style={styles.servingsInput}
              placeholder="Servings"
              keyboardType="decimal-pad"
              value={servingsText}
              onChangeText={setServingsText}
              placeholderTextColor="#999"
            />
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
            disabled={editEntry.isPending}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.submitButton, editEntry.isPending && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={editEntry.isPending}
            activeOpacity={0.7}
          >
            <Text style={styles.submitButtonText}>
              {editEntry.isPending ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  labelContainer: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  labelText: {
    fontSize: 14,
    color: '#333',
  },
  servingsInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
})
