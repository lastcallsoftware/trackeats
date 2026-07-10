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

/**
 * Formats the recipe total-weight line, e.g. "340 g, 12 oz".
 * Returns null when neither weight is set.
 */
export function formatRecipeSizeLine(
  sizeG: number | null,
  sizeOz: number | null,
): string | null {
  const parts = [
    sizeG != null ? `${sizeG} g` : null,
    sizeOz != null ? `${sizeOz} oz` : null,
  ].filter(Boolean)

  return parts.length ? parts.join(', ') : null
}
