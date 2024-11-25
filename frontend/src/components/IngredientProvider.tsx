import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export type IIngredient = {
    id?: number
    group: string
    type: string
    subtype: string
    description: string
    vendor: string
    size_description: string
    size_g: number
    servings: number
    nutrition_id?: number
    nutrition: {
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
    price: number
    price_date: string
    shelf_life: string
}

export type IngredientContextType = {
    ingredients: IIngredient[];
    errorMessage: string | null;
    addIngredient: (ingredient: IIngredient) => void;
    updateIngredient: (ingredient: IIngredient) => void;
    deleteIngredient: (id: number) => void;
}

export const IngredientContext = createContext<IngredientContextType|null>(null);

export const IngredientProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
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
        }, [navigate]);

    // Call the back end's "get ingredients" API
    useEffect(() => {
        const getIngredients = async () => {
            axios.get("/ingredient", {headers: { "Authorization": "Bearer " + access_token}})
                .then((response) => {
                    setErrorMessage("");
                    setIngredients(response.data);
                })
                .catch((error) => {
                    handleError(error)
                })
            };
        
        getIngredients();
        }, [access_token, handleError]);

    // Call the back end's "add ingredient" API
    const addIngredient = (ingredient: IIngredient) => {
        axios.post("/ingredient", ingredient, {headers: { "Authorization": "Bearer " + access_token}})
            .then (() => {
                setErrorMessage("");
                // Now add it to our local copy of the ingredients list
                setIngredients([...ingredients, ingredient])
            })
            .catch ((error) => {
                handleError(error)
            })
    }

    // Call the back end's "update ingredient" API
    const updateIngredient = (ingredient: IIngredient) => {
        axios.put("/ingredient", ingredient, {headers: { "Authorization": "Bearer " + access_token}})
            .then (() => {
                setErrorMessage("");
                // Now update our local copy of the ingredient in our local ingedients list
                setIngredients(prevItems => prevItems.map(item => {
                    if (item.id === ingredient.id) {
                      return ingredient;
                    } else {
                      return item;
                    }
                }))
            })
            .catch ((error) => {
                handleError(error)
            })
    }

    // Call the back end's "delete ingredient" API
    const deleteIngredient = (id: number) => {
        axios.delete("/ingredient/" + id, {headers: { "Authorization": "Bearer " + access_token}})
            .then(() => {
                setErrorMessage("");
                // Now remove it from our local ingredients list
                setIngredients(prevItems => prevItems.filter(_item => _item.id != id));
            })
            .catch((error) => {
                handleError(error)
            })
    }

    return (
        <IngredientContext.Provider value={{ ingredients, errorMessage, addIngredient, updateIngredient, deleteIngredient }}>
            {children}
        </IngredientContext.Provider>
    );
}
