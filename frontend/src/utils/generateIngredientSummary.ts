import { IFood, IRecipe, INutrition } from "../contexts/DataProvider";

const formatAmount = (value: number, maxDecimals: number = 1): string => {
    const rounded = Number(value.toFixed(maxDecimals));
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

/**
 * Generate a summary string for an ingredient, given its nutrition and source (food or recipe).
 * @param nutrition Nutrition info for the ingredient
 * @param food Optional food object (if this is a food ingredient)
 * @param recipe Optional recipe object (if this is a recipe ingredient)
 * @param servings Number of servings for this ingredient (optional, defaults to 1)
 */
export function generateIngredientSummary(
    nutrition: INutrition,
    food?: IFood,
    recipe?: IRecipe,
    servings: number = 1
): string | undefined {
    if (food) {
        let summary = formatAmount(servings, 4) + " x (" + nutrition?.serving_size_description + ") ";
        summary += food.name;
        if (food.subtype) {
            summary += ", " + food.subtype;
        }
        summary +=
            " (" +
            formatAmount(nutrition.serving_size_oz * servings) +
            " oz/" +
            formatAmount(nutrition.serving_size_g * servings) +
            " g)";
        return summary;
    } else if (recipe) {
        let summary = formatAmount(servings, 4) + " x (" + nutrition.serving_size_description + ") ";
        summary += recipe.name + " ";
        summary +=
            "(" +
            formatAmount(nutrition.serving_size_oz * servings) +
            " oz/" +
            formatAmount(nutrition.serving_size_g * servings) +
            " g)";
        return summary;
    } else {
        return undefined;
    }
}
