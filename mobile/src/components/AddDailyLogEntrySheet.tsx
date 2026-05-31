import React, { useState, useCallback } from 'react'
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
import { IFood } from '@/types/food'
import { IRecipe } from '@/types/recipe'
import { useFoods, filterFoods } from '@/hooks/useFoods'
import { useRecipes, filterRecipes } from '@/hooks/useRecipes'

type MutationState = {
  mutate: (data: any) => void
  isPending: boolean
  isError: boolean
  isSuccess: boolean
  error: { message: string } | null
}

interface AddDailyLogEntrySheetProps {
  visible: boolean
  date: string
  addEntry: MutationState
  onClose: () => void
}

/**
 * AddDailyLogEntrySheet is a modal for adding a new entry to the daily log
 */
export function AddDailyLogEntrySheet({
  visible,
  date,
  addEntry,
  onClose,
}: AddDailyLogEntrySheetProps): React.ReactElement {
  const insets = useSafeAreaInsets()
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const servingStep = 0.5

  const [searchText, setSearchText] = useState('')
  const [searchMode, setSearchMode] = useState<'food' | 'recipe'>('food')
  const [selectedFoodId, setSelectedFoodId] = useState<number | null>(null)
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null)
  const [servingsText, setServingsText] = useState('1')

  const { data: allFoods = [] } = useFoods()
  const { data: allRecipes = [] } = useRecipes()

  const filteredFoods = searchMode === 'food' && searchText.trim() ? filterFoods(allFoods, searchText, null) : []
  const filteredRecipes = searchMode === 'recipe' && searchText.trim() ? filterRecipes(allRecipes, searchText, null) : []

  const handleSearchModeChange = useCallback((mode: 'food' | 'recipe') => {
    setSearchMode(mode)
    setSearchText('')
  }, [])

  const formatServings = useCallback((value: number): string => {
    const rounded = Math.round(value * 100) / 100
    return String(rounded)
  }, [])

  const handleDecreaseServings = useCallback(() => {
    const current = parseFloat(servingsText)
    const safeCurrent = isNaN(current) ? 1 : current
    const next = Math.max(servingStep, safeCurrent - servingStep)
    setServingsText(formatServings(next))
  }, [servingsText, formatServings])

  const handleIncreaseServings = useCallback(() => {
    const current = parseFloat(servingsText)
    const safeCurrent = isNaN(current) ? 1 : current
    const next = safeCurrent + servingStep
    setServingsText(formatServings(next))
  }, [servingsText, formatServings])

  const handleSelectFood = useCallback((food: IFood) => {
    setSelectedFoodId(food.id || null)
    setSelectedRecipeId(null)
    setSearchText('')
  }, [])

  const handleSelectRecipe = useCallback((recipe: IRecipe) => {
    setSelectedRecipeId(recipe.id)
    setSelectedFoodId(null)
    setSearchText('')
  }, [])

  const handleSubmit = useCallback(() => {
    const servings = parseFloat(servingsText)
    if (isNaN(servings) || servings <= 0) {
      Alert.alert('Validation Error', 'Servings must be greater than 0')
      return
    }

    if (selectedFoodId === null && selectedRecipeId === null) {
      Alert.alert('Validation Error', 'Please select a food or recipe')
      return
    }

    if (selectedFoodId !== null && selectedRecipeId !== null) {
      Alert.alert('Validation Error', 'Please select either a food or recipe, not both')
      return
    }

    setHasSubmitted(true)
    addEntry.mutate({
      date,
      food_id: selectedFoodId ?? undefined,
      recipe_id: selectedRecipeId ?? undefined,
      servings,
    })
  }, [servingsText, selectedFoodId, selectedRecipeId, date, addEntry])

  React.useEffect(() => {
    if (visible && hasSubmitted && addEntry.isSuccess) {
      setSearchText('')
      setSearchMode('food')
      setSelectedFoodId(null)
      setSelectedRecipeId(null)
      setServingsText('1')
      setHasSubmitted(false)
      onClose()
    }
  }, [visible, hasSubmitted, addEntry.isSuccess, onClose])

  React.useEffect(() => {
    if (visible) {
      setHasSubmitted(false)
    }
  }, [visible])

  React.useEffect(() => {
    if (visible && hasSubmitted && addEntry.isError && addEntry.error) {
      Alert.alert('Error', addEntry.error.message ?? 'Failed to add entry')
      setHasSubmitted(false)
    }
  }, [visible, hasSubmitted, addEntry.isError, addEntry.error])

  const selectedFood = allFoods.find((f) => f.id === selectedFoodId)
  const selectedRecipe = allRecipes.find((r) => r.id === selectedRecipeId)
  const selectedLabel = selectedFood
    ? `Selected: ${selectedFood.name}`
    : selectedRecipe
      ? `Selected: ${selectedRecipe.name}`
      : null

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add Entry</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Item Type</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segment, styles.segmentLeft, searchMode === 'food' && styles.segmentActive]}
                onPress={() => handleSearchModeChange('food')}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, searchMode === 'food' ? styles.segmentTextActive : styles.segmentTextInactive]}>Food</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segment, styles.segmentRight, searchMode === 'recipe' && styles.segmentActive]}
                onPress={() => handleSearchModeChange('recipe')}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, searchMode === 'recipe' ? styles.segmentTextActive : styles.segmentTextInactive]}>Recipe</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Search</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={searchMode === 'food' ? 'Search foods...' : 'Search recipes...'}
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#999"
            />
            {searchMode === 'food' && filteredFoods.length > 0 && (
              <View style={styles.listContainer}>
                <ScrollView style={styles.resultsScroll} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                  {filteredFoods.map((item) => (
                    <TouchableOpacity
                      key={String(item.id)}
                      style={styles.itemButton}
                      onPress={() => handleSelectFood(item)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.itemText}>{item.name}</Text>
                      <Text style={styles.itemSubtext}>
                        {[item.subtype, item.nutrition?.serving_size_description, item.vendor].filter(Boolean).join(' • ') || '—'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            {searchMode === 'recipe' && filteredRecipes.length > 0 && (
              <View style={styles.listContainer}>
                <ScrollView style={styles.resultsScroll} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                  {filteredRecipes.map((item) => (
                    <TouchableOpacity
                      key={String(item.id)}
                      style={styles.itemButton}
                      onPress={() => handleSelectRecipe(item)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.itemText}>{item.name}</Text>
                      {item.cuisine && <Text style={styles.itemSubtext}>{item.cuisine}</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            {selectedLabel && <Text style={styles.selectedText}>{selectedLabel}</Text>}
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
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose} disabled={addEntry.isPending} activeOpacity={0.7}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.submitButton, addEntry.isPending && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={addEntry.isPending}
            activeOpacity={0.7}
          >
            <Text style={styles.submitButtonText}>{addEntry.isPending ? 'Adding...' : 'Add Entry'}</Text>
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
  segmentedControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 12,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  segmentLeft: {
    borderRightWidth: 1,
    borderRightColor: '#007AFF',
  },
  segmentRight: {
    borderLeftWidth: 0,
  },
  segmentActive: {
    backgroundColor: '#007AFF',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#fff',
  },
  segmentTextInactive: {
    color: '#007AFF',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
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
  listContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
    marginVertical: 8,
  },
  resultsScroll: {
    maxHeight: 280,
  },
  itemButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  itemSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  selectedText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#007AFF',
    paddingTop: 8,
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
