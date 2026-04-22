/**
 * Shared formatting helpers for recipe display across screens and list items.
 */

/**
 * Formats the recipe meta line: total_yield • total calories • price
 * Used on both the Recipe List and Recipe Detail screens.
 */
export function formatRecipeMetaLine(
  totalYield: number,
  totalCalories: number,
  price: number,
): string {
  return `${totalYield} • ${totalCalories} cal • $${price.toFixed(2)}`
}
