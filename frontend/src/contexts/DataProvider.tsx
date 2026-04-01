import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { DataContext } from '@/utils/useData';
import { generateIngredientSummary } from "../utils/generateIngredientSummary";
import { useSnackbar } from '@/utils/useSnackbar';

const AUTH_CHANGED_EVENT = "trackeats-auth-changed"

const getStoredAccessToken = (): string => {
    const storedToken = sessionStorage.getItem("access_token")
    return storedToken ? JSON.parse(storedToken) : ""
}

// The purpose of this component is to provide a context that can be used to share
// data between components.  It wraps the children in a context provider that
// provides data, and functions that can be used to manipulate the data.
// The data is stored in state variables.  Member functions update both the
// back end and the state variables.

export type IPreferences = {
    id?: number
    user_id: number
    context: string
    preferences: Record<string, Record<string,unknown>>
}

export type INutrition = {
    serving_size_description: string
    serving_size_oz: number
    serving_size_g: number
    calories: number
    total_fat_g: number
    saturated_fat_g: number
    trans_fat_g: number
    cholesterol_mg: number
    sodium_mg: number
    total_carbs_g: number
    fiber_g: number
    total_sugar_g: number
    added_sugar_g: number
    protein_g: number
    vitamin_d_mcg: number
    calcium_mg: number
    iron_mg: number
    potassium_mg: number
}

export type IFood = {
    id?: number
    group: string
    vendor: string
    name: string
    subtype: string
    description: string
    size_description: string
    size_oz: number
    size_g: number
    servings: number
    nutrition_id?: number
    nutrition: INutrition
    price: number,
    price_per_serving: number,
    price_per_oz: number,
    price_per_calorie: number,
    price_date: string
    shelf_life: string
}

export type IIngredient = {
    id?: number,
    recipe_id?: number,
    food_ingredient_id?: number,
    recipe_ingredient_id?: number,
    ordinal: number,
    servings: number
    summary?: string,
}

export type IRecipe = {
    id?: number
    cuisine: string
    name: string
    total_yield: string
    servings: number
    nutrition_id?: number
    nutrition: INutrition
    price: number
    price_per_calorie: number
}

export type DataContextType = {
    preferences: Record<string, Record<string, unknown>>;
    foods: IFood[];
    recipes: IRecipe[];
    ingredients: IIngredient[];
    isLoading: boolean;
    setErrorMessage: (msg: string) => void;
    getPreferences: (context: string) => Promise<void>;
    updatePreferences: (context: string, prefs: Record<string, unknown>) => Promise<void>;
    addFood: (food: IFood) => Promise<void>;
    updateFood: (food: IFood) => Promise<void>;
    deleteFood: (food_id: number) => Promise<void>;
    addRecipe: (recipe: IRecipe, ingredients: IIngredient[]) => Promise<number|undefined>;
    updateRecipe: (recipe: IRecipe, ingredients: IIngredient[]) => Promise<void>;
    deleteRecipe: (recipe_id: number) => Promise<void>;
    getIngredients: (recipe_id: number) => Promise<void>;
    addIngredients: (recipe_id: number, ingredients: IIngredient[]) => Promise<void>;
    removeIngredients: (recipe_id: number) => Promise<void>;
}

