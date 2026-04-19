import { memo, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'

interface FoodListItemProps {
  id: number
  name: string
  vendor: string
  calories: number
}

export const FoodListItem = memo(function FoodListItem({ id, name, vendor, calories }: FoodListItemProps) {
  const router = useRouter()
  const handlePress = useCallback(() => {
    router.push(`/(foods)/${id}`)
  }, [id, router])

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.vendor} numberOfLines={1}>
            {vendor}
          </Text>
        </View>
        <Text style={styles.calories}>{calories} cal</Text>
      </View>
    </TouchableOpacity>
  )
})

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  vendor: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  calories: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    minWidth: 70,
    textAlign: 'right',
  },
})
