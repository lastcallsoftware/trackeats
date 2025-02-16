import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// The purpose of this component is to provide a context that can be used to share
// data between components.  It wraps the children in a context provider that
// provides the data and functions that can be used to manipulate the data.
// The data is stored in state variables, which are updated by calling the back end
// to get the data, or by calling the back end to add, update, or delete data.
// The data is shared with the children via the context.


export type INutrition = {
    serving_size_description: string
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
    size_g: number
    servings: number
    nutrition_id?: number
    nutrition: INutrition
    price: number
    price_date: string
    shelf_life: string
}

export type IIngredient = {
    id: number,
    name: string,
    servings: number
}

export type IRecipe = {
    id?: number
    cuisine: string
    name: string
    total_yield: string
    servings: number
    food_ingredients: IIngredient[]
    recipe_ingredients: IIngredient[]
    nutrition_id?: number
    nutrition: INutrition
}

export type DataContextType = {
    foods: IFood[];
    recipes: IRecipe[];
    errorMessage: string | null;
    addFood: (food: IFood) => void;
    updateFood: (food: IFood) => void;
    deleteFood: (id: number) => void;
    addRecipe: (recipe: IRecipe) => void;
    updateRecipe: (recipe: IRecipe) => void;
    deleteRecipe: (id: number) => void;
    addFoodIngredient: (recipe_id: number, ingredient_id: number, name: string, servings: number) => void;
    addRecipeIngredient: (recipe_id: number, ingredient_id: number, name: string, servings: number) => void;
    updateFoodIngredient: (recipe_id: number, ingredient_id: number, name: string, servings: number) => void;
    updateRecipeIngredient: (recipe_id: number, ingredient_id: number, name: string, servings: number) => void;
    removeFoodIngredient: (recipe_id: number, ingredient_id: number) => void;
    removeRecipeIngredient: (recipe_id: number, ingredient_id: number) => void;
}

export const DataContext = createContext<DataContextType|null>(null);

