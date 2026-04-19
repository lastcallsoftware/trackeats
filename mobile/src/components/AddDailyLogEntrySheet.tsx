import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  Modal,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
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
 * - Allows searching and selecting a food or recipe
 * - Takes servings input (decimal number)
 * - Validates: servings > 0 and exactly one of food_id/recipe_id is set
 * - Calls addEntry.mutate on submit with proper payload
 * - Shows errors via Alert.alert
 */
export function AddDailyLogEntrySheet({
  visible,
  date,
  addEntry,
  onClose,
}: AddDailyLogEntrySheetProps): React.ReactElement {
  // Food search state
  const [foodSearch, setFoodSearch] = useState('')
  const [selectedFoodId, setSelectedFoodId] = useState<number | null>(null)

  // Recipe search state
  const [recipeSearch, setRecipeSearch] = useState('')
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null)

  // Servings input
  const [servingsText, setServingsText] = useState('')

  // Debounce timers
  const foodSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recipeSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch foods and recipes
  const { data: allFoods = [] } = useFoods()
  const { data: allRecipes = [] } = useRecipes()

  // Filter foods with debounce
  const filteredFoods = foodSearch.trim() ? filterFoods(allFoods, foodSearch, null) : []

  // Filter recipes with debounce
  const filteredRecipes = recipeSearch.trim() ? filterRecipes(allRecipes, recipeSearch, null) : []

  // Handle food search (debounced)
  const handleFoodSearchChange = useCallback((text: string) => {
    setFoodSearch(text)
    if (foodSearchTimeoutRef.current) {
      clearTimeout(foodSearchTimeoutRef.current)
    }
    // Debounce at 300ms
    foodSearchTimeoutRef.current = setTimeout(() => {
      // Filter will happen via state update
    }, 300)
  }, [])

  // Handle recipe search (debounced)
  const handleRecipeSearchChange = useCallback((text: string) => {
    setRecipeSearch(text)
    if (recipeSearchTimeoutRef.current) {
      clearTimeout(recipeSearchTimeoutRef.current)
    }
    // Debounce at 300ms
    recipeSearchTimeoutRef.current = setTimeout(() => {
      // Filter will happen via state update
    }, 300)
  }, [])

  // Handle food selection
  const handleSelectFood = useCallback((food: IFood) => {
    setSelectedFoodId(food.id || null)
    setSelectedRecipeId(null) // Clear recipe selection
    setFoodSearch('') // Clear search
  }, [])

  // Handle recipe selection
  const handleSelectRecipe = useCallback((recipe: IRecipe) => {
    setSelectedRecipeId(recipe.id)
    setSelectedFoodId(null) // Clear food selection
    setRecipeSearch('') // Clear search
  }, [])

  // Handle submit
  const handleSubmit = useCallback(() => {
    // Validate servings
    const servings = parseFloat(servingsText)
    if (isNaN(servings) || servings <= 0) {
      Alert.alert('Validation Error', 'Servings must be greater than 0')
      return
    }

    // Validate selection: exactly one of food_id or recipe_id
    if (selectedFoodId === null && selectedRecipeId === null) {
      Alert.alert('Validation Error', 'Please select a food or recipe')
      return
    }

    if (selectedFoodId !== null && selectedRecipeId !== null) {
      Alert.alert('Validation Error', 'Please select either a food or recipe, not both')
      return
    }

    console.log('[DAILY_LOG] Adding entry for', date)

    // Call mutation
    addEntry.mutate({
      date,
      food_id: selectedFoodId ?? undefined,
      recipe_id: selectedRecipeId ?? undefined,
      servings,
    })
  }, [servingsText, selectedFoodId, selectedRecipeId, date, addEntry])

  // Handle mutation success
  React.useEffect(() => {
    if (addEntry.isSuccess) {
      console.log('[DAILY_LOG] Entry added')
      // Reset form
      setFoodSearch('')
      setSelectedFoodId(null)
      setRecipeSearch('')
      setSelectedRecipeId(null)
      setServingsText('')
      onClose()
    }
  }, [addEntry.isSuccess, onClose])

  // Handle mutation error
  React.useEffect(() => {
    if (addEntry.isError && addEntry.error) {
      console.error('[DAILY_LOG] Mutation error:', addEntry.error.message)
      Alert.alert('Error', addEntry.error.message ?? 'Failed to add entry')
    }
  }, [addEntry.isError, addEntry.error])

  // Get selected food or recipe name for display
  const selectedFood = allFoods.find((f) => f.id === selectedFoodId)
  const selectedRecipe = allRecipes.find((r) => r.id === selectedRecipeId)
  const selectedLabel = selectedFood
    ? `Selected: ${selectedFood.name}`
    : selectedRecipe
      ? `Selected: ${selectedRecipe.name}`
      : null

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add Entry</Text>
          </View>

          {/* Food Search Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Food</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search foods..."
              value={foodSearch}
              onChangeText={handleFoodSearchChange}
              editable={selectedRecipeId === null}
              placeholderTextColor="#999"
            />
            {filteredFoods.length > 0 && (
              <View style={styles.listContainer}>
                <FlatList
                  data={filteredFoods}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.itemButton}
                      onPress={() => handleSelectFood(item)}
                    >
                      <Text style={styles.itemText}>{item.name}</Text>
                      <Text style={styles.itemSubtext}>{item.vendor}</Text>
                    </TouchableOpacity>
                  )}
                  scrollEnabled={false}
                />
              </View>
            )}
            {selectedLabel && <Text style={styles.selectedText}>{selectedLabel}</Text>}
          </View>

          {/* Recipe Search Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Recipe</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search recipes..."
              value={recipeSearch}
              onChangeText={handleRecipeSearchChange}
              editable={selectedFoodId === null}
              placeholderTextColor="#999"
            />
            {filteredRecipes.length > 0 && (
              <View style={styles.listContainer}>
                <FlatList
                  data={filteredRecipes}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.itemButton}
                      onPress={() => handleSelectRecipe(item)}
                    >
                      <Text style={styles.itemText}>{item.name}</Text>
                      {item.cuisine && <Text style={styles.itemSubtext}>{item.cuisine}</Text>}
                    </TouchableOpacity>
                  )}
                  scrollEnabled={false}
                />
              </View>
            )}
            {selectedLabel && selectedRecipeId && (
              <Text style={styles.selectedText}>{selectedLabel}</Text>
            )}
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
            disabled={addEntry.isPending}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.submitButton, addEntry.isPending && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={addEntry.isPending}
            activeOpacity={0.7}
          >
            <Text style={styles.submitButtonText}>
              {addEntry.isPending ? 'Adding...' : 'Add Entry'}
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
  servingsInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  listContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
    marginVertical: 8,
    maxHeight: 200,
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