export const DataProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const [preferences, setPreferences] = useState<Record<string, Record<string, unknown>>>({})
    const [foods, setFoods] = useState<IFood[]>([])
    const [recipes, setRecipes] = useState<IRecipe[]>([])
    const [ingredients, setIngredients] = useState<IIngredient[]>([])
    const [accessToken, setAccessToken] = useState<string>(getStoredAccessToken)
    const { showSnackbar } = useSnackbar();
    const setErrorMessage = useCallback((message: string) => {
        showSnackbar(message, "error")
    }, [showSnackbar]);


    // Store navigate in a ref so it never triggers re-renders or stale
    // dependency issues in useCallback/useEffect.
    const navigateRef = useRef(useNavigate())

    const removeToken = () => {
        sessionStorage.removeItem("access_token")
        setAccessToken("")
        setFoods([])
        setRecipes([])
        setIngredients([])
        setPreferences({})
    }

    // "Loading screen"
    const [isLoading, setLoading] = useState(false)

    // Handle errors that occur when calling the back end.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleError = useCallback((error: any) => {
        console.log(error)
        setLoading(false)
        if (error.response?.status == 401) {
            removeToken()
            navigateRef.current("/login", { state: { message: "Your token has expired and you have been logged out." } });
        }
        else if (error.response)
            setErrorMessage(error.response.data.msg)
        else
            setErrorMessage(error.message)
    }, [setErrorMessage]); // navigateRef is a ref, so it's stable and doesn't need to be a dependency

    useEffect(() => {
        const syncAccessToken = () => {
            const nextAccessToken = getStoredAccessToken()
            setAccessToken(nextAccessToken)

            if (!nextAccessToken) {
                setFoods([])
                setRecipes([])
                setIngredients([])
                setPreferences({})
            }
        }

        window.addEventListener("storage", syncAccessToken)
        window.addEventListener(AUTH_CHANGED_EVENT, syncAccessToken)

        return () => {
            window.removeEventListener("storage", syncAccessToken)
            window.removeEventListener(AUTH_CHANGED_EVENT, syncAccessToken)
        }
    }, [])

    useEffect(() => {
        // If there's no token, state is already initialized to empty defaults — just return.
        if (!accessToken) {
            return;
        }

        // Get Foods
        const getFoods = async (): Promise<void> => {
            try {
                const response = await axios.get<IFood[]>("/api/food", {headers: { "Authorization": "Bearer " + accessToken}})
                setFoods(response.data);
            } catch(error) {
                handleError(error)
            }
        };

        // Get Recipes
        const getRecipes = async (): Promise<void> => {
            try {
                const response = await axios.get<IRecipe[]>("/api/recipe", {headers: { "Authorization": "Bearer " + accessToken}})
                setRecipes(response.data);
            } catch(error) {
                handleError(error)
            }
        };

        const fetchData = async () => {
            setLoading(true)
            await getFoods();
            await getRecipes();
            setLoading(false)
        };

        fetchData();
    }, [accessToken, handleError, setErrorMessage]);


    const getPreferences = useCallback(async (context: string): Promise<void> => {
        try {
            const response = await axios.get<IPreferences>("/api/preferences/" + context, {headers: { "Authorization": "Bearer " + accessToken}})
            setPreferences(prev => ({ ...prev, [context]: response.data.preferences }));
        } catch (error) {
            handleError(error)
        }
    }, [accessToken, handleError])

    const updatePreferences = useCallback(async (context: string, prefs: Record<string, unknown>): Promise<void> => {
        try {
            await axios.put<IPreferences>("/api/preferences/" + context, prefs, {headers: { "Authorization": "Bearer " + accessToken}})
            setPreferences(prev => ({ ...prev, [context]: prefs }));
        } catch (error) {
            handleError(error)
        } 
    }, [accessToken, handleError])

    // Add Food
    const addFood = async (food: IFood): Promise<void> => {
        try {
            const response = await axios.post<IFood>("/api/food", food, {headers: { "Authorization": "Bearer " + accessToken}})
            const newFood = response.data
            setFoods((prev_foods) => [...prev_foods, newFood])
        } catch (error) {
            handleError(error)
        }
    }

    // Update Food
    const updateFood = async (food: IFood): Promise<void> => {
        try {
            await axios.put<IFood>("/api/food", food, {headers: { "Authorization": "Bearer " + accessToken}})
            setFoods(prevItems => prevItems.map(item => {
                if (item.id === food.id) {
                    return food;
                } else {
                    return item;
                }
            }))
        } catch (error) {
            handleError(error)
        }
    }

    // Delete Food
    const deleteFood = async (id: number): Promise<void> => {
        try {
            await axios.delete<void>("/api/food/" + id, {headers: { "Authorization": "Bearer " + accessToken}})
            setFoods(prevItems => prevItems.filter(_item => _item.id != id));
        } catch(error) {
            handleError(error)
        }
    }

    // Add Recipe
    const addRecipe = async (recipe: IRecipe, ingredients: IIngredient[]): Promise<number|undefined> => {
        let recipe_id = undefined
        try {
            const payload = { ...recipe, ingredients };
            const response = await axios.post<IRecipe>("/api/recipe", payload, {headers: { "Authorization": "Bearer " + accessToken}})
            const new_recipe = response.data
            recipe_id = new_recipe.id
            setRecipes((prev_recipes) => [...prev_recipes, new_recipe])
        } catch (error) {
            handleError(error)
        }
        return recipe_id
    }

    // Update Recipe
    const updateRecipe = async (recipe: IRecipe, ingredients: IIngredient[]): Promise<void> => {
        try {
            const payload = { ...recipe, ingredients };
            await axios.put<IRecipe>("/api/recipe", payload, {headers: { "Authorization": "Bearer " + accessToken}})
            setRecipes(prevItems => prevItems.map(item => {
                if (item.id === recipe.id) {
                    return { ...recipe, ingredients };
                } else {
                    return item;
                }
            }))
        } catch (error) {
            handleError(error)
        }
    }

    // Delete Recipe
    const deleteRecipe = async (id: number): Promise<void> => {
        try {
            await axios.delete<void>("/api/recipe/" + id, {headers: { "Authorization": "Bearer " + accessToken}})
            setRecipes(prevItems => prevItems.filter(_item => _item.id != id));
        } catch(error) {
            handleError(error)
        }
    }

    // Get Ingredients
    const getIngredients = async (recipe_id: number): Promise<void> => {
        try {
            const response = await axios.get<IIngredient[]>("/api/recipe/" + recipe_id + "/ingredient", {headers: { "Authorization": "Bearer " + accessToken}})
            const ingredientsWithSummary: IIngredient[] = response.data.map((ing: IIngredient) => {
                let food, recipe, nutrition;
                if (ing.food_ingredient_id) {
                    food = foods.find(f => f.id === ing.food_ingredient_id);
                    nutrition = food?.nutrition;
                } else if (ing.recipe_ingredient_id) {
                    recipe = recipes.find(r => r.id === ing.recipe_ingredient_id);
                    nutrition = recipe?.nutrition;
                }
                if (!nutrition) {
                    throw new Error(`Nutrition record not found for ingredient (id: ${ing.id ?? 'unknown'})`);
                }
                return {
                    ...ing,
                    summary: generateIngredientSummary(nutrition, food, recipe, ing.servings)
                };
            });
            setIngredients(ingredientsWithSummary);
        } catch (error) {
            handleError(error);
        }
    }

    // Add Ingredient(s)
    const addIngredients = async (recipe_id: number, ingredients: IIngredient[]): Promise<void> => {
        try {
            await axios.post<IIngredient>("/api/recipe/" + recipe_id + "/ingredient", ingredients, {headers: { "Authorization": "Bearer " + accessToken}})
        } catch(error) {
            handleError(error)
        }
    }

    // Remove all Ingredients from a Recipe
    const removeIngredients = async (recipe_id: number): Promise<void> => {
        try {
            await axios.delete<void>("/api/recipe/" + recipe_id + "/ingredient", {headers: { "Authorization": "Bearer " + accessToken}})
            setIngredients([])
        } catch(error) {
            handleError(error)
        }
    }

    return (
        <DataContext.Provider value={{ 
            preferences,
            foods, 
            recipes, 
            ingredients,
            isLoading,
            setErrorMessage,
            getPreferences,
            updatePreferences,
            addFood, 
            updateFood, 
            deleteFood,
            addRecipe, 
            updateRecipe, 
            deleteRecipe,
            getIngredients,
            addIngredients,            
            removeIngredients
            }}> 
            {children}
        </DataContext.Provider>
    );
}