export const DataProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const [foods, setFoods] = useState<IFood[]>([])
    const [recipes, setRecipes] = useState<IRecipe[]>([])
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
        }, [navigate]);

    // Call the back end's "get foods" and "get recipes" APIs
    useEffect(() => {
        const getFoods = async () => {
            axios.get("/food", {headers: { "Authorization": "Bearer " + access_token}})
                .then((response) => {
                    setErrorMessage("");
                    setFoods(response.data);
                })
                .catch((error) => {
                    handleError(error)
                })
            };

        const getRecipes = async () => {
            axios.get("/recipe", {headers: { "Authorization": "Bearer " + access_token}})
                .then((response) => {
                    setErrorMessage("");
                    setRecipes(response.data);
                })
                .catch((error) => {
                    handleError(error)
                })
            };            

        getFoods();
        getRecipes();
        }, [access_token, handleError]);

    // Call the back end's "add food" API
    const addFood = (food: IFood) => {
        axios.post("/food", food, {headers: { "Authorization": "Bearer " + access_token}})
            .then (() => {
                setErrorMessage("");
                // Now add it to our local copy of the foods list
                setFoods([...foods, food])
            })
            .catch ((error) => {
                handleError(error)
            })
    }

    // Call the back end's "update food" API
    const updateFood = (food: IFood) => {
        axios.put("/food", food, {headers: { "Authorization": "Bearer " + access_token}})
            .then (() => {
                setErrorMessage("");
                // Now update our local copy of the food in our local foods list
                setFoods(prevItems => prevItems.map(item => {
                    if (item.id === food.id) {
                      return food;
                    } else {
                      return item;
                    }
                }))
            })
            .catch ((error) => {
                handleError(error)
            })
    }

    // Call the back end's "delete food" API
    const deleteFood = (id: number) => {
        axios.delete("/food/" + id, {headers: { "Authorization": "Bearer " + access_token}})
            .then(() => {
                setErrorMessage("");
                // Now remove it from our local foods list
                setFoods(prevItems => prevItems.filter(_item => _item.id != id));
            })
            .catch((error) => {
                handleError(error)
            })
    }

    // Call the back end's "add recipe" API
    const addRecipe = (recipe: IRecipe) => {
        axios.post("/recipe", recipe, {headers: { "Authorization": "Bearer " + access_token}})
            .then (() => {
                setErrorMessage("");
                // Now add it to our local copy of the recipes list
                setRecipes([...recipes, recipe])
            })
            .catch ((error) => {
                handleError(error)
            })
    }

    // Call the back end's "update recipe" API
    const updateRecipe  = (recipe: IRecipe) => {
        axios.put("/recipe", recipe, {headers: { "Authorization": "Bearer " + access_token}})
            .then (() => {
                setErrorMessage("");
                // Now update our local copy of the recipe in our local recipes list
                setRecipes(prevItems => prevItems.map(item => {
                    if (item.id === recipe.id) {
                      return recipe;
                    } else {
                      return item;
                    }
                }))
            })
            .catch ((error) => {
                handleError(error)
            })
    }

    // Call the back end's "delete recipe" API
    const deleteRecipe = (id: number) => {
        axios.delete("/recipe/" + id, {headers: { "Authorization": "Bearer " + access_token}})
            .then(() => {
                setErrorMessage("");
                // Now remove it from our local recipes list
                setRecipes(prevItems => prevItems.filter(_item => _item.id != id));
            })
            .catch((error) => {
                handleError(error)
            })
    }

    // Call the back end's "add food ingredient" API
    const addFoodIngredient = (recipe_id: number, ingredient_id: number, name: string, servings: number) => {
        axios.post("/recipe/" + recipe_id + "/foodingredient/" + ingredient_id + "/" + servings, {headers: { "Authorization": "Bearer " + access_token}})
        .then(() => {
            setErrorMessage("");
            // Now add it to our local recipe
            setRecipes(prevItems => prevItems.map(item => {
                if (item.id === recipe_id) {
                    item.food_ingredients.push({id: ingredient_id, name: name, servings: servings})
                    return item;
                } else {
                    return item;
                }
            }))            
        })
        .catch((error) => {
            handleError(error)
        })
    }

    // Call the back end's "add recipe ingredient" API
    const addRecipeIngredient = (recipe_id: number, ingredient_id: number, name: string, servings: number) => {
        axios.post("/recipe/" + recipe_id + "/recipeingredient/" + ingredient_id + "/" + servings, {headers: { "Authorization": "Bearer " + access_token}})
        .then(() => {
            setErrorMessage("");
            // Now add it to our local recipe
            setRecipes(prevItems => prevItems.map(item => {
                if (item.id === recipe_id) {
                    item.recipe_ingredients.push({id: ingredient_id, name: name, servings: servings})
                    return item;
                } else {
                    return item;
                }
            }))            
        })
        .catch((error) => {
            handleError(error)
        })
    }

    // Call the back end's "update food ingredient" API
    const updateFoodIngredient = (recipe_id: number, ingredient_id: number, name: string, servings: number) => {
        axios.put("/recipe/" + recipe_id + "/foodingredient/" + ingredient_id + "/" + servings, {headers: { "Authorization": "Bearer " + access_token}})
        .then(() => {
            setErrorMessage("");
            // Now update it in our local recipe
            setRecipes(prevItems => prevItems.map(item => {
                if (item.id === recipe_id) {
                    const ingredient = item.recipe_ingredients.find(element => element.id = ingredient_id)
                    if (ingredient != null) {
                        ingredient.name = name
                        ingredient.servings = servings
                    }
                    return item;
                } else {
                    return item;
                }
            }))            
        })
        .catch((error) => {
            handleError(error)
        })
    }

    // Call the back end's "update recipe ingredient" API
    const updateRecipeIngredient = (recipe_id: number, ingredient_id: number, name: string, servings: number) => {
        axios.put("/recipe/" + recipe_id + "/recipeingredient/" + ingredient_id + "/" + servings, {headers: { "Authorization": "Bearer " + access_token}})
        .then(() => {
            setErrorMessage("");
            // Now update it in our local recipe
            setRecipes(prevItems => prevItems.map(item => {
                if (item.id === recipe_id) {
                    const ingredient = item.food_ingredients.find(element => element.id = ingredient_id)
                    if (ingredient != null) {
                        ingredient.name = name
                        ingredient.servings = servings
                    }
                    return item;
                } else {
                    return item;
                }
            }))            
        })
        .catch((error) => {
            handleError(error)
        })
    }

    // Call the back end's "remove food ingredient" API
    const removeFoodIngredient = (recipe_id: number, ingredient_id: number) => {
        axios.delete("/recipe/" + recipe_id + "/foodingredient/" + ingredient_id, {headers: { "Authorization": "Bearer " + access_token}})
        .then(() => {
            setErrorMessage("");
            // Now remove it from our local recipe
            setRecipes(prevItems => prevItems.map(item => {
                if (item.id === recipe_id) {
                    item.food_ingredients = item.food_ingredients.filter(element => element.id != ingredient_id)
                    return item;
                } else {
                    return item;
                }
            }))            
        })
        .catch((error) => {
            handleError(error)
        })
    }

    // Call the back end's "remove recipe ingredient" API
    const removeRecipeIngredient = (recipe_id: number, ingredient_id: number) => {
        axios.delete("/recipe/" + recipe_id + "/recipeingredient/" + ingredient_id, {headers: { "Authorization": "Bearer " + access_token}})
        .then(() => {
            setErrorMessage("");
            // Now remove it from our local recipe
            setRecipes(prevItems => prevItems.map(item => {
                if (item.id === recipe_id) {
                    item.recipe_ingredients = item.recipe_ingredients.filter(element => element.id != ingredient_id)
                    return item;
                } else {
                    return item;
                }
            }))            
        })
        .catch((error) => {
            handleError(error)
        })
    }

    return (
        <DataContext.Provider value={{ 
            foods, 
            recipes, 
            errorMessage, 
            addFood, 
            updateFood, 
            deleteFood, 
            addRecipe, 
            updateRecipe, 
            deleteRecipe,
            addFoodIngredient,
            addRecipeIngredient,
            updateFoodIngredient,
            updateRecipeIngredient,
            removeFoodIngredient,
            removeRecipeIngredient }}> 
            {children}
        </DataContext.Provider>
    );
}
