import { useEffect, useState } from 'react'

/**
 * Returns a debounced version of any value.
 * Useful for delaying expensive derived work (like list filtering)
 * while keeping controlled inputs responsive.
 */
export function useDebouncedValue<T>(value: T, delayMs = 200): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [value, delayMs])

  return debouncedValue
}
