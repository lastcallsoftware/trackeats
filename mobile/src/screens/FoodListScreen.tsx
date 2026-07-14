import React, { useMemo, useState } from 'react'
import {
  View,
  FlatList,
  ListRenderItem,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
} from 'react-native'
import { useFoods, filterFoods } from '@/hooks/useFoods'
import { useCatalogFoods, useCopyCatalogFoods } from '@/hooks/useCatalogFoods'
import { FoodGroup, IFood } from '@/types/food'
import { FoodListItem } from '@/components/FoodListItem'
import { SearchBar } from '@/components/SearchBar'
import { GroupFilterTabs } from '@/components/GroupFilterTabs'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

/**
 * Main food browsing screen
 * Displays a searchable, filterable list of foods
 * - Search by name/vendor (debounced filtering)
 * - Filter by food group
 * - Tap to view food detail
 */
export function FoodListScreen(): React.ReactElement {
  const query = useFoods()
  const { data: foods, isLoading, error, refetch } = query
  const [catalogVisible, setCatalogVisible] = useState(false)
  const [catalogSearchText, setCatalogSearchText] = useState('')
  const [catalogPageNumber, setCatalogPageNumber] = useState(1)
  const [catalogSelection, setCatalogSelection] = useState<Set<number>>(new Set())
  const [catalogQueryText, setCatalogQueryText] = useState('')
  const catalogQuery = useCatalogFoods(catalogQueryText, catalogPageNumber, 20)
  const { mutateAsync: copyCatalogFoods, isPending: isCopyingCatalogFoods } = useCopyCatalogFoods()
  const [searchText, setSearchText] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const debouncedSearchText = useDebouncedValue(searchText, 220)

  // Type-safe foods array
  const foodsArray: IFood[] = foods && Array.isArray(foods) ? foods : []

  // Derive filtered list from search + group
  const filteredFoods = useMemo(
    () =>
      filterFoods(
        foodsArray,
        debouncedSearchText,
        selectedGroup as FoodGroup | null
      ),
    [foodsArray, debouncedSearchText, selectedGroup]
  )

  const catalogFoods = catalogQuery.data?.items ?? []
  const catalogTotal = catalogQuery.data?.total ?? 0
  const catalogPageSize = catalogQuery.data?.pageSize ?? 20
  const catalogPageCount = Math.max(1, Math.ceil(catalogTotal / catalogPageSize))

  const runCatalogSearch = () => {
    setCatalogPageNumber(1)
    setCatalogSelection(new Set())
    setCatalogQueryText(catalogSearchText.trim())
  }

  const toggleCatalogSelection = (foodId: number) => {
    setCatalogSelection((prev) => {
      const next = new Set(prev)
      if (next.has(foodId)) {
        next.delete(foodId)
      } else {
        next.add(foodId)
      }
      return next
    })
  }

  const addSelectedCatalogFoods = async () => {
    const selectedIds = Array.from(catalogSelection)
    if (selectedIds.length === 0) {
      Alert.alert('Selection required', 'Please select at least one catalog food to add.')
      return
    }

    try {
      const result = await copyCatalogFoods(selectedIds)
      Alert.alert(
        'Catalog Add Results',
        `Added ${result.created_count}, skipped ${result.skipped_count}, failed ${result.failure_count}.`
      )
      setCatalogSelection(new Set())
      setCatalogVisible(false)
      setCatalogPageNumber(1)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unable to copy selected catalog foods'
      Alert.alert('Catalog add failed', message)
    }
  }

  // Loading state
  if (isLoading && foodsArray.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load foods</Text>
        <Text style={styles.errorMessage}>{error instanceof Error ? error.message : 'Unknown error'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.7}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Empty state (no foods after filtering)
  if (foodsArray.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No foods available</Text>
      </View>
    )
  }

  // Render list
  return (
    <View style={styles.container}>
      <View style={styles.resultsSection}>
        <View style={styles.catalogButtonRow}>
          <TouchableOpacity style={styles.catalogButton} onPress={() => setCatalogVisible(true)} activeOpacity={0.7}>
            <Text style={styles.catalogButtonText}>Add from Catalog</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          style={styles.list}
          stickyHeaderIndices={[0]}
          ListHeaderComponent={
            <View style={styles.stickyHeader}>
              <SearchBar
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search foods..."
              />
              <GroupFilterTabs selected={selectedGroup} onSelect={setSelectedGroup} />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyText}>No foods found</Text>
            </View>
          }
          data={filteredFoods}
          renderItem={({ item }: Parameters<ListRenderItem<IFood>>[0]) => (
            <FoodListItem
              id={item.id!}
              name={item.name}
              subtype={item.subtype}
              vendor={item.vendor}
              calories={item.nutrition.calories}
            />
          )}
          keyExtractor={(item) => String(item.id)}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
        />
      </View>

      <Modal visible={catalogVisible} animationType="slide" onRequestClose={() => setCatalogVisible(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Add Foods from Catalog</Text>

          <View style={styles.modalSearchRow}>
            <TextInput
              style={styles.modalSearchInput}
              value={catalogSearchText}
              onChangeText={setCatalogSearchText}
              placeholder="Search catalog foods"
            />
            <TouchableOpacity style={styles.modalSearchButton} onPress={runCatalogSearch} activeOpacity={0.7}>
              <Text style={styles.modalSearchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>

          {catalogQuery.isLoading ? (
            <View style={styles.modalCenteredRow}>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          ) : null}

          <FlatList
            data={catalogFoods}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const itemId = item.id ?? 0
              const selected = catalogSelection.has(itemId)
              return (
                <TouchableOpacity
                  style={[styles.catalogItemRow, selected ? styles.catalogItemRowSelected : null]}
                  onPress={() => toggleCatalogSelection(itemId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.catalogItemTextWrap}>
                    <Text style={styles.catalogItemName} numberOfLines={1}>
                      {item.name}{item.subtype ? `, ${item.subtype}` : ''}
                    </Text>
                    <Text style={styles.catalogItemMeta} numberOfLines={1}>
                      {item.vendor} - {item.nutrition.calories} cal
                    </Text>
                  </View>
                  <Text style={styles.catalogCheckbox}>{selected ? '[x]' : '[ ]'}</Text>
                </TouchableOpacity>
              )
            }}
          />

          <View style={styles.modalPagerRow}>
            <TouchableOpacity
              style={[styles.modalPagerButton, catalogPageNumber <= 1 ? styles.modalPagerButtonDisabled : null]}
              onPress={() => {
                if (catalogPageNumber > 1) {
                  setCatalogPageNumber(catalogPageNumber - 1)
                  setCatalogSelection(new Set())
                }
              }}
              activeOpacity={0.7}
              disabled={catalogPageNumber <= 1}
            >
              <Text style={styles.modalPagerButtonText}>Prev</Text>
            </TouchableOpacity>

            <Text style={styles.modalPagerText}>Page {catalogPageNumber} / {catalogPageCount}</Text>

            <TouchableOpacity
              style={[styles.modalPagerButton, catalogPageNumber >= catalogPageCount ? styles.modalPagerButtonDisabled : null]}
              onPress={() => {
                if (catalogPageNumber < catalogPageCount) {
                  setCatalogPageNumber(catalogPageNumber + 1)
                  setCatalogSelection(new Set())
                }
              }}
              activeOpacity={0.7}
              disabled={catalogPageNumber >= catalogPageCount}
            >
              <Text style={styles.modalPagerButtonText}>Next</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalActionsRow}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setCatalogVisible(false)} activeOpacity={0.7}>
              <Text style={styles.modalCancelButtonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalAddButton,
                (isCopyingCatalogFoods || catalogSelection.size === 0) ? styles.modalAddButtonDisabled : null,
              ]}
              onPress={addSelectedCatalogFoods}
              activeOpacity={0.7}
              disabled={isCopyingCatalogFoods || catalogSelection.size === 0}
            >
              <Text style={styles.modalAddButtonText}>{isCopyingCatalogFoods ? 'Adding...' : 'Add Selected'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'flex-start',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  resultsSection: {
    flex: 1,
    minHeight: 0,
  },
  stickyHeader: {
    backgroundColor: '#fff',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  catalogButtonRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  catalogButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#1565c0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  catalogButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  modalSearchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  modalSearchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cfd8dc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  modalSearchButton: {
    backgroundColor: '#1565c0',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  modalSearchButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalCenteredRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  catalogItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eceff1',
  },
  catalogItemRowSelected: {
    backgroundColor: '#e3f2fd',
  },
  catalogItemTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  catalogItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#102027',
  },
  catalogItemMeta: {
    marginTop: 3,
    fontSize: 13,
    color: '#546e7a',
  },
  catalogCheckbox: {
    fontSize: 16,
    fontWeight: '700',
    color: '#263238',
  },
  modalPagerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalPagerButton: {
    backgroundColor: '#eceff1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalPagerButtonDisabled: {
    opacity: 0.5,
  },
  modalPagerButtonText: {
    fontWeight: '600',
    color: '#263238',
  },
  modalPagerText: {
    fontSize: 13,
    color: '#455a64',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  modalCancelButton: {
    borderWidth: 1,
    borderColor: '#b0bec5',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalCancelButtonText: {
    color: '#37474f',
    fontWeight: '600',
  },
  modalAddButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalAddButtonDisabled: {
    opacity: 0.5,
  },
  modalAddButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
})
