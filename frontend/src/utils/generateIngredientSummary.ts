import { IFood, IRecipe, INutrition } from "../contexts/DataProvider";

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
        let summary = servings + " x (" + nutrition?.serving_size_description + ") ";
        summary += food.name;
        if (food.subtype) {
            summary += ", " + food.subtype;
        }
        summary +=
            " (" +
            (nutrition.serving_size_oz * servings).toFixed(1) +
            " oz/" +
            (nutrition.serving_size_g * servings).toFixed(1) +
            " g)";
        return summary;
    } else if (recipe) {
        let summary = servings + " x (" + nutrition.serving_size_description + ") ";
        summary += recipe.name + " ";
        summary +=
            "(" +
            (nutrition.serving_size_oz * servings).toFixed(1) +
            " oz/" +
            (nutrition.serving_size_g * servings).toFixed(1) +
            " g)";
        return summary;
    } else {
        return undefined;
    }
}
