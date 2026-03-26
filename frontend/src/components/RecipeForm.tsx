import { useState, useEffect } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { IFood, IRecipe, IIngredient, INutrition } from "./DataProvider";
import { useData } from "@/utils/useData";
import { cuisines } from "./Cuisines";

import IngredientsTable from "./IngredientsTable";
import FoodPickerTable from "./FoodPickerTable";
import RecipePickerTable from "./RecipePickerTable";
import axios from 'axios';
import { generateIngredientSummary } from "../utils/generateIngredientSummary";
import {
    Grid,
    TextField,
    MenuItem,
    Button,
    Divider,
    Typography,
    Switch,
    Stack,
    Tooltip,
    Box,
    Paper,
} from '@mui/material';

function RecipeForm() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams();
    const { foods, recipes, addRecipe, updateRecipe, errorMessage, setErrorMessage } = useData();

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
        price: 0,
        price_per_calorie: 0
    }

    const { id } = useParams();
    const isEditMode = Boolean(id)
    const recipe = isEditMode ? recipes.find(f => f.id === Number(id)) : null;
    const [formData, setFormData] = useState<IRecipe>(() => {
        return recipe || emptyFormData;
    });

    const [selectedIngredientRowId, setSelectedIngredientRowId] = useState<number[] | null>(null)
    const [ingredientServings, setIngredientServings] = useState<number>(1)

    const IngredientTypes = {FOOD_INGREDIENTS: "foodIngredients", RECIPE_INGREDENTS: "recipeIngedients"}
    const [selectedIngredientList, setSelectedIngredientList] = useState(IngredientTypes.FOOD_INGREDIENTS)

    const [selectedFoodOrRecipeRowId, setSelectedFoodOrRecipeRowId] = useState<number|null>(null)

    const saveIsDisabled = false;

    const [ingredients, setIngredients] = useState<IIngredient[]>([])

    const handleSubmit = async (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        setErrorMessage("");

        if (isEditMode) {
            await updateRecipe(formData, ingredients);
        } else {
            await addRecipe(formData, ingredients);
        }

        const returnPath = searchParams.get("returnTo") || "/foods"
        navigate(returnPath)
    }

    const handleCancel = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        setErrorMessage("");

        const returnPath = searchParams.get("returnTo") || "/foods"
        navigate(returnPath)
    }

    const handleIngredientRowSelect = (id: number[] | null) => {
        setSelectedIngredientRowId(id);
        if (id !== null) setSelectedFoodOrRecipeRowId(null);
    };

    const handleFoodOrRecipeRowSelect = (id: number | null) => {
        setSelectedFoodOrRecipeRowId(id);
        if (id !== null) setSelectedIngredientRowId(null);
    };

    const generateSummary = (nutrition: INutrition, food?: IFood, recipe?: IRecipe) => {
        return generateIngredientSummary(nutrition, food, recipe, ingredientServings);
    }

    const findIngredient = (rowId: number[]) =>
        ingredients.find(item =>
            (item.food_ingredient_id ?? 0) === rowId[0]
            && (item.recipe_ingredient_id ?? 0) === rowId[1]
        );

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
        setErrorMessage("");
        if (!selectedFoodOrRecipeRowId) return

        let nutrition: INutrition;
        let modifier: number = 1;
        let ingredient_serving_price = 0;

        if (selectedIngredientList === IngredientTypes.FOOD_INGREDIENTS) {
            const food: IFood|undefined = foods.find((item: IFood) => item.id == selectedFoodOrRecipeRowId);
            if (!food) { setErrorMessage("Food " + selectedFoodOrRecipeRowId + " not found"); return }
            nutrition = food.nutrition
            const summary = generateSummary(food.nutrition, food, undefined)
            ingredient_serving_price = food.price/food.servings
            ingredients.push({food_ingredient_id: food.id, ordinal: ingredients.length, servings: ingredientServings, summary: summary});
        } else {
            const recipe: IRecipe|undefined = recipes.find((item: IRecipe) => item.id == selectedFoodOrRecipeRowId);
            if (!recipe) { setErrorMessage("Recipe " + selectedFoodOrRecipeRowId + " for Ingredient not found"); return }
            nutrition = recipe.nutrition
            const summary = generateSummary(recipe.nutrition, undefined, recipe)
            modifier = 1/recipe.servings
            ingredient_serving_price = recipe.price/recipe.servings
            ingredients.push({recipe_ingredient_id: recipe.id, ordinal: ingredients.length, servings: ingredientServings, summary: summary});
        }

        updateNutrition(formData.nutrition, nutrition, ingredientServings, modifier)
        setFormData(prev => ({ ...prev, price: prev.price + ingredient_serving_price * ingredientServings }));
        setIngredients([...ingredients]);
    }

    const updateIngredient = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        setErrorMessage("");
        if (!selectedIngredientRowId) return

        let summary: string|undefined = undefined
        let food: IFood|undefined = undefined
        let recipe: IRecipe|undefined = undefined
        let nutrition: INutrition|undefined = undefined;
        let modifier: number = 1;
        let ingredient_serving_price = 0;

        const ingredient: IIngredient|undefined = findIngredient(selectedIngredientRowId)
        if (!ingredient) { setErrorMessage("Ingredient not found"); return }

        if (ingredient.food_ingredient_id) {
            food = foods.find((item: IFood) => item.id == ingredient.food_ingredient_id);
            if (!food) { setErrorMessage("Food " + ingredient.food_ingredient_id + " for Ingredient not found"); return }
            nutrition = food.nutrition
            ingredient_serving_price = food.price/food.servings
        } else if (ingredient.recipe_ingredient_id) {
            recipe = recipes.find((item: IRecipe) => item.id === ingredient.recipe_ingredient_id);
            if (!recipe) { setErrorMessage("Recipe " + ingredient.recipe_ingredient_id + " for Ingredient not found"); return }
            nutrition = recipe.nutrition
            modifier = 1/recipe.servings
            ingredient_serving_price = recipe.price/recipe.servings
        }
        if (!nutrition) { setErrorMessage("Nutrition record for Ingredient not found"); return }

        summary = generateSummary(nutrition, food, recipe)
        updateNutrition(formData.nutrition, nutrition, ingredientServings - ingredient.servings, modifier)
        setFormData(prev => ({ ...prev, price: prev.price + ingredient_serving_price * (ingredientServings - ingredient.servings) }));
        setIngredients((prevItems) =>
            prevItems.map((item) =>
                item.food_ingredient_id === selectedIngredientRowId[0] && item.recipe_ingredient_id === selectedIngredientRowId[1] ?
                    {...item, summary: summary, servings: ingredientServings} : item))
    }

    const removeIngredient = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        setErrorMessage("");
        if (!selectedIngredientRowId) return

        let modifier: number = -1;
        const ingredient: IIngredient|undefined = findIngredient(selectedIngredientRowId)
        if (!ingredient) { setErrorMessage("Unable to find Ingredient " + selectedIngredientRowId[0] + "/" + selectedIngredientRowId[1]); return }

        let nutrition: INutrition;
        if (ingredient.food_ingredient_id) {
            const food: IFood|undefined = foods.find((item: IFood) => item.id === ingredient.food_ingredient_id);
            if (!food) { setErrorMessage("Food " + ingredient.food_ingredient_id + " not found."); return }
            nutrition = food.nutrition
            setFormData(prev => ({ ...prev, price: prev.price - food.price * ingredient.servings / food.servings }));
        } else if (ingredient.recipe_ingredient_id) {
            const recipe: IRecipe|undefined = recipes.find((item: IRecipe) => item.id === ingredient.recipe_ingredient_id);
            if (!recipe) { setErrorMessage("Recipe " + ingredient.recipe_ingredient_id + " not found."); return }
            nutrition = recipe.nutrition
            modifier = -1/recipe.servings
            setFormData(prev => ({ ...prev, price: prev.price - recipe.price * ingredient.servings / recipe.servings }));
        } else {
            setErrorMessage("Ingredient has neither a food_ingredient_id nor a recipe_ingredient_id"); return
        }

        updateNutrition(formData.nutrition, nutrition, ingredient.servings, modifier)
        ingredients.forEach(item => { if (item.ordinal > ingredient.ordinal) item.ordinal = item.ordinal - 1 })
        ingredients.splice(ingredients.indexOf(ingredient), 1);
        setIngredients([...ingredients]);
        setFormData({...formData});
    }

    const moveIngredientUp = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        setErrorMessage("");
        if (!selectedIngredientRowId) return;

        const ingredient: IIngredient|undefined = findIngredient(selectedIngredientRowId)
        if (!ingredient) { setErrorMessage("Unable to find Ingredient " + selectedIngredientRowId[0] + "/" + selectedIngredientRowId[1]); return }
        if (ingredient.ordinal <= 0) return

        const prevIngredient: IIngredient|undefined = ingredients.find((item: IIngredient) => item.ordinal == (ingredient.ordinal - 1));
        if (!prevIngredient) { setErrorMessage("Unable to find Ingredient with ordinal " + (ingredient.ordinal - 1)); return }

        const index = ingredients.findIndex(item => item === ingredient);
        if (index <= 0) return;

        const newIngredients = [...ingredients];
        [newIngredients[index - 1], newIngredients[index]] = [newIngredients[index], newIngredients[index - 1]];
        newIngredients[index].ordinal = index;
        newIngredients[index - 1].ordinal = index - 1;
        setIngredients(newIngredients);
    }

    const moveIngredientDown = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        setErrorMessage("");
        if (!selectedIngredientRowId) return

        const ingredient: IIngredient|undefined = findIngredient(selectedIngredientRowId)
        if (!ingredient) { setErrorMessage("Unable to find Ingredient " + selectedIngredientRowId[0] + "/" + selectedIngredientRowId[1]); return }
        if (ingredient.ordinal >= ingredients.length - 1) return

        const nextIngredient: IIngredient|undefined = ingredients.find((item: IIngredient) => item.ordinal == ingredient.ordinal + 1);
        if (!nextIngredient) { setErrorMessage("Unable to find Ingredient with ordinal " + (ingredient.ordinal + 1)); return }

        const index = ingredients.findIndex(item => item === ingredient);
        if (index >= ingredients.length - 1) return;

        const newIngredients = [...ingredients];
        [newIngredients[index + 1], newIngredients[index]] = [newIngredients[index], newIngredients[index + 1]];
        newIngredients[index].ordinal = index;
        newIngredients[index + 1].ordinal = index + 1;
        setIngredients(newIngredients);
    }

    useEffect(() => {
        const tok = sessionStorage.getItem("access_token")
        const access_token = tok ? JSON.parse(tok) : ""
        const getIngredients = async () => {
            if (formData.id) {
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

    // Shared sx for read-only nutrition TextFields
    const readOnlySx = {
        '& .MuiInputBase-input': { color: 'text.secondary' },
        '& .MuiInputBase-root': { backgroundColor: 'grey.100' },
    };

    // Shared props for compact read-only nutrition fields
    const ro = {
        size: 'small' as const,
        type: 'number' as const,
        fullWidth: true,
        slotProps: { input: { readOnly: true } },
        sx: readOnlySx,
    };

    const noIngredientSelected = selectedIngredientRowId == null;
    const noFoodOrRecipeSelected = selectedFoodOrRecipeRowId == null;
    const noServings = ingredientServings === 0;

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #e3f2fd 0%, #fce4ec 100%)',
                py: { xs: 2, md: 4 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                    mb: 3,
                    background: 'rgba(255,255,255,0.85)',
                    borderRadius: 3,
                    boxShadow: 3,
                    px: { xs: 2, md: 6 },
                    py: { xs: 2, md: 3 },
                    width: { xs: '98%', md: '90%' },
                    maxWidth: 900,
                    textAlign: 'left',
                }}
            >
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', letterSpacing: 1, mb: 0.5 }}>
                    {isEditMode ? "Edit Recipe" : "New Recipe"}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    {isEditMode ? "Update your recipe details and ingredients" : "Create a new recipe and add ingredients"}
                </Typography>
            </Paper>
            <Paper
                elevation={4}
                sx={{
                    background: '#fff',
                    borderRadius: 3,
                    boxShadow: 6,
                    px: { xs: 2, md: 6 },
                    py: { xs: 2, md: 3 },
                    width: { xs: '98%', md: '95%' },
                    maxWidth: 1600,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>

                    {/* ── Basic Info ── */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <TextField
                                select
                                label="Cuisine"
                                id="cuisine"
                                value={formData.cuisine}
                                onChange={(e) => setFormData(prev => ({ ...prev, cuisine: e.target.value }))}
                                fullWidth
                            >
                                {cuisines.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 5 }}>
                            <TextField
                                label="Name"
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                inputProps={{ maxLength: 100 }}
                                fullWidth
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <TextField
                                label="Total Yield"
                                id="totalyield"
                                value={formData.total_yield}
                                onChange={(e) => setFormData(prev => ({ ...prev, total_yield: e.target.value }))}
                                inputProps={{ maxLength: 100 }}
                                fullWidth
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 1 }}>
                            <TextField
                                label="Servings"
                                id="servings"
                                type="number"
                                value={formData.servings}
                                onChange={(e) => setFormData(prev => ({ ...prev, servings: Number(e.target.value) }))}
                                inputProps={{ min: 0 }}
                                fullWidth
                            />
                        </Grid>
                    </Grid>

                    {/* ── Nutrition (per serving, read-only) ── */}
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 2 }}>
                        Nutrition <Typography component="span" variant="body2" color="text.secondary">(per serving)</Typography>
                    </Typography>
                    <Grid container spacing={1.5} sx={{ mb: 3 }}>
                        {/* Serving size (editable) + Calories + Price */}
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                label="Serving Size"
                                id="serving_size_description"
                                value={formData.nutrition.serving_size_description}
                                onChange={(e) => setFormData(prev => ({ ...prev, nutrition: { ...prev.nutrition, serving_size_description: e.target.value } }))}
                                inputProps={{ maxLength: 100 }}
                                size="small"
                                fullWidth
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField label="Calories" id="calories" value={calc(formData.nutrition.calories)} {...ro} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField label="Price ($)" id="price" value={calc(formData.price, 2)} {...ro} />
                        </Grid>

                        {/* Fats row */}
                        <Grid size={{ xs: 12 }}><Divider /></Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField label="Total Fat (g)" id="total_fat_g" value={calc(formData.nutrition.total_fat_g, 1)} {...ro} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField label="Saturated Fat (g)" id="saturated_fat_g" value={calc(formData.nutrition.saturated_fat_g, 1)} {...ro} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField label="Trans Fat (g)" id="trans_fat_g" value={calc(formData.nutrition.trans_fat_g)} {...ro} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField label="Cholesterol (mg)" id="cholesterol_mg" value={calc(formData.nutrition.cholesterol_mg)} {...ro} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField label="Sodium (mg)" id="sodium_mg" value={calc(formData.nutrition.sodium_mg)} {...ro} />
                        </Grid>

                        {/* Carbs row */}
                        <Grid size={{ xs: 12 }}><Divider /></Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField label="Total Carbs (g)" id="total_carbs_g" value={calc(formData.nutrition.total_carbs_g)} {...ro} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField label="Fiber (g)" id="fiber_g" value={calc(formData.nutrition.fiber_g)} {...ro} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField label="Total Sugar (g)" id="total_sugar_g" value={calc(formData.nutrition.total_sugar_g)} {...ro} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField label="Added Sugar (g)" id="added_sugar_g" value={calc(formData.nutrition.added_sugar_g)} {...ro} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField label="Protein (g)" id="protein_g" value={calc(formData.nutrition.protein_g)} {...ro} />
                        </Grid>

                        {/* Vitamins/minerals row */}
                        <Grid size={{ xs: 12 }}><Divider /></Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField label="Vitamin D (mcg)" id="vitamin_d_mcg" value={calc(formData.nutrition.vitamin_d_mcg)} {...ro} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField label="Calcium (mg)" id="calcium_mg" value={calc(formData.nutrition.calcium_mg)} {...ro} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField label="Iron (mg)" id="iron_mg" value={calc(formData.nutrition.iron_mg, 1)} {...ro} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField label="Potassium (mg)" id="potassium_mg" value={calc(formData.nutrition.potassium_mg)} {...ro} />
                        </Grid>
                    </Grid>

                    {/* ── Ingredient Shuttle ── */}
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>

                        {/* Left: Ingredients list (the recipe) */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Selected Ingredients</Typography>
                            <Box sx={{ maxHeight: 400, minHeight: 400, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                <IngredientsTable
                                    data={[...ingredients].sort((a,b) => a.ordinal - b.ordinal)}
                                    setSelectedRowId={handleIngredientRowSelect}
                                    selectedRowId={selectedIngredientRowId} />
                            </Box>
                        </Box>

                        {/* Center: Action buttons */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, pt: 4, minWidth: 130 }}>
                            {/* Servings input */}
                            <Tooltip title="Number of servings of the selected Food or Recipe to add" placement="right" arrow>
                                <TextField
                                    label="Servings"
                                    id="ingredientServingsInput"
                                    type="number"
                                    value={ingredientServings}
                                    onChange={(e) => setIngredientServings(Number(e.target.value))}
                                    inputProps={{ min: 0 }}
                                    size="small"
                                    sx={{ width: '100%', mb: 1 }}
                                />
                            </Tooltip>

                            <Divider flexItem sx={{ width: '100%', my: 0.5 }} />

                            {/* Add */}
                            <Tooltip title="Add the selected Food or Recipe to the ingredient list" placement="right" arrow>
                                <span style={{ width: '100%' }}>
                                    <Button
                                        variant="contained"
                                        fullWidth
                                        disabled={noFoodOrRecipeSelected || noServings}
                                        onClick={addIngredient}
                                        sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' } }}
                                    >
                                        ← Add
                                    </Button>
                                </span>
                            </Tooltip>

                            {/* Update */}
                            <Tooltip title="Update the servings for the selected ingredient" placement="right" arrow>
                                <span style={{ width: '100%' }}>
                                    <Button
                                        variant="contained"
                                        fullWidth
                                        disabled={noIngredientSelected || noServings}
                                        onClick={updateIngredient}
                                        sx={{ bgcolor: 'warning.main', '&:hover': { bgcolor: 'warning.dark' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' }, color: 'warning.contrastText' }}
                                    >
                                        Update
                                    </Button>
                                </span>
                            </Tooltip>

                            {/* Remove */}
                            <Tooltip title="Remove the selected ingredient from the recipe" placement="right" arrow>
                                <span style={{ width: '100%' }}>
                                    <Button
                                        variant="contained"
                                        fullWidth
                                        disabled={noIngredientSelected}
                                        onClick={removeIngredient}
                                        sx={{ bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' } }}
                                    >
                                        Remove →
                                    </Button>
                                </span>
                            </Tooltip>

                            <Divider flexItem sx={{ width: '100%', my: 0.5 }} />

                            {/* Move Up */}
                            <Tooltip title="Move the selected ingredient up in the list" placement="right" arrow>
                                <span style={{ width: '100%' }}>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        disabled={noIngredientSelected}
                                        onClick={moveIngredientUp}
                                        color="primary"
                                    >
                                        ▲ Up
                                    </Button>
                                </span>
                            </Tooltip>

                            {/* Move Down */}
                            <Tooltip title="Move the selected ingredient down in the list" placement="right" arrow>
                                <span style={{ width: '100%' }}>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        disabled={noIngredientSelected}
                                        onClick={moveIngredientDown}
                                        color="primary"
                                    >
                                        ▼ Down
                                    </Button>
                                </span>
                            </Tooltip>
                        </Box>

                        {/* Right: Foods or Recipes to pick from */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                                    {selectedIngredientList === IngredientTypes.FOOD_INGREDIENTS ? 'Available Ingredients (Foods)' : 'Available Ingredients (Other Recipes)'}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                                        <Typography variant="caption">Foods</Typography>
                                        <Switch
                                            size="small"
                                            checked={selectedIngredientList === IngredientTypes.RECIPE_INGREDENTS}
                                            onChange={(e) => setSelectedIngredientList(
                                                e.target.checked ? IngredientTypes.RECIPE_INGREDENTS : IngredientTypes.FOOD_INGREDIENTS
                                            )}
                                            sx={{ mx: 0.5 }}
                                        />
                                        <Typography variant="caption">Recipes</Typography>
                                    </Box>
                            </Box>
                            {selectedIngredientList === IngredientTypes.FOOD_INGREDIENTS ? (
                                <FoodPickerTable
                                    setSelectedRowId={handleFoodOrRecipeRowSelect} 
                                    selectedRowId={selectedFoodOrRecipeRowId} />
                            ) : (
                                <RecipePickerTable
                                    setSelectedRowId={handleFoodOrRecipeRowSelect}
                                    selectedRowId={selectedFoodOrRecipeRowId}
                                    excludeRecipeId={formData.id}
                                />
                            )}
                        </Box>
                    </Box>

                    {/* ── Save / Cancel ── */}
                    <Divider sx={{ my: 3 }} />
                    <Stack direction="row" spacing={2} justifyContent="center">
                        <Button type="submit" variant="contained" color="primary" disabled={saveIsDisabled}>
                            Save
                        </Button>
                        <Button variant="outlined" color="secondary" onClick={handleCancel}>
                            Cancel
                        </Button>
                    </Stack>
                </Box>
                {errorMessage && (
                    <Typography color="error" sx={{ mt: 2 }}>
                        {errorMessage}
                    </Typography>
                )}
            </Paper>
        </Box>
    );
}

export default RecipeForm;
