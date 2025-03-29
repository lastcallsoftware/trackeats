import { useContext, useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom";
import { IFood, IRecipe, DataContext, IIngredient, INutrition } from "./DataProvider";
import { cuisines } from "./Cuisines";
import { IconContext } from "react-icons";
import { MdKeyboardDoubleArrowLeft, MdKeyboardDoubleArrowRight, MdEdit, MdKeyboardArrowUp, MdKeyboardArrowDown } from "react-icons/md";
import FoodsTable from "./FoodsTable";
import RecipesTable from "./RecipesTable";
import IngredientsTable from "./IngredientsTable";
import axios from 'axios';
import { Tooltip } from "./ui/tooltip";

function RecipeForm() {
    const location = useLocation();
    const navigate = useNavigate()

    // Set the (default) form data.
    const emptyFormData: IRecipe = {
        cuisine: "", 
        name: "",
        total_yield: "",
        servings: 0,
        nutrition: {
            serving_size_description: "", serving_size_oz: 0, serving_size_g: 0,
            calories: 0, total_fat_g: 0, saturated_fat_g: 0, trans_fat_g: 0,
            cholesterol_mg: 0, sodium_mg: 0, total_carbs_g: 0, fiber_g: 0, total_sugar_g: 0, added_sugar_g: 0,
            protein_g: 0, vitamin_d_mcg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0,
        },
        price: 0
    }
    // location.state is non-null only if it has been set manually, and that's 
    // the case only when the user clicked the Edit button on the FoodPage.
    // Otherwise they clicked the New button.
    const isEdit = (location.state != null);
    // Again, the location.state is set when the user clicked the Edit button.
    // The syntax below is quite clever: if location.state IS NOT null, the
    // OR condition short-circuits and the part after the || is never evaluated.
    // If location.state IS null, the ? makes the first half of the condition
    // evaluate to null, so the second half of the condition is evaluated.
    // The net effect is that if we come in on an Edit, the defaultFormData
    // is the data we're editing; otherwise it's the emptyFormData.
    const defaultFormData = location.state?.recipe || emptyFormData;
    const [formData, setFormData] = useState<IRecipe>(defaultFormData);

    // Get the DataContext, which we need to access the data and call the APIs
    // we need to call to update the back end.
    const context = useContext(DataContext)
    if (!context)
        throw Error("useDataContext can only be used inside a DataProvider")

    const [errorMessage, setErrorMessage] = useState(context.errorMessage)

    // State for the selected row in the Ingredients list
    // For this table, rather than the row ID, we use a tuple of the record's 
    // food_ingredient_id and recipe_ingredient_id, which are guaranteed to
    // be unique for a given Recipe.  This is because new Ingredients do not
    // have any row ID until the record is saved, so it can't be used to
    // search for a record.
    const [selectedIngredientRowId, setSelectedIngredientRowId] = useState<number[]|null>(null)
    
    // State for the ingredient servings, which tells us how many servings of
    // the selected Ingredient to add to the Recipe when the user clicks Add.
    const [ingredientServings, setIngredientServings] = useState<number>(1)

    // State for which type of Ingredient list is selected: Foods or Recipes
    const IngredientTypes = {FOOD_INGREDIENTS: "foodIngredients", RECIPE_INGREDENTS: "recipeIngedients"}
    const [selectedIngredientList, setSelectedIngredientList] = useState(IngredientTypes.FOOD_INGREDIENTS)

    // State for the selected row in whichever Food or Recipe Ingredients list is currently shown
    const [selectedFoodOrRecipeRowId, setSelectedFoodOrRecipeRowId] = useState<number|null>(null)

    const saveIsDisabled = false;

    // State for the current list of Ingredients for this Recipe
    const [ingredients, setIngredients] = useState<IIngredient[]>([])

    const handleSubmit = async (e: { preventDefault: () => void; }) => {
        // Prevent default behavior for form submission (namely, sending the form to the server)
        e.preventDefault();

        // Save the Recipe to the database
        let recipe_id: number|undefined|void = -1;
        if (isEdit) {
            await context.updateRecipe(formData);
            recipe_id = formData.id;
        } else {
            recipe_id = await context.addRecipe(formData);
        }

        // We should ALWAYS have a recipe_id at this point
        if (recipe_id) {
            // Remove all previous ingredients for this Recipe
            await context.removeIngredients(recipe_id);

            // Add the new Ingredients
            await context.addIngredients(recipe_id, ingredients);
        } else {
            setErrorMessage("Error saving Recipe: recipe_id is undefined")
        }

        // Return to the Recipes page
        navigate("/recipes")
    }

    const handleCancel = (e: { preventDefault: () => void; }) => {
        e.preventDefault();

        // Return to the Recipes page
        navigate("/recipes", { state: { } })
    }

    // Generate a summary for the Ingredient
    const generateSummary = (nutrition: INutrition, food: IFood|undefined = undefined, recipe: IRecipe|undefined = undefined): string|undefined => {
        if (food) {
            let summary = ingredientServings + " x (" + nutrition?.serving_size_description + ") "
            summary += food.name
            if (food.subtype) {
                summary += ", " + food.subtype
            }
            summary += " (" + (nutrition.serving_size_oz * ingredientServings).toFixed(1) + " oz/" + 
                                (nutrition.serving_size_g * ingredientServings).toFixed(1) + " g)"
            return summary
        } else if (recipe) {
            // Generate a summary for the Ingredient
            let summary = ingredientServings + " x (" + nutrition.serving_size_description + ") "
            summary += recipe.name + " "
            summary += "(" + (nutrition.serving_size_oz * ingredientServings).toFixed(1) + " oz/" + 
                            (nutrition.serving_size_g * ingredientServings).toFixed(1) + " g)"
            return summary
        } else {
            setErrorMessage("Neither a food nor a recipe was provided for ths Ingredient")
            return undefined
        }
    }

    // Update the Recipe's nutrition information
    const updateNutrition = (nutritionA: INutrition, nutritionB: INutrition, servings: number, modifier: number): void => {
        nutritionA.calories         += nutritionB.calories * servings * modifier;
        nutritionA.total_fat_g      += nutritionB.total_fat_g * servings * modifier;
        nutritionA.saturated_fat_g  += nutritionB.saturated_fat_g * servings * modifier;
        nutritionA.trans_fat_g      += nutritionB.trans_fat_g * servings * modifier;
        nutritionA.cholesterol_mg   += nutritionB.cholesterol_mg * servings * modifier;
        nutritionA.sodium_mg        += nutritionB.sodium_mg * servings * modifier;
        nutritionA.total_carbs_g    += nutritionB.total_carbs_g * servings * modifier;
        nutritionA.fiber_g          += nutritionB.fiber_g * servings * modifier;
        nutritionA.total_sugar_g    += nutritionB.total_sugar_g * servings * modifier;
        nutritionA.added_sugar_g    += nutritionB.added_sugar_g * servings * modifier;
        nutritionA.protein_g        += nutritionB.protein_g * servings * modifier;
        nutritionA.vitamin_d_mcg    += nutritionB.vitamin_d_mcg * servings * modifier;
        nutritionA.calcium_mg       += nutritionB.calcium_mg * servings * modifier;
        nutritionA.iron_mg          += nutritionB.iron_mg * servings * modifier;
        nutritionA.potassium_mg     += nutritionB.potassium_mg * servings * modifier;
    }

    const addIngredient = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        if (!selectedFoodOrRecipeRowId)
            return

        let nutrition:INutrition|null = null;
        let modifier:number = 1;
        let ingredient_serving_price = 0;

        if (selectedIngredientList === IngredientTypes.FOOD_INGREDIENTS) {
            // Find the Food record with the specified ID (this should always succeed)
            const food:IFood|undefined = context.foods.find((item:IFood) => item.id == selectedFoodOrRecipeRowId);
            if (!food) {
                setErrorMessage("Food " + selectedFoodOrRecipeRowId + " not found")
                return
            }
            nutrition = food.nutrition
            const summary = generateSummary(food.nutrition, food, undefined)
            ingredient_serving_price = food.price/food.servings

            // Add the Food Ingredient to the Recipe's ingredients list
            ingredients.push({food_ingredient_id: food.id, ordinal: ingredients.length, servings: ingredientServings, summary: summary});
        } else {
            // Find the Recipe record with the specified ID (this should always succeed)
            const recipe:IRecipe|undefined = context.recipes.find((item:IRecipe) => item.id == selectedFoodOrRecipeRowId);
            if (!recipe) {
                setErrorMessage("Recipe " + selectedFoodOrRecipeRowId + " for Ingredient not found")
                return
            }
            nutrition = recipe.nutrition
            const summary = generateSummary(recipe.nutrition, undefined, recipe)
            modifier = 1/recipe.servings
            ingredient_serving_price = recipe.price/recipe.servings

            // Add the Recipe Ingredient to the Recipe's ingredients list
            ingredients.push({recipe_ingredient_id: recipe.id, ordinal: ingredients.length, servings: ingredientServings, summary: summary});
        }

        // Update the Recipe's nutrition information
        updateNutrition(formData.nutrition, nutrition, ingredientServings, modifier)
        // ...and also the price data
        formData.price += ingredient_serving_price * ingredientServings

        // Set the state variables to themselves.  This is necessary to 
        // trigger a re-render.
        // And yes, we need to call both to re-render both parts of the UI.
        setIngredients([...ingredients]);
        setFormData({...formData});
    }

    const updateIngredient = (e: { preventDefault: () => void; }) => {
        e.preventDefault();

        if (!selectedIngredientRowId)
            return

        let summary: string|undefined = undefined
        let food: IFood|undefined = undefined
        let recipe: IRecipe|undefined = undefined
        let nutrition:INutrition|undefined = undefined;
        let modifier: number = 1;
        let ingredient_serving_price = 0;

        // Get the Ingredient record
        const ingredient:IIngredient|undefined = ingredients.find((item:IIngredient) => item.food_ingredient_id === selectedIngredientRowId[0] && item.recipe_ingredient_id === selectedIngredientRowId[1]);
        if (!ingredient) {
            setErrorMessage("Ingredient not found")
            return
        }

        // Get the Food/Recipe and Nutrition records for this Ingredient
        if (ingredient.food_ingredient_id) {
            food = context.foods.find((item:IFood) => item.id == ingredient.food_ingredient_id);
            if (!food) {
                setErrorMessage("Food " + ingredient.food_ingredient_id + " for Ingredient not found")
                return
            }
            nutrition = food.nutrition
            ingredient_serving_price = food.price/food.servings
        } else if (ingredient.recipe_ingredient_id) {
            recipe = context.recipes.find((item:IRecipe) => item.id === ingredient.recipe_ingredient_id);
            if (!recipe) {
                setErrorMessage("Recipe " + ingredient.recipe_ingredient_id + " for Ingredient not found")
                return
            }
            nutrition = recipe.nutrition
            modifier = 1/recipe.servings
            ingredient_serving_price = recipe.price/recipe.servings
        }
        if (!nutrition) {
            setErrorMessage("Nutrition record for Ingredient not found")
            return
        }

        // Generate the summary for this Ingedient using the new serving total
        summary = generateSummary(nutrition, food, recipe)

        // Update the Nutrition data for the Recipe
        updateNutrition(formData.nutrition, nutrition, ingredientServings - ingredient.servings, modifier)
        // ...and also the price data
        formData.price += ingredient_serving_price * (ingredientServings - ingredient.servings)

        // Update the Ingredients state variable, which will trigger a re-render
        setIngredients((prevItems) =>
            prevItems.map((item) =>
                item.food_ingredient_id === selectedIngredientRowId[0] && item.recipe_ingredient_id === selectedIngredientRowId[1] ? 
                    {...item, summary: summary, servings: ingredientServings} : item))
    }

    const removeIngredient = (e: { preventDefault: () => void; }) => {
        e.preventDefault();

        if (!selectedIngredientRowId)
            return

        // Find the Ingredient record with the selected ID (this should always succeed)
        let modifier:number = -1;
        const ingredient:IIngredient|undefined = ingredients.find((item:IIngredient) => item.food_ingredient_id === selectedIngredientRowId[0] && item.recipe_ingredient_id === selectedIngredientRowId[1]);
        if (!ingredient) {
            setErrorMessage("Unable to find Ingredient " + selectedIngredientRowId[0] + "/" + selectedIngredientRowId[1])
            return
        }

        // Get the nutrition information for the selected Ingredient
        let nutrition: INutrition|null = null;
        if (ingredient.food_ingredient_id) {
            // Find the Food record with the specified ID (this should always succeed)
            const food:IFood|undefined = context.foods.find((item:IFood) => item.id === ingredient.food_ingredient_id);
            if (!food) {
                setErrorMessage("Food " + ingredient.food_ingredient_id + " not found.")
                return
            }
            nutrition = food.nutrition
            formData.price -= food.price * ingredient.servings/food.servings
        } else if (ingredient.recipe_ingredient_id) {
            // Find the Recipe record with the specified ID (this should always succeed)
            const recipe:IRecipe|undefined = context.recipes.find((item:IRecipe) => item.id === ingredient.recipe_ingredient_id);
            if (!recipe) {
                setErrorMessage("Recipe " + ingredient.recipe_ingredient_id + " not found.")
                return
            }
            nutrition = recipe.nutrition
            modifier = -1/recipe.servings
            formData.price -= recipe.price * ingredient.servings/recipe.servings
        } else {
            setErrorMessage("Ingredient has neither a food_ingredient_id nor a recipe_ingredient_id")
            return
        }

        // Update the Recipe's nutrition information
        updateNutrition(formData.nutrition, nutrition, ingredient.servings, modifier)

        // Adjust the ordinals of all subsequent Ingredients
        ingredients.forEach(item => {
            if (item.ordinal > ingredient.ordinal)
                item.ordinal = item.ordinal - 1
        })

        // Remove the selected Ingredient from the Recipe's ingredients list
        ingredients.splice(ingredients.indexOf(ingredient), 1);

        // Set the state variables to themselves.  This is necessary to trigger a re-render.
        // And yes, we need to call both to re-render both parts of the UI.
        setIngredients([...ingredients]);
        setFormData({...formData});
    }

    const moveIngredientUp = (e: { preventDefault: () => void; }) => {
        e.preventDefault();

        if (!selectedIngredientRowId)
            return

        // Find the Ingredient record with the selected ID (this should always succeed)
        const ingredient:IIngredient|undefined = ingredients.find((item:IIngredient) => item.food_ingredient_id === selectedIngredientRowId[0] && item.recipe_ingredient_id === selectedIngredientRowId[1]);
        if (!ingredient) {
            setErrorMessage("Unable to find Ingredient " + selectedIngredientRowId[0] + "/" + selectedIngredientRowId[1])
            return
        }

        if (ingredient.ordinal <= 0)
            return

        // Find the PREVIOUS Ingredient record
        const prevIngredient:IIngredient|undefined = ingredients.find((item:IIngredient) => item.ordinal == (ingredient.ordinal - 1));
        if (!prevIngredient) {
            setErrorMessage("Unable to find Ingredient with ordinal " + (ingredient.ordinal - 1))
            return
        }

        prevIngredient.ordinal = ingredient.ordinal
        ingredient.ordinal = ingredient.ordinal - 1

        setIngredients([...ingredients])
    }

    const moveIngredientDown = (e: { preventDefault: () => void; }) => {
        e.preventDefault();

        if (!selectedIngredientRowId)
            return

        // Find the Ingredient record with the selected ID (this should always succeed)
        const ingredient:IIngredient|undefined = ingredients.find((item:IIngredient) => item.food_ingredient_id === selectedIngredientRowId[0] && item.recipe_ingredient_id === selectedIngredientRowId[1]);
        if (!ingredient) {
            setErrorMessage("Unable to find Ingredient " + selectedIngredientRowId[0] + "/" + selectedIngredientRowId[1])
            return
        }

        if (ingredient.ordinal >= ingredients.length - 1)
            return

        // Find the PREVIOUS Ingredient record
        const nextIngredient:IIngredient|undefined = ingredients.find((item:IIngredient) => item.ordinal == ingredient.ordinal + 1);
        if (!nextIngredient) {
            setErrorMessage("Unable to find Ingredient with ordinal " + (ingredient.ordinal - 1))
            return
        }

        nextIngredient.ordinal = ingredient.ordinal
        ingredient.ordinal = ingredient.ordinal + 1

        setIngredients([...ingredients])
    }

    // Get the Ingredients for this Recipe
    useEffect(() => {
        // Token management
        const tok = sessionStorage.getItem("access_token")
        const access_token = tok ? JSON.parse(tok) : ""

        const getIngredients = async () => {
            if (formData.id) {
                // Get the Recipe's ingredients
                const response = await axios.get("/recipe/" + formData.id + "/ingredient", {headers: { "Authorization": "Bearer " + access_token}})
                setIngredients(response.data);
            }
        }
        getIngredients();
    }, [formData.id]);

    const calc = (value: number, precision: number = 0) => {
        if (formData.servings > 0) {
            return (value/formData.servings).toFixed(precision)
        }
        return 0
    }

    return (
        <section className="recipeForm">
            <form className="inputForm" onSubmit={handleSubmit}>
                <section className="inputBoundingBox recipeFormBox">
                    <section className="recipeInputBox">
                        {/* Cuisine */}
                        <section className="inputLine">
                            <label htmlFor="cuisine">Cuisine:</label>
                            <select id="cuisine" value={formData.cuisine}
                                onChange={(e) => setFormData(prevState => ({...prevState, cuisine: e.target.value}))}>
                                {cuisines.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </section>

                        {/* Name */}
                        <section className="inputLine">
                            <label htmlFor="name">Name:</label>
                            <input id="name" type="text" value={formData.name} maxLength={100}
                                onChange={(e) => setFormData(prevState => ({...prevState, name: e.target.value}))} />
                        </section>

                        {/* Total Yield */}
                        <section className="inputLine">
                            <label htmlFor="totalyield">Total Yield:</label>
                            <input id="totalyield" type="text" value={formData.total_yield} maxLength={100}
                                onChange={(e) => setFormData(prevState => ({...prevState, total_yield: e.target.value}))} />
                        </section>

                        {/* Servings */}
                        <section className="inputLine">
                            <label htmlFor="size_g">Servings:</label>
                            <input id="ingredientServings" type="number" value={formData.servings} min={0}
                                onChange={(e) => setFormData(prevState => ({...prevState, servings: Number(e.target.value)}))} />
                        </section>
                    </section>

                    {/* NUTRITION */}
                    <section className="recipeNutritionBox">
                        <section className="recipeNutritionColumn">
                            {/* Serving Size Description */}
                            <section className="inputLine">
                                <label htmlFor="serving_size_description">Serving Size:</label>
                                <input id="serving_size_description" type="text" value={formData.nutrition.serving_size_description} maxLength={100}
                                    onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, serving_size_description: e.target.value}}))} />
                            </section>

                            {/* Calories */}
                            <section className="inputLine">
                                <label htmlFor="calories">Calories:</label>
                                <input id="calories" type="number" value={calc(formData.nutrition.calories)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}} />
                            </section>

                            {/* Total Fat (g) */}
                            <section className="inputLine">
                                <label htmlFor="total_fat_g">Total Fat (g):</label>
                                <input id="total_fat_g" type="number" value={calc(formData.nutrition.total_fat_g,1)} min={0} step="0.1" readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}} />
                            </section>

                            {/* Saturated Fat (g) */}
                            <section className="inputLine">
                                <label htmlFor="saturated_fat_g">Saturated Fat (g):</label>
                                <input id="saturated_fat_g" type="number" value={calc(formData.nutrition.saturated_fat_g,1)} min={0} step="0.1" readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}} />
                            </section>

                            {/* Trans Fat (g) */}
                            <section className="inputLine">
                                <label htmlFor="trans_fat_g">Trans Fat (g):</label>
                                <input id="trans_fat_g" type="number" value={calc(formData.nutrition.trans_fat_g)} min={0} step="0.1" readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}} />
                            </section>

                            {/* Cholesterol (mg) */}
                            <section className="inputLine">
                                <label htmlFor="cholesterol_mg">Cholesterol (mg):</label>
                                <input id="cholesterol_mg" type="number" value={calc(formData.nutrition.cholesterol_mg)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}} />
                            </section>
                        </section>

                        <section className="recipeNutritionColumn">
                            {/* Sodium (mg) */}
                            <section className="inputLine">
                                <label htmlFor="sodium_mg">Sodium (mg):</label>
                                <input id="sodium_mg" type="number" value={calc(formData.nutrition.sodium_mg)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}} />
                            </section>

                            {/* Total Carbs (g) */}
                            <section className="inputLine">
                                <label htmlFor="total_carbs_g">Total Carbs (g):</label>
                                <input id="total_carbs_g" type="number" value={calc(formData.nutrition.total_carbs_g)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}} />
                            </section>

                            {/* Fiber (g) */}
                            <section className="inputLine">
                                <label htmlFor="fiber_g">Fiber (g):</label>
                                <input id="fiber_g" type="number" value={calc(formData.nutrition.fiber_g)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}} />
                            </section>

                            {/* Total Sugar (g) */}
                            <section className="inputLine">
                                <label htmlFor="total_sugar_g">Total Sugar (g):</label>
                                <input id="total_sugar_g" type="number" value={calc(formData.nutrition.total_sugar_g)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}} />
                            </section>

                            {/* Added Sugar (g) */}
                            <section className="inputLine">
                                <label htmlFor="added_sugar_g">Added Sugar (g):</label>
                                <input id="added_sugar_g" type="number" value={calc(formData.nutrition.added_sugar_g)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}} />
                            </section>

                            {/* Protein (g) */}
                            <section className="inputLine">
                                <label htmlFor="protein_g">Protein (g):</label>
                                <input id="protein_g" type="number" value={calc(formData.nutrition.protein_g)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}} />
                            </section>
                        </section>

                        <section className="recipeNutritionColumn">
                            {/* Vitamin D (mcg) */}
                            <section className="inputLine">
                                <label htmlFor="vitamin_d_mcg">Vitamin D (mcg):</label>
                                <input id="vitamin_d_mcg" type="number" value={calc(formData.nutrition.vitamin_d_mcg)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}} />
                            </section>

                            {/* Calcium (mg) */}
                            <section className="inputLine">
                                <label htmlFor="calcium_mg">Calcium (mg):</label>
                                <input id="calcium_mg" type="number" value={calc(formData.nutrition.calcium_mg)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}} />
                            </section>

                            {/* Iron (mg) */}
                            <section className="inputLine">
                                <label htmlFor="iron_mg">Iron (mg):</label>
                                <input id="iron_mg" type="number" value={calc(formData.nutrition.iron_mg,1)} min={0} step="0.1" readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}} />
                            </section>

                            {/* Potassium (mg) */}
                            <section className="inputLine">
                                <label htmlFor="potassium_mg">Potassium (mg):</label>
                                <input id="potassium_mg" type="number" value={calc(formData.nutrition.potassium_mg)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}}/>
                            </section>

                            {/* Price ($) */}
                            <section className="inputLine">
                                <label htmlFor="price">Price ($):</label>
                                <input id="price" type="number" value={calc(formData.price, 2)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}} />
                            </section>

                            <p>Note: All data is per serving</p>
                        </section>
                    </section>

                    <section className="recipeListsBox">
                        <section className="ingredientsListBox">
                            <IngredientsTable ingredients={ingredients} setSelectedRowId={setSelectedIngredientRowId}/>
                        </section>

                        <section className="ingredientsButtonsBox">
                            <section className="ingredientsRadioButtonsBox">
                                {/* Food Ingredients radio button */}
                                <input type="radio" id="selectFoodIngredients" value={IngredientTypes.FOOD_INGREDIENTS}
                                    checked={selectedIngredientList === IngredientTypes.FOOD_INGREDIENTS}
                                    onChange={() => setSelectedIngredientList(IngredientTypes.FOOD_INGREDIENTS)} />
                                <Tooltip content="Select Foods to add to this Recipe" showArrow={true} portalled={false}>
                                    <label htmlFor="selectFoodIngredients">Food Ingredients</label>
                                </Tooltip>
                                <br></br>

                                {/* Recipe Ingredients radio button */}
                                <input type="radio" id="selectRecipeIngredients" value={IngredientTypes.RECIPE_INGREDENTS} 
                                    checked={selectedIngredientList === IngredientTypes.RECIPE_INGREDENTS}
                                    onChange={() => setSelectedIngredientList(IngredientTypes.RECIPE_INGREDENTS)} />
                                <Tooltip content="Select other Recipes to add to this Recipe" showArrow={true} portalled={false}>
                                    <label htmlFor="selectRecipeIngredients">Recipe Ingredients</label>
                                </Tooltip>
                            </section>
                            <br/>

                            {/* Servings input */}
                            <section>
                                <input id="ingredientServingsInput" type="number" value={ingredientServings} min={0}
                                    onChange={(e) => setIngredientServings(Number(e.target.value))} />
                                <Tooltip content="Enter the number of Servings of the selected Food or Recipe to add to the Ingredients list" showArrow={true} portalled={false}>
                                    <label htmlFor="ingredientServingsInput"> Servings</label>
                                </Tooltip>
                            </section>
                            <br/>

                            {/* Add button */}
                            <Tooltip content="Add the selected Food or Recipe from the table to the right to the Ingredients list in the table to the left.  Servings must be > 0." showArrow={true} portalled={false}>
                                <button className="ingredientButton" 
                                        onClick={addIngredient} 
                                        style={selectedFoodOrRecipeRowId == null || ingredientServings === 0 ? {color: "gray"} : {}}
                                        disabled={selectedFoodOrRecipeRowId == null || ingredientServings === 0}>
                                    <IconContext.Provider value={selectedFoodOrRecipeRowId === null || ingredientServings === 0 ? {size: "30px"} : { size: "30px", color: "green"}}>
                                        <MdKeyboardDoubleArrowLeft/><p>Add</p>
                                    </IconContext.Provider>
                                </button>
                            </Tooltip>
                            <br/>

                            {/* Update button */}
                            <Tooltip content="Update the number of Servings for the selected Ingredient in the table to the left.  Servings must be > 0" showArrow={true} portalled={false}>
                                <button className="ingredientButton" 
                                        onClick={updateIngredient}
                                        style={selectedIngredientRowId == null || ingredientServings === 0 ? {color: "gray"} : {}}
                                        disabled={selectedIngredientRowId == null || ingredientServings === 0}>
                                    <IconContext.Provider value={selectedIngredientRowId === null || ingredientServings === 0 ? {size: "30px"} : { size: "30px", color: "orange"}}>
                                        <MdEdit/><p>Update</p>
                                    </IconContext.Provider>
                                </button>
                            </Tooltip>
                            <br/>

                            {/* Remove button */}
                            <Tooltip content="Remove the selected Ingredient from the table to the left" showArrow={true} portalled={false}>
                                <button className="ingredientButton"
                                        onClick={removeIngredient} 
                                        style={selectedIngredientRowId == null ? {color: "gray"} : {}}
                                        disabled={selectedIngredientRowId == null}>
                                    <IconContext.Provider value={selectedIngredientRowId === null ? {size: "30px"}: { size: "30px", color: "red"}}>
                                        <p>Remove</p><MdKeyboardDoubleArrowRight/>
                                    </IconContext.Provider>
                                </button>
                            </Tooltip>
                            <br/>

                            {/* Move Up button */}
                            <Tooltip content="Move the selected Ingredient up in the list to the left" showArrow={true} portalled={false}>
                            <button className="ingredientButton"
                                    onClick={moveIngredientUp}
                                    style={selectedIngredientRowId == null ? {color: "gray"} : {}}
                                    disabled={selectedIngredientRowId == null}>
                                <IconContext.Provider value={selectedIngredientRowId === null ? {size: "30px"} : { size: "30px", color: "green"}}>
                                    <MdKeyboardArrowUp/><p>Up</p>
                                </IconContext.Provider>
                            </button>
                            </Tooltip>
                            <br/>

                            {/* Move Down button */}
                            <Tooltip content="Move the selected Ingredient down in the list to the left" showArrow={true} portalled={false}>
                                <button className="ingredientButton"
                                        onClick={moveIngredientDown}
                                        style={selectedIngredientRowId == null ? {color: "gray"} : {}}
                                        disabled={selectedIngredientRowId == null}>
                                    <IconContext.Provider value={selectedIngredientRowId === null ? {size: "30px"} : { size: "30px", color: "green"}}>
                                        <MdKeyboardArrowDown/><p>Down</p>
                                    </IconContext.Provider>
                                </button>
                            </Tooltip>
                        </section>

                        <section className="foodsOrRecipesListBox">
                            {(selectedIngredientList === IngredientTypes.FOOD_INGREDIENTS) ? 
                                <FoodsTable setSelectedRowId={setSelectedFoodOrRecipeRowId} isRecipesForm={true}/> : 
                                <RecipesTable setSelectedRowId={setSelectedFoodOrRecipeRowId}/>}
                        </section>
                    </section>

                    <section className="recipeFormButtonBox">
                        <button className="button" type="submit" disabled={saveIsDisabled}>Save</button>
                        <button className="button" onClick={handleCancel}>Cancel</button>
                    </section>

                    <p>{errorMessage}</p>
                </section>
            </form>

        </section>
    );
}

export default RecipeForm;