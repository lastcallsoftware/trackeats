import { createContext, useContext } from 'react';
import { DataContextType, IDailyLogItem, IFood, INutrition, IRecipe } from '@/contexts/DataProvider';

export const DataContext = createContext<DataContextType | null>(null)

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("useData must be used within a DataProvider");
    }
    return context;
};

export class Nutrition implements INutrition {
    serving_size_description = "";
    serving_size_oz = 0;
    serving_size_g = 0;
    calories = 0;
    total_fat_g = 0;
    saturated_fat_g = 0;
    trans_fat_g = 0;
    cholesterol_mg = 0;
    sodium_mg = 0;
    total_carbs_g = 0;
    fiber_g = 0;
    total_sugar_g = 0;
    added_sugar_g = 0;
    protein_g = 0;
    vitamin_d_mcg = 0;
    calcium_mg = 0;
    iron_mg = 0;
    potassium_mg = 0;
}

export class Food implements IFood {
    group = "";
    name = "";
    subtype = "";
    description = "";
    vendor= "";
    size_description= "";
    size_oz = 0;
    size_g= 0;
    servings = 0;
    nutrition = new Nutrition();
    price = 0;
    price_per_serving = 0;
    price_per_oz = 0;
    price_per_calorie = 0;
    price_date = "";
    shelf_life = "";
}


export class Recipe implements IRecipe {
    cuisine = "";
    name = "";
    total_yield = "";
    servings = 0;
    nutrition = new Nutrition();
    price = 0;
    price_per_calorie = 0;
}


export class DailyLogItem implements IDailyLogItem {
    date = new Date().toISOString().slice(0, 10); // today as "YYYY-MM-DD"
    recipe_id = 0;
    servings = 1;
    price?: number = undefined;
    ordinal = 0;
    notes?: string = undefined;
    nutrition_id?: number = undefined;
    nutrition?: INutrition = undefined;
}
