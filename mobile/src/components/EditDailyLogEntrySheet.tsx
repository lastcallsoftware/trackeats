import React, { useState, useEffect } from 'react'
import {
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
 */
export function EditDailyLogEntrySheet({
  visible,
  entry,
  label,
  editEntry,
  onClose,
}: EditDailyLogEntrySheetProps): React.ReactElement {
  const insets = useSafeAreaInsets()
  const [servingsText, setServingsText] = useState('')
  const servingStep = 0.5

  const formatServings = (value: number): string => {
    const rounded = Math.round(value * 100) / 100
    return String(rounded)
  }

  const handleDecreaseServings = () => {
    const current = parseFloat(servingsText)
    const safeCurrent = isNaN(current) ? 1 : current
    const next = Math.max(servingStep, safeCurrent - servingStep)
    setServingsText(formatServings(next))
  }

  const handleIncreaseServings = () => {
    const current = parseFloat(servingsText)
    const safeCurrent = isNaN(current) ? 1 : current
    const next = safeCurrent + servingStep
    setServingsText(formatServings(next))
  }

  useEffect(() => {
    if (entry) {
      setServingsText(String(entry.servings))
    }
  }, [entry, visible])

  const handleSubmit = () => {
    if (!entry) return

    const servings = parseFloat(servingsText)
    if (isNaN(servings) || servings <= 0) {
      Alert.alert('Validation Error', 'Servings must be greater than 0')
      return
    }

    editEntry.mutate({
      id: entry.id,
      servings,
    })
  }

  useEffect(() => {
    if (editEntry.isSuccess) {
      setServingsText('')
      onClose()
    }
  }, [editEntry.isSuccess, onClose])

  useEffect(() => {
    if (editEntry.isError && editEntry.error) {
      Alert.alert('Error', editEntry.error.message ?? 'Failed to edit entry')
    }
  }, [editEntry.isError, editEntry.error])

  if (!entry) {
    return <Modal visible={visible} />
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Edit Entry</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Item</Text>
            <View style={styles.labelContainer}>
              <Text style={styles.labelText}>{label}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Servings</Text>
            <View style={styles.servingsSpinnerRow}>
              <TouchableOpacity style={[styles.servingsSpinnerButton, styles.servingsSpinnerButtonLeft]} onPress={handleDecreaseServings} activeOpacity={0.8}>
                <Text style={styles.servingsSpinnerButtonText}>-</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.servingsSpinnerInput}
                keyboardType="decimal-pad"
                value={servingsText}
                onChangeText={setServingsText}
                placeholderTextColor="#999"
                textAlign="center"
              />

              <TouchableOpacity style={[styles.servingsSpinnerButton, styles.servingsSpinnerButtonRight]} onPress={handleIncreaseServings} activeOpacity={0.8}>
                <Text style={styles.servingsSpinnerButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.buttonContainer, { paddingBottom: Math.max(12, insets.bottom + 8) }]}>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose} disabled={editEntry.isPending} activeOpacity={0.7}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.submitButton, editEntry.isPending && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={editEntry.isPending} activeOpacity={0.7}>
            <Text style={styles.submitButtonText}>{editEntry.isPending ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  servingsSpinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  servingsSpinnerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f6fa',
  },
  servingsSpinnerButtonLeft: {
    borderRightWidth: 1,
    borderRightColor: '#d6dbe1',
  },
  servingsSpinnerButtonRight: {
    borderLeftWidth: 1,
    borderLeftColor: '#d6dbe1',
  },
  servingsSpinnerButtonText: {
    fontSize: 22,
    lineHeight: 24,
    color: '#245a91',
    fontWeight: '700',
  },
  servingsSpinnerInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 10,
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
