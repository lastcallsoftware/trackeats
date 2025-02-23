import { useContext, useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom";
import { IFood, IRecipe, DataContext, IIngredient, INutrition } from "./DataProvider";
import { cuisines } from "./Cuisines";
import { IconContext } from "react-icons";
import { MdKeyboardDoubleArrowLeft, MdKeyboardDoubleArrowRight } from "react-icons/md";
import FoodsTable from "./FoodsTable";
import RecipesTable from "./RecipesTable";
import IngredientsTable from "./IngredientsTable";
import axios from 'axios';

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
            protein_g: 0, vitamin_d_mcg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0
        },
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
    let errorMessage = context.errorMessage;

    // State for the selected row in the Ingredients list
    // For this table, rather than the row ID, we use a tuple of the record's 
    // food_ingredient_id and recipe_ingredient_id, which are guaranteed to
    // be unique for a given Recipe.  This is because new Ingredients do not
    // have any row ID until the record is saved, so it can't be used to
    // search for a record.
    const [selectedIngredientRowId, setSelectedIngredientRowId] = useState<number[]|null>(null)
    
    // State for the ingredient servings, which tells us how many servings of
    // the selected Ingredient to add to the Recipe when the user clicks Add.
    const [ingredientServings, setIngredientServings] = useState<number>(0)

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
            errorMessage = "Error saving Recipe: recipe_id is undefined";
        }

        // Return to the Recipes page
        navigate("/recipes")
    }

    const handleCancel = (e: { preventDefault: () => void; }) => {
        e.preventDefault();

        // Return to the Recipes page
        navigate("/recipes", { state: { } })
    }

    const addIngredient = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        if (selectedFoodOrRecipeRowId) {
            let nutrition:INutrition|null = null;
            if (selectedIngredientList === IngredientTypes.FOOD_INGREDIENTS) {
                // Find the Food record with the specified ID (this should always succeed)
                const food:IFood|undefined = context.foods.find((item:IFood) => item.id == selectedFoodOrRecipeRowId);
                if (food) {
                    // Add the Food Ingredient to the Recipe's ingredients list
                    ingredients.push({food_ingredient_id: food.id, servings: ingredientServings, summary: food.name});
                    nutrition = food.nutrition
                }
            } else {
                // Find the Recipe record with the specified ID (this should always succeed)
                const recipe:IRecipe|undefined = context.recipes.find((item:IRecipe) => item.id == selectedFoodOrRecipeRowId);
                if (recipe) {
                    // Add the Recipe Ingredient to the Recipe's ingredients list
                    ingredients.push({recipe_ingredient_id: recipe.id, servings: ingredientServings, summary: recipe.name});
                    nutrition = recipe.nutrition
                }
            }
            // Update the Recipe's nutrition information
            if (nutrition) {
                formData.nutrition.calories         += nutrition.calories * ingredientServings;
                formData.nutrition.saturated_fat_g  += nutrition.saturated_fat_g * ingredientServings;
                formData.nutrition.trans_fat_g      += nutrition.trans_fat_g * ingredientServings;
                formData.nutrition.cholesterol_mg   += nutrition.cholesterol_mg * ingredientServings;
                formData.nutrition.sodium_mg        += nutrition.sodium_mg * ingredientServings;
                formData.nutrition.total_carbs_g    += nutrition.total_carbs_g * ingredientServings;
                formData.nutrition.fiber_g          += nutrition.fiber_g * ingredientServings;
                formData.nutrition.total_sugar_g    += nutrition.total_sugar_g * ingredientServings;
                formData.nutrition.added_sugar_g    += nutrition.added_sugar_g * ingredientServings;
                formData.nutrition.protein_g        += nutrition.protein_g * ingredientServings;
                formData.nutrition.vitamin_d_mcg    += nutrition.vitamin_d_mcg * ingredientServings;
                formData.nutrition.calcium_mg       += nutrition.calcium_mg * ingredientServings;
                formData.nutrition.iron_mg          += nutrition.iron_mg * ingredientServings;
                formData.nutrition.potassium_mg     += nutrition.potassium_mg * ingredientServings;
                }

            // Set the state variables to themselves.  This is necessary to 
            // trigger a re-render.
            // And yes, we need to call both to re-render both parts of the UI.
            setIngredients([...ingredients]);
            setFormData({...formData});
        }
    }

    const removeIngredient = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        if (selectedIngredientRowId) {
            // Find the Food record with the specified ID (this should always succeed)
            const ingredient:IIngredient|undefined = ingredients.find((item:IIngredient) => item.food_ingredient_id === selectedIngredientRowId[0] && item.recipe_ingredient_id === selectedIngredientRowId[1]);
            if (ingredient) {
                // Get the nutrition information for the selected Ingredient
                let nutrition: INutrition|null = null;
                if (ingredient.food_ingredient_id) {
                    // Find the Food record with the specified ID (this should always succeed)
                    const food:IFood|undefined = context.foods.find((item:IFood) => item.id === ingredient.food_ingredient_id);
                    if (food) {
                        nutrition = food.nutrition
                    }
                } else if (ingredient.recipe_ingredient_id) {
                    // Find the Recipe record with the specified ID (this should always succeed)
                    const recipe:IRecipe|undefined = context.recipes.find((item:IRecipe) => item.id === ingredient.recipe_ingredient_id);
                    if (recipe) {
                        nutrition = recipe.nutrition
                    }
                }

                // Update the Recipe's nutrition information
                if (nutrition) {
                    formData.nutrition.calories         -= nutrition.calories * ingredientServings;
                    formData.nutrition.saturated_fat_g  -= nutrition.saturated_fat_g * ingredientServings;
                    formData.nutrition.trans_fat_g      -= nutrition.trans_fat_g * ingredientServings;
                    formData.nutrition.cholesterol_mg   -= nutrition.cholesterol_mg * ingredientServings;
                    formData.nutrition.sodium_mg        -= nutrition.sodium_mg * ingredientServings;
                    formData.nutrition.total_carbs_g    -= nutrition.total_carbs_g * ingredientServings;
                    formData.nutrition.fiber_g          -= nutrition.fiber_g * ingredientServings;
                    formData.nutrition.total_sugar_g    -= nutrition.total_sugar_g * ingredientServings;
                    formData.nutrition.added_sugar_g    -= nutrition.added_sugar_g * ingredientServings;
                    formData.nutrition.protein_g        -= nutrition.protein_g * ingredientServings;
                    formData.nutrition.vitamin_d_mcg    -= nutrition.vitamin_d_mcg * ingredientServings;
                    formData.nutrition.calcium_mg       -= nutrition.calcium_mg * ingredientServings;
                    formData.nutrition.iron_mg          -= nutrition.iron_mg * ingredientServings;
                    formData.nutrition.potassium_mg     -= nutrition.potassium_mg * ingredientServings;
                }

                // Remove the selected Ingredient from the Recipe's ingredients list
                ingredients.splice(ingredients.indexOf(ingredient), 1);

                // Set the state variables to themselves.  This is necessary to 
                // trigger a re-render.
                // And yes, we need to call both to re-render both parts of the UI.
                setIngredients([...ingredients]);
                setFormData({...formData});
            }
        }
    }

    // Token management
	const tok = sessionStorage.getItem("access_token")
	const access_token = tok ? JSON.parse(tok) : ""

    // Get the Ingredients for this Recipe
    useEffect(() => {
        if (formData.id) {
            // Get the Recipe's ingredients
            axios.get("/recipe/" + formData.id + "/ingredient", {headers: { "Authorization": "Bearer " + access_token}})
            .then((response) => {
                setIngredients(response.data);
            })
        }
    }, [context, formData.id, access_token]);

    const calc = (value: number) => {
        if (formData.servings > 0) {
            return Math.round(value/formData.servings)
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
                            <label htmlFor="group">Cuisine:</label>
                            <select id="group" value={formData.cuisine}
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
                                <input id="calories" type="number" value={calc(formData.nutrition.calories)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}}
                                    onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, calories: Number(e.target.value)}}))} />
                            </section>

                            {/* Total Fat (g) */}
                            <section className="inputLine">
                                <label htmlFor="total_fat_g">Total Fat (g):</label>
                                <input id="total_fat_g" type="number" value={calc(formData.nutrition.total_fat_g)} min={0} step="0.1" readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}}
                                    onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, total_fat_g: Number(e.target.value)}}))} />
                            </section>

                            {/* Saturated Fat (g) */}
                            <section className="inputLine">
                                <label htmlFor="saturated_fat_g">Saturated Fat (g):</label>
                                <input id="saturated_fat_g" type="number" value={calc(formData.nutrition.saturated_fat_g)} min={0} step="0.1" readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}}
                                    onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, saturated_fat_g: Number(e.target.value)}}))} />
                            </section>

                            {/* Trans Fat (g) */}
                            <section className="inputLine">
                                <label htmlFor="trans_fat_g">Trans Fat (g):</label>
                                <input id="trans_fat_g" type="number" value={calc(formData.nutrition.trans_fat_g)} min={0} step="0.1" readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}}
                                    onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, trans_fat_g: Number(e.target.value)}}))} />
                            </section>

                            {/* Cholesterol (mg) */}
                            <section className="inputLine">
                                <label htmlFor="cholesterol_mg">Cholesterol (mg):</label>
                                <input id="cholesterol_mg" type="number" value={calc(formData.nutrition.cholesterol_mg)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}}
                                    onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, cholesterol_mg: Number(e.target.value)}}))} />
                            </section>
                        </section>

                        <section className="recipeNutritionColumn">
                            {/* Sodium (mg) */}
                            <section className="inputLine">
                                <label htmlFor="sodium_mg">Sodium (mg):</label>
                                <input id="sodium_mg" type="number" value={calc(formData.nutrition.sodium_mg)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}}
                                    onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, sodium_mg: Number(e.target.value)}}))} />
                            </section>

                            {/* Total Carbs (g) */}
                            <section className="inputLine">
                                <label htmlFor="total_carbs_g">Total Carbs (g):</label>
                                <input id="total_carbs_g" type="number" value={calc(formData.nutrition.total_carbs_g)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}}
                                    onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, total_carbs_g: Number(e.target.value)}}))} />
                            </section>

                            {/* Fiber (g) */}
                            <section className="inputLine">
                                <label htmlFor="fiber_g">Fiber (g):</label>
                                <input id="fiber_g" type="number" value={calc(formData.nutrition.fiber_g)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}}
                                    onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, fiber_g: Number(e.target.value)}}))} />
                            </section>

                            {/* Total Sugar (g) */}
                            <section className="inputLine">
                                <label htmlFor="total_sugar_g">Total Sugar (g):</label>
                                <input id="total_sugar_g" type="number" value={calc(formData.nutrition.total_sugar_g)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}}
                                    onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, total_sugar_g: Number(e.target.value)}}))} />
                            </section>

                            {/* Added Sugar (g) */}
                            <section className="inputLine">
                                <label htmlFor="added_sugar_g">Added Sugar (g):</label>
                                <input id="added_sugar_g" type="number" value={calc(formData.nutrition.added_sugar_g)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}}
                                    onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, added_sugar_g: Number(e.target.value)}}))} />
                            </section>

                            {/* Protein (g) */}
                            <section className="inputLine">
                                <label htmlFor="protein_g">Protein (g):</label>
                                <input id="protein_g" type="number" value={calc(formData.nutrition.protein_g)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}}
                                    onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, protein_g: Number(e.target.value)}}))} />
                            </section>
                        </section>

                        <section className="recipeNutritionColumn">
                            {/* Vitamin D (mcg) */}
                            <section className="inputLine">
                                <label htmlFor="vitamin_d_mcg">Vitamin D (mcg):</label>
                                <input id="vitamin_d_mcg" type="number" value={calc(formData.nutrition.vitamin_d_mcg)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}}
                                    onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, vitamin_d_mcg: Number(e.target.value)}}))} />
                            </section>

                            {/* Calcium (mg) */}
                            <section className="inputLine">
                                <label htmlFor="calcium_mg">Calcium (mg):</label>
                                <input id="calcium_mg" type="number" value={calc(formData.nutrition.calcium_mg)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}}
                                    onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, calcium_mg: Number(e.target.value)}}))} />
                            </section>

                            {/* Iron (mg) */}
                            <section className="inputLine">
                                <label htmlFor="iron_mg">Iron (mg):</label>
                                <input id="iron_mg" type="number" value={calc(formData.nutrition.iron_mg)} min={0} step="0.1" readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}}
                                    onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, iron_mg: Number(e.target.value)}}))} />
                            </section>

                            {/* Potassium (mg) */}
                            <section className="inputLine">
                                <label htmlFor="potassium_mg">Potassium (mg):</label>
                                <input id="potassium_mg" type="number" value={calc(formData.nutrition.potassium_mg)} min={0} readOnly={true} tabIndex={-1} style={{backgroundColor:"lightgray"}}
                                    onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, potassium_mg: Number(e.target.value)}}))} />
                            </section>
                        </section>
                    </section>

                    <section className="recipeListsBox">
                        <section className="ingredientsListBox">
                            <IngredientsTable ingredients={ingredients} setSelectedRowId={setSelectedIngredientRowId}/>
                        </section>

                        <section className="ingredientsButtonsBox">
                            <section className="ingredientsRadioButtonsBox">
                                <input type="radio" id="selectFoodIngredients" value={IngredientTypes.FOOD_INGREDIENTS}
                                    checked={selectedIngredientList === IngredientTypes.FOOD_INGREDIENTS}
                                    onChange={() => setSelectedIngredientList(IngredientTypes.FOOD_INGREDIENTS)} />
                                <label htmlFor="selectFoodIngredients">Food Ingredients</label><br></br>
                                <input type="radio" id="selectRecipeIngredients" value={IngredientTypes.RECIPE_INGREDENTS} 
                                    checked={selectedIngredientList === IngredientTypes.RECIPE_INGREDENTS}
                                    onChange={() => setSelectedIngredientList(IngredientTypes.RECIPE_INGREDENTS)} />
                                <label htmlFor="selectRecipeIngredients">Recipe Ingredients</label>
                            </section>

                            <button className="button ingredientButton" onClick={addIngredient} disabled={selectedFoodOrRecipeRowId === null || ingredientServings === 0}>
                                <IconContext.Provider value={selectedFoodOrRecipeRowId === null || ingredientServings === 0 ? {size: "30px"} : { size: "30px", color: "green"}}>
                                    <MdKeyboardDoubleArrowLeft/><p>Add</p>
                                </IconContext.Provider>
                            </button>
                            <br/>

                            <input id="ingredientServingsInput" type="number" value={ingredientServings} min={0}
                                onChange={(e) => setIngredientServings(Number(e.target.value))} />
                            <label htmlFor="ingredientServingsInput">Servings</label>
                            <br/>

                            <button className="button ingredientButton" onClick={removeIngredient} disabled={selectedIngredientRowId === null}>
                                <IconContext.Provider value={selectedIngredientRowId === null ? {size: "30px"}: { size: "30px", color: "red"}}>
                                    <p>Remove</p><MdKeyboardDoubleArrowRight/>
                                </IconContext.Provider>
                            </button>
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