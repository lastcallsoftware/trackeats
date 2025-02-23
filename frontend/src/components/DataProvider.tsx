import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// The purpose of this component is to provide a context that can be used to share
// data between components.  It wraps the children in a context provider that
// provides data, and functions that can be used to manipulate the data.
// The data is stored in state variables.  Member functions update both the
// back end and the state variables.

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
    price: number
    price_date: string
    shelf_life: string
}

export type IIngredient = {
    id?: number,
    recipe_id?: number,
    food_ingredient_id?: number,
    recipe_ingredient_id?: number,
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
}

export type DataContextType = {
    foods: IFood[];
    recipes: IRecipe[];
    ingredients: IIngredient[];
    errorMessage: string | null;
    addFood: (food: IFood) => Promise<void>;
    updateFood: (food: IFood) => Promise<void>;
    deleteFood: (food_id: number) => Promise<void>;
    addRecipe: (recipe: IRecipe) => Promise<number|undefined>;
    updateRecipe: (recipe: IRecipe) => Promise<void>;
    deleteRecipe: (recipe_id: number) => Promise<void>;
    getIngredients: (recipe_id: number) => Promise<void>;
    addIngredients: (recipe_id: number, ingredients: IIngredient[]) => Promise<void>;
    removeIngredients: (recipe_id: number) => Promise<void>;
}

export const DataContext = createContext<DataContextType|null>(null);

export const DataProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const [foods, setFoods] = useState<IFood[]>([])
    const [recipes, setRecipes] = useState<IRecipe[]>([])
    const [ingredients, setIngredients] = useState<IIngredient[]>([])
    const [errorMessage, setErrorMessage] = useState<string|null>(null)
    const navigate = useNavigate()

    // Token management
	const tok = sessionStorage.getItem("access_token")
	const access_token = tok ? JSON.parse(tok) : ""

    const removeToken = () => {
        sessionStorage.removeItem("access_token")
    }

    // Handle errors that occur when calling the back end.
    // Not sure if the navigate() call is kosher here.
    // Actually I'm not even sure if having this separate error handler function
    // is kosher.  We'll see!
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleError = useCallback((error: any) => {
        console.log(error)
        if (error.status == 401) {
            removeToken()
            navigate("/login", { state: { message: "Your token has expired and you have been logged out." } });
        }
        else if (error.response)
            setErrorMessage(error.response.data.msg)
        else
            setErrorMessage(error.message)

        // NOTE: CONSIDER OMTTING NAVIGATE FROM THE DEPENDENCY LIST!
        // This is technically incorrect.  However, keeping it in the list causes a re-render of
        // the component -- and a subsequent refresh of the entire dataset -- EVERY TIME
        // you navigate() to a different page, a colossal waste of bandwidth and time.
        // Plus, from what I understand, navigate's dependncies change only in certain very
        // specific circumstances, which I don't THINK apply here.
        // UPDATE: Seems the page doesn't update when the user adds a record if you omit the
        // dependency, so I guess it stays in... for now. :/  Further research required.
        }, [navigate]);

    useEffect(() => {
        // Get Foods
        const getFoods = async (): Promise<void> => {
            setErrorMessage("");
            try {
                // Get the Food record from the back end.
                const response = await axios.get("/food", {headers: { "Authorization": "Bearer " + access_token}})

                // Add the response data to the Foods list state variable.
                setFoods(response.data);
            } catch(error) {
                handleError(error)
            }
        };

        // Get Recipes
        const getRecipes = async (): Promise<void> => {
            setErrorMessage("");
            try {
                // Get the Recipe record from the back end.
                const response = await axios.get("/recipe", {headers: { "Authorization": "Bearer " + access_token}})

                // Add the response data to the Recipes list state variable.
                setRecipes(response.data);
            } catch(error) {
                handleError(error)
            }
        };

        // The functions are defined above, but we still have to call them.
        getFoods();
        getRecipes();
    }, [access_token, handleError]);

    // Add Food
    const addFood = async (food: IFood): Promise<void> => {
        setErrorMessage("");
        try {
            // Add the Food record to the back end.
            await axios.post("/food", food, {headers: { "Authorization": "Bearer " + access_token}})

            // Add it to the Foods list state variable.
            setFoods([...foods, food])
        } catch (error) {
            handleError(error)
        }
    }

    // Update Food
    const updateFood = async (food: IFood): Promise<void> => {
        setErrorMessage("");
        try {
            // Update the Food record on the back end.
            await axios.put("/food", food, {headers: { "Authorization": "Bearer " + access_token}})

            // Update it in the Foods list state variable.
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
        setErrorMessage("");
        try {
            // Delete the Food record from the back end.
            await axios.delete("/food/" + id, {headers: { "Authorization": "Bearer " + access_token}})

            // Remove it from the Foods list state variable.
            setFoods(prevItems => prevItems.filter(_item => _item.id != id));
        } catch(error) {
            handleError(error)
        }
    }

    // Add Recipe
    const addRecipe = async (recipe: IRecipe): Promise<number|undefined> => {
        let recipe_id = undefined
        setErrorMessage("");
        try {
            // Save the new recipe to the back end.
            const response1 = await axios.post("/recipe", recipe, {headers: { "Authorization": "Bearer " + access_token}})

            // Retrieve the newly created Recipe using the URL provided in 
            // the Location header in the response to the previous call.
            const response2 = await axios.get(response1.headers["location"], {headers: { "Authorization": "Bearer " + access_token}})
            recipe_id = response2.data.id

            // Add the new Recipe to the recipes list state varaible.
            setRecipes([...recipes, response2.data])
        } catch (error) {
            handleError(error)
        }
        return recipe_id
    }

    // Update Recipe
    const updateRecipe = async (recipe: IRecipe): Promise<void> => {
        setErrorMessage("");
        try {
            // Update the Recipe on the back end.
            await axios.put("/recipe", recipe, {headers: { "Authorization": "Bearer " + access_token}})

            // Update it in the Recipes list state variable.
            setRecipes(prevItems => prevItems.map(item => {
                if (item.id === recipe.id) {
                    return recipe;
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
        setErrorMessage("");
        try {
            // Delete the Recipe from the back end.
            await axios.delete("/recipe/" + id, {headers: { "Authorization": "Bearer " + access_token}})

            // Remove it from the Recipes list state variable.
            setRecipes(prevItems => prevItems.filter(_item => _item.id != id));
        } catch(error) {
            handleError(error)
        }
    }

    // Get Ingredients
    const getIngredients = async (recipe_id: number): Promise<void> => {
        setErrorMessage("");
        try {
            // Get the Ingredient records from the back end
            const response = await axios.get("/recipe/" + recipe_id + "/ingredient", {headers: { "Authorization": "Bearer " + access_token}})

            // Put the return value the Ingredients list state variable
            setIngredients(response.data);
        } catch (error) {
             handleError(error)
        }
    }

    // Add Ingredient(s)
    const addIngredients = async (recipe_id: number, ingredients: IIngredient[]): Promise<void> => {
        setErrorMessage("");
        try {
            // Add Ingredient records to the back end.
            await axios.post("/recipe/" + recipe_id + "/ingredient", ingredients, {headers: { "Authorization": "Bearer " + access_token}})

            // Add them to the Ingredients list state variable.
            // NOTE: It's assumed that the state variable is where we got the data we just sent,
            // so this step isn't necessary in this one case.
        } catch(error) {
            handleError(error)
        }
    }

    // Remove all Ingredients from a Recipe
    const removeIngredients = async (recipe_id: number): Promise<void> => {
        setErrorMessage("");
        try {
            // Delete the Inggredients from the back end.
            await axios.delete("/recipe/" + recipe_id + "/ingredient", {headers:  { "Authorization": "Bearer " + access_token}})

            // Delete them from the Ingredients state variable.
            setIngredients([])
        } catch(error) {
            handleError(error)
        }
    }

    return (
        <DataContext.Provider value={{ 
            foods, 
            recipes, 
            ingredients,
            errorMessage, 
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
