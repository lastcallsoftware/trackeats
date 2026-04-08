import { useState, useEffect, useMemo } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { IFood, IRecipe, IIngredient, INutrition } from "../contexts/DataProvider";
import { useData, Recipe } from "@/utils/useData";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cuisines } from "./Cuisines";
import IngredientsTable from "./IngredientsTable";
import { NutritionLabel } from "./NutritionLabel";
import FoodPickerTable from "./FoodPickerTable";
import RecipePickerTable from "./RecipePickerTable";
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
    IconButton,
    InputAdornment,
} from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

const cloneRecipe = (source: IRecipe): IRecipe => ({
    ...source,
    nutrition: { ...source.nutrition },
});

const emptyNutritionTotals = (): Omit<INutrition, 'serving_size_description' | 'serving_size_oz' | 'serving_size_g'> => ({
    calories: 0,
    total_fat_g: 0,
    saturated_fat_g: 0,
    trans_fat_g: 0,
    cholesterol_mg: 0,
    sodium_mg: 0,
    total_carbs_g: 0,
    fiber_g: 0,
    total_sugar_g: 0,
    added_sugar_g: 0,
    protein_g: 0,
    vitamin_d_mcg: 0,
    calcium_mg: 0,
    iron_mg: 0,
    potassium_mg: 0,
});

const nutritionSchema = z.object({
    serving_size_description: z.string().trim().min(1, "Serving size is required").max(100, "Must be 100 characters or fewer"),
    serving_size_oz: z.coerce.number().min(0, "Must be 0 or greater"),
    serving_size_g: z.coerce.number().min(0, "Must be 0 or greater"),
    calories: z.coerce.number().min(0, "Must be 0 or greater"),
    total_fat_g: z.coerce.number().min(0, "Must be 0 or greater"),
    saturated_fat_g: z.coerce.number().min(0, "Must be 0 or greater"),
    trans_fat_g: z.coerce.number().min(0, "Must be 0 or greater"),
    cholesterol_mg: z.coerce.number().min(0, "Must be 0 or greater"),
    sodium_mg: z.coerce.number().min(0, "Must be 0 or greater"),
    total_carbs_g: z.coerce.number().min(0, "Must be 0 or greater"),
    fiber_g: z.coerce.number().min(0, "Must be 0 or greater"),
    total_sugar_g: z.coerce.number().min(0, "Must be 0 or greater"),
    added_sugar_g: z.coerce.number().min(0, "Must be 0 or greater"),
    protein_g: z.coerce.number().min(0, "Must be 0 or greater"),
    vitamin_d_mcg: z.coerce.number().min(0, "Must be 0 or greater"),
    calcium_mg: z.coerce.number().min(0, "Must be 0 or greater"),
    iron_mg: z.coerce.number().min(0, "Must be 0 or greater"),
    potassium_mg: z.coerce.number().min(0, "Must be 0 or greater"),
});

const recipeSchema = z.object({
    id: z.number().optional(),
    cuisine: z.string().trim().min(1, "Cuisine is required"),
    name: z.string().trim().min(1, "Name is required").max(50, "Must be 50 characters or fewer"),
    total_yield: z.string().trim().min(1, "Total yield is required").max(50, "Must be 50 characters or fewer"),
    servings: z.coerce.number().gt(0, "Servings must be greater than 0"),
    nutrition_id: z.number().optional(),
    nutrition: nutritionSchema,
    price: z.coerce.number().min(0, "Must be 0 or greater").optional().default(0),
    price_per_serving: z.coerce.number().optional(),
    price_per_calorie: z.coerce.number().min(0, "Must be 0 or greater").optional().default(0),
});

type RecipeFormInput = z.input<typeof recipeSchema>;
type RecipeFormValues = z.output<typeof recipeSchema>;

const normalizeNutritionForApi = (nutrition: RecipeFormValues["nutrition"]): RecipeFormValues["nutrition"] => ({
    ...nutrition,
    serving_size_g: Math.round(nutrition.serving_size_g),
    calories: Math.round(nutrition.calories),
    cholesterol_mg: Math.round(nutrition.cholesterol_mg),
    sodium_mg: Math.round(nutrition.sodium_mg),
    total_carbs_g: Math.round(nutrition.total_carbs_g),
    fiber_g: Math.round(nutrition.fiber_g),
    total_sugar_g: Math.round(nutrition.total_sugar_g),
    added_sugar_g: Math.round(nutrition.added_sugar_g),
    protein_g: Math.round(nutrition.protein_g),
    vitamin_d_mcg: Math.round(nutrition.vitamin_d_mcg),
    calcium_mg: Math.round(nutrition.calcium_mg),
    potassium_mg: Math.round(nutrition.potassium_mg),
});

function RecipeForm() {
    const navigate = useNavigate()
    const theme = useTheme();
    const isNarrow = useMediaQuery(theme.breakpoints.down('sm'));
    const [searchParams] = useSearchParams();
    const { foods, recipes, fetchIngredients, addRecipe, updateRecipe, setErrorMessage } = useData();

    const { id } = useParams();
    const isEditMode = Boolean(id)
    const recipe = isEditMode ? recipes.find(f => f.id === Number(id)) : null;
    const initialRecipe = useMemo<IRecipe>(() => {
        return recipe ? cloneRecipe(recipe) : new Recipe();
    }, [recipe]);
    const {
        register,
        handleSubmit,
        reset,
        setValue,
        getValues,
        control,
        formState: { errors },
    } = useForm<RecipeFormInput, unknown, RecipeFormValues>({
        mode: "onBlur",
        reValidateMode: "onChange",
        resolver: zodResolver(recipeSchema),
        defaultValues: initialRecipe as RecipeFormInput,
    });
    const recipeId = useWatch({ control, name: "id" }) as number | undefined;
    const recipeServings = Number((useWatch({ control, name: "servings" }) as number | undefined) ?? 0);
    const recipeNutrition =
        (useWatch({ control, name: "nutrition" }) as RecipeFormValues["nutrition"] | undefined) ?? initialRecipe.nutrition;

    const [selectedIngredientRowId, setSelectedIngredientRowId] = useState<number[] | null>(null)
    const [ingredientServings, setIngredientServings] = useState<number>(1)

    const IngredientTypes = {FOOD_INGREDIENTS: "foodIngredients", RECIPE_INGREDENTS: "recipeIngedients"}
    const [selectedIngredientList, setSelectedIngredientList] = useState(IngredientTypes.FOOD_INGREDIENTS)

    const [selectedFoodOrRecipeRowId, setSelectedFoodOrRecipeRowId] = useState<number|null>(null)

    const saveIsDisabled = false;

    const [ingredients, setIngredients] = useState<IIngredient[]>([])

    useEffect(() => {
        reset(initialRecipe as RecipeFormInput);
    }, [initialRecipe, reset]);

    const onSubmit = async (data: RecipeFormValues) => {
        const recipeToSave = {
            ...data,
            nutrition: normalizeNutritionForApi(data.nutrition),
            price: totalRecipePrice,
        };

        if (isEditMode) {
            await updateRecipe(recipeToSave, ingredients);
        } else {
            await addRecipe(recipeToSave, ingredients);
        }

        const returnPath = searchParams.get("returnTo") || "/recipes"
        navigate(returnPath)
    }

    const handleCancel = (e: { preventDefault: () => void; }) => {
        e.preventDefault();

        const returnPath = searchParams.get("returnTo") || "/recipes"
        navigate(returnPath)
    }

    const handleIngredientRowSelect = (id: number[] | null) => {
        setSelectedIngredientRowId(id);
        if (id) {
            const selectedIngredient = ingredients.find(item =>
                (item.food_ingredient_id ?? 0) === id[0]
                && (item.recipe_ingredient_id ?? 0) === id[1]
            );
            if (selectedIngredient) {
                setIngredientServings(selectedIngredient.servings);
            }
        }
        if (id !== null) setSelectedFoodOrRecipeRowId(null);
    };

    const handleFoodOrRecipeRowSelect = (id: number | null) => {
        setSelectedFoodOrRecipeRowId(id);
        if (id !== null) setSelectedIngredientRowId(null);
    };

    const generateSummary = (nutrition: INutrition, food?: IFood, recipe?: IRecipe) => {
        return generateIngredientSummary(nutrition, food, recipe, ingredientServings);
    }

    const isSameIngredientRow = (item: IIngredient, rowId: number[]) =>
        (item.food_ingredient_id ?? 0) === rowId[0]
        && (item.recipe_ingredient_id ?? 0) === rowId[1];

    const findIngredient = (rowId: number[]) =>
        ingredients.find(item => isSameIngredientRow(item, rowId));

    const resolveIngredientSource = (ingredient: IIngredient): {
        nutrition: INutrition;
        modifier: number;
        ingredientServingPrice: number;
        food?: IFood;
        recipe?: IRecipe;
    } | null => {
        if (ingredient.food_ingredient_id) {
            const food = foods.find((item: IFood) => item.id === ingredient.food_ingredient_id);
            if (!food) {
                setErrorMessage("Food " + ingredient.food_ingredient_id + " for Ingredient not found");
                return null;
            }
            return {
                nutrition: food.nutrition,
                modifier: 1,
                ingredientServingPrice: food.price / food.servings,
                food,
            };
        }

        if (ingredient.recipe_ingredient_id) {
            const recipeForIngredient = recipes.find((item: IRecipe) => item.id === ingredient.recipe_ingredient_id);
            if (!recipeForIngredient) {
                setErrorMessage("Recipe " + ingredient.recipe_ingredient_id + " for Ingredient not found");
                return null;
            }
            return {
                nutrition: recipeForIngredient.nutrition,
                modifier: 1 / recipeForIngredient.servings,
                ingredientServingPrice: recipeForIngredient.price / recipeForIngredient.servings,
                recipe: recipeForIngredient,
            };
        }

        setErrorMessage("Ingredient has neither a food_ingredient_id nor a recipe_ingredient_id");
        return null;
    };

    const recalculateRecipeTotals = (nextIngredients: IIngredient[]) => {
        const totals = emptyNutritionTotals();
        let priceTotal = 0;

        for (const ingredient of nextIngredients) {
            const source = resolveIngredientSource(ingredient);
            if (!source) continue;

            const { nutrition, modifier, ingredientServingPrice } = source;
            const servings = ingredient.servings;

            totals.calories += nutrition.calories * servings * modifier;
            totals.total_fat_g += nutrition.total_fat_g * servings * modifier;
            totals.saturated_fat_g += nutrition.saturated_fat_g * servings * modifier;
            totals.trans_fat_g += nutrition.trans_fat_g * servings * modifier;
            totals.cholesterol_mg += nutrition.cholesterol_mg * servings * modifier;
            totals.sodium_mg += nutrition.sodium_mg * servings * modifier;
            totals.total_carbs_g += nutrition.total_carbs_g * servings * modifier;
            totals.fiber_g += nutrition.fiber_g * servings * modifier;
            totals.total_sugar_g += nutrition.total_sugar_g * servings * modifier;
            totals.added_sugar_g += nutrition.added_sugar_g * servings * modifier;
            totals.protein_g += nutrition.protein_g * servings * modifier;
            totals.vitamin_d_mcg += nutrition.vitamin_d_mcg * servings * modifier;
            totals.calcium_mg += nutrition.calcium_mg * servings * modifier;
            totals.iron_mg += nutrition.iron_mg * servings * modifier;
            totals.potassium_mg += nutrition.potassium_mg * servings * modifier;

            priceTotal += ingredientServingPrice * servings;
        }

        const currentNutrition = getValues("nutrition") as RecipeFormValues["nutrition"];
        setValue("price", priceTotal, { shouldDirty: true });
        setValue(
            "nutrition",
            {
                ...currentNutrition,
                ...totals,
            },
            { shouldDirty: true }
        );
    };

    const addIngredient = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        if (selectedFoodOrRecipeRowId === null) return

        if (selectedIngredientList === IngredientTypes.FOOD_INGREDIENTS) {
            const food: IFood|undefined = foods.find((item: IFood) => item.id == selectedFoodOrRecipeRowId);
            if (!food) { setErrorMessage("Food " + selectedFoodOrRecipeRowId + " not found"); return }
            const summary = generateSummary(food.nutrition, food, undefined)
            const nextIngredients = [
                ...ingredients,
                { food_ingredient_id: food.id, ordinal: ingredients.length, servings: ingredientServings, summary },
            ];
            setIngredients(nextIngredients);
            recalculateRecipeTotals(nextIngredients);
        } else {
            const recipe: IRecipe|undefined = recipes.find((item: IRecipe) => item.id == selectedFoodOrRecipeRowId);
            if (!recipe) { setErrorMessage("Recipe " + selectedFoodOrRecipeRowId + " for Ingredient not found"); return }
            const summary = generateSummary(recipe.nutrition, undefined, recipe)
            const nextIngredients = [
                ...ingredients,
                { recipe_ingredient_id: recipe.id, ordinal: ingredients.length, servings: ingredientServings, summary },
            ];
            setIngredients(nextIngredients);
            recalculateRecipeTotals(nextIngredients);
        }

        setSelectedFoodOrRecipeRowId(null);
    }

    const updateIngredient = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        if (!selectedIngredientRowId) return
        // No longer remove ingredient if servings is 0

        let summary: string|undefined = undefined
        let food: IFood|undefined = undefined
        let recipe: IRecipe|undefined = undefined
        // eslint-disable-next-line no-useless-assignment
        let nutrition: INutrition|undefined = undefined;
        const ingredient: IIngredient|undefined = findIngredient(selectedIngredientRowId)
        if (!ingredient) { setErrorMessage("Ingredient not found"); return }

        if (ingredient.food_ingredient_id) {
            food = foods.find((item: IFood) => item.id == ingredient.food_ingredient_id);
            if (!food) { setErrorMessage("Food " + ingredient.food_ingredient_id + " for Ingredient not found"); return }
            nutrition = food.nutrition
        } else if (ingredient.recipe_ingredient_id) {
            recipe = recipes.find((item: IRecipe) => item.id === ingredient.recipe_ingredient_id);
            if (!recipe) { setErrorMessage("Recipe " + ingredient.recipe_ingredient_id + " for Ingredient not found"); return }
            nutrition = recipe.nutrition
        } else {
            setErrorMessage("Invalid ingredient");
            return;
        }

        if (!nutrition) { setErrorMessage("Nutrition record for Ingredient not found"); return }

        summary = generateSummary(nutrition, food, recipe)
        const nextIngredients = ingredients.map((item) =>
            isSameIngredientRow(item, selectedIngredientRowId)
                ? { ...item, summary, servings: ingredientServings }
                : item
        )
        setIngredients(nextIngredients)
        recalculateRecipeTotals(nextIngredients)
    }

    const removeIngredient = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        if (!selectedIngredientRowId) return

        const ingredient: IIngredient|undefined = findIngredient(selectedIngredientRowId)
        if (!ingredient) { setErrorMessage("Unable to find Ingredient " + selectedIngredientRowId[0] + "/" + selectedIngredientRowId[1]); return }

        const filtered = ingredients.filter(item => !isSameIngredientRow(item, selectedIngredientRowId))
        const nextIngredients = filtered.map((item, index) => ({ ...item, ordinal: index }))
        setIngredients(nextIngredients)
        recalculateRecipeTotals(nextIngredients)
        setSelectedIngredientRowId(null)
    }

    const moveIngredientUp = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        if (!selectedIngredientRowId) return;

        const sorted = [...ingredients].sort((a, b) => a.ordinal - b.ordinal);
        const index = sorted.findIndex(item => isSameIngredientRow(item, selectedIngredientRowId));

        if (index < 0) {
            setErrorMessage("Unable to find Ingredient " + selectedIngredientRowId[0] + "/" + selectedIngredientRowId[1]);
            return;
        }
        if (index === 0) return;

        [sorted[index - 1], sorted[index]] = [sorted[index], sorted[index - 1]];
        const reindexed = sorted.map((item, idx) => ({ ...item, ordinal: idx }));
        setIngredients(reindexed);
    }

    const moveIngredientDown = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        if (!selectedIngredientRowId) return

        const sorted = [...ingredients].sort((a, b) => a.ordinal - b.ordinal);
        const index = sorted.findIndex(item => isSameIngredientRow(item, selectedIngredientRowId));

        if (index < 0) {
            setErrorMessage("Unable to find Ingredient " + selectedIngredientRowId[0] + "/" + selectedIngredientRowId[1]);
            return;
        }
        if (index >= sorted.length - 1) return;

        [sorted[index + 1], sorted[index]] = [sorted[index], sorted[index + 1]];
        const reindexed = sorted.map((item, idx) => ({ ...item, ordinal: idx }));
        setIngredients(reindexed);
    }

    useEffect(() => {
        if (recipeId) {
            fetchIngredients(recipeId).then(setIngredients);
        }
    }, [recipeId, fetchIngredients]);

    
    const noIngredientSelected = selectedIngredientRowId == null;
    const noFoodOrRecipeSelected = selectedFoodOrRecipeRowId == null;
    const noServingsForAdd = ingredientServings <= 0;
    const invalidServingsForUpdate = ingredientServings < 0;

    const incrementIngredientServings = () => {
        setIngredientServings(prev => prev + 1);
    };

    const decrementIngredientServings = () => {
        setIngredientServings(prev => Math.max(0, prev - 1));
    };

    const incrementRecipeServings = () => {
        const current = Number(getValues("servings") ?? 0);
        setValue("servings", current + 1, { shouldDirty: true, shouldValidate: true });
    };

    const decrementRecipeServings = () => {
        const current = Number(getValues("servings") ?? 0);
        setValue("servings", Math.max(0, current - 1), { shouldDirty: true, shouldValidate: true });
    };

    const totalRecipePrice = ingredients.reduce((total, ingredient) => {
        if (ingredient.food_ingredient_id) {
            const food = foods.find((item: IFood) => item.id === ingredient.food_ingredient_id);
            if (!food || food.servings <= 0) {
                return total;
            }

            return total + (food.price / food.servings) * ingredient.servings;
        }

        if (ingredient.recipe_ingredient_id) {
            const recipeIngredient = recipes.find((item: IRecipe) => item.id === ingredient.recipe_ingredient_id);
            if (!recipeIngredient || recipeIngredient.servings <= 0) {
                return total;
            }

            return total + (recipeIngredient.price / recipeIngredient.servings) * ingredient.servings;
        }

        return total;
    }, 0);

    const pricePerServing = recipeServings <= 0 ? "0.00" : (totalRecipePrice / recipeServings).toFixed(2);

    const perServingNutrition: INutrition = {
        serving_size_description: recipeNutrition.serving_size_description,
        serving_size_oz: recipeNutrition.serving_size_oz / (recipeServings > 0 ? recipeServings : 1),
        serving_size_g: recipeNutrition.serving_size_g / (recipeServings > 0 ? recipeServings : 1),
        calories: recipeNutrition.calories / (recipeServings > 0 ? recipeServings : 1),
        total_fat_g: recipeNutrition.total_fat_g / (recipeServings > 0 ? recipeServings : 1),
        saturated_fat_g: recipeNutrition.saturated_fat_g / (recipeServings > 0 ? recipeServings : 1),
        trans_fat_g: recipeNutrition.trans_fat_g / (recipeServings > 0 ? recipeServings : 1),
        cholesterol_mg: recipeNutrition.cholesterol_mg / (recipeServings > 0 ? recipeServings : 1),
        sodium_mg: recipeNutrition.sodium_mg / (recipeServings > 0 ? recipeServings : 1),
        total_carbs_g: recipeNutrition.total_carbs_g / (recipeServings > 0 ? recipeServings : 1),
        fiber_g: recipeNutrition.fiber_g / (recipeServings > 0 ? recipeServings : 1),
        total_sugar_g: recipeNutrition.total_sugar_g / (recipeServings > 0 ? recipeServings : 1),
        added_sugar_g: recipeNutrition.added_sugar_g / (recipeServings > 0 ? recipeServings : 1),
        protein_g: recipeNutrition.protein_g / (recipeServings > 0 ? recipeServings : 1),
        vitamin_d_mcg: recipeNutrition.vitamin_d_mcg / (recipeServings > 0 ? recipeServings : 1),
        calcium_mg: recipeNutrition.calcium_mg / (recipeServings > 0 ? recipeServings : 1),
        iron_mg: recipeNutrition.iron_mg / (recipeServings > 0 ? recipeServings : 1),
        potassium_mg: recipeNutrition.potassium_mg / (recipeServings > 0 ? recipeServings : 1),
    };

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
                <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ width: '100%' }}>

                    {/* ── Basic Info ── */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <Controller
                                name="cuisine"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        select
                                        label="Cuisine"
                                        id="cuisine"
                                        value={field.value ?? ""}
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        inputRef={field.ref}
                                        error={!!errors.cuisine}
                                        helperText={errors.cuisine?.message}
                                        fullWidth
                                        required
                                    >
                                        <MenuItem value="">-- select one --</MenuItem>
                                        {cuisines.filter(option => option.value !== "").map((option) => (
                                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 5 }}>
                            <TextField
                                label="Name"
                                id="name"
                                {...register("name")}
                                error={!!errors.name}
                                helperText={errors.name?.message}
                                inputProps={{ maxLength: 50 }}
                                fullWidth
                                required
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <TextField
                                label="Total Yield"
                                id="totalyield"
                                {...register("total_yield")}
                                error={!!errors.total_yield}
                                helperText={errors.total_yield?.message}
                                inputProps={{ maxLength: 50 }}
                                fullWidth
                                required
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 1 }}>
                            <TextField
                                label="Servings"
                                id="servings"
                                type="number"
                                {...register("servings", { valueAsNumber: true })}
                                error={!!errors.servings}
                                helperText={errors.servings?.message}
                                inputProps={{ min: 0 }}
                                fullWidth
                                required
                                slotProps={{
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <Stack spacing={0} sx={{ ml: 0.25 }}>
                                                    <IconButton
                                                        type="button"
                                                        size="small"
                                                        aria-label="Increase recipe servings"
                                                        onClick={incrementRecipeServings}
                                                        sx={{ p: 0.25 }}
                                                    >
                                                        <KeyboardArrowUpIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        type="button"
                                                        size="small"
                                                        aria-label="Decrease recipe servings"
                                                        onClick={decrementRecipeServings}
                                                        sx={{ p: 0.25 }}
                                                    >
                                                        <KeyboardArrowDownIcon fontSize="small" />
                                                    </IconButton>
                                                </Stack>
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />
                        </Grid>
                    </Grid>


                    {/* ── Main Content: Stacked Ingredient Shuttle + NutritionLabel (wide) ── */}
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>

                        {/* Left: Stacked ingredient shuttle (always stacked) */}
                        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>

                            {/* Serving size on narrow viewports only */}
                            {isNarrow && (
                                <TextField
                                    label="Serving Size"
                                    id="serving_size_description_narrow"
                                    {...register("nutrition.serving_size_description")}
                                    error={!!errors.nutrition?.serving_size_description}
                                    helperText={errors.nutrition?.serving_size_description?.message}
                                    inputProps={{ maxLength: 100 }}
                                    size="small"
                                    fullWidth
                                    required
                                />
                            )}

                            {/* Selected Ingredients */}
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Selected Ingredients</Typography>
                                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                    <IngredientsTable
                                        data={[...ingredients].sort((a,b) => a.ordinal - b.ordinal)}
                                        setSelectedRowId={handleIngredientRowSelect}
                                        selectedRowId={selectedIngredientRowId} />
                                </Box>
                            </Box>

                            {/* Action bar */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 2, justifyContent: 'center' }}>
                                {/* Servings input */}
                                <Tooltip title="Number of servings of the selected Food or Recipe to add" placement="top" arrow>
                                    <TextField
                                        label="Servings"
                                        id="ingredientServingsInput"
                                        type="number"
                                        value={ingredientServings}
                                        onChange={(e) => setIngredientServings(Number(e.target.value))}
                                        inputProps={{ min: 0, step: 'any' }}
                                        size="small"
                                        sx={{ width: 120 }}
                                        slotProps={{
                                            input: {
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <Stack spacing={0} sx={{ ml: 0.25 }}>
                                                            <IconButton
                                                                size="small"
                                                                aria-label="Increase servings"
                                                                onClick={incrementIngredientServings}
                                                                sx={{ p: 0.25 }}
                                                            >
                                                                <KeyboardArrowUpIcon fontSize="small" />
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                aria-label="Decrease servings"
                                                                onClick={decrementIngredientServings}
                                                                sx={{ p: 0.25 }}
                                                            >
                                                                <KeyboardArrowDownIcon fontSize="small" />
                                                            </IconButton>
                                                        </Stack>
                                                    </InputAdornment>
                                                ),
                                            },
                                        }}
                                    />
                                </Tooltip>

                                <Divider orientation="vertical" flexItem />

                                {/* Add */}
                                <Tooltip title="Add the selected Food or Recipe to the ingredient list" placement="top" arrow>
                                    <span>
                                        <Button
                                            type="button"
                                            variant="contained"
                                            size="small"
                                            disabled={noFoodOrRecipeSelected || noServingsForAdd}
                                            onClick={addIngredient}
                                            sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' } }}
                                        >
                                            Add
                                        </Button>
                                    </span>
                                </Tooltip>

                                {/* Update */}
                                <Tooltip title="Update the servings for the selected ingredient" placement="top" arrow>
                                    <span>
                                        <Button
                                            type="button"
                                            variant="contained"
                                            size="small"
                                            disabled={noIngredientSelected || invalidServingsForUpdate}
                                            onClick={updateIngredient}
                                            sx={{ bgcolor: 'warning.main', '&:hover': { bgcolor: 'warning.dark' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' }, color: 'warning.contrastText' }}
                                        >
                                            Update
                                        </Button>
                                    </span>
                                </Tooltip>

                                {/* Remove */}
                                <Tooltip title="Remove the selected ingredient from the recipe" placement="top" arrow>
                                    <span>
                                        <Button
                                            type="button"
                                            variant="contained"
                                            size="small"
                                            disabled={noIngredientSelected}
                                            onClick={removeIngredient}
                                            sx={{ bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' } }}
                                        >
                                            Remove
                                        </Button>
                                    </span>
                                </Tooltip>

                                <Divider orientation="vertical" flexItem />

                                {/* Move Up */}
                                <Tooltip title="Move the selected ingredient up in the list" placement="top" arrow>
                                    <span>
                                        <Button
                                            type="button"
                                            variant="outlined"
                                            size="small"
                                            disabled={noIngredientSelected}
                                            onClick={moveIngredientUp}
                                            color="primary"
                                        >
                                            ▲ Up
                                        </Button>
                                    </span>
                                </Tooltip>

                                {/* Move Down */}
                                <Tooltip title="Move the selected ingredient down in the list" placement="top" arrow>
                                    <span>
                                        <Button
                                            type="button"
                                            variant="outlined"
                                            size="small"
                                            disabled={noIngredientSelected}
                                            onClick={moveIngredientDown}
                                            color="primary"
                                        >
                                            ▼ Down
                                        </Button>
                                    </span>
                                </Tooltip>
                            </Box>

                            {/* Available Ingredients */}
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>Available Ingredients</Typography>
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
                                            excludeRecipeId={recipeId}
                                    />
                                )}
                            </Box>

                            {/* ── Save / Cancel ── */}
                            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
                                <Button type="submit" variant="contained" color="primary" disabled={saveIsDisabled}>
                                    Save
                                </Button>
                                <Button type="button" variant="outlined" color="secondary" onClick={handleCancel}>
                                    Cancel
                                </Button>
                            </Stack>
                        </Box>

                        {/* Right: Serving Size + NutritionLabel (hidden on narrow) */}
                        {!isNarrow && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: 280, flexShrink: 0 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    Nutrition <Typography component="span" variant="body2" color="text.secondary">(per serving)</Typography>
                                </Typography>
                                <TextField
                                    label="Serving Size"
                                    id="serving_size_description"
                                    {...register("nutrition.serving_size_description")}
                                    error={!!errors.nutrition?.serving_size_description}
                                    helperText={errors.nutrition?.serving_size_description?.message}
                                    inputProps={{ maxLength: 100 }}
                                    size="small"
                                    fullWidth
                                    required
                                />
                                <TextField
                                    label="Price ($/serving)"
                                    value={pricePerServing}
                                    size="small"
                                    fullWidth
                                    slotProps={{ input: { readOnly: true } }}
                                    sx={{
                                        '& .MuiInputBase-input': { color: 'text.secondary' },
                                        '& .MuiInputBase-root': { backgroundColor: 'grey.100' },
                                    }}
                                />
                                <NutritionLabel nutrition={perServingNutrition} />
                            </Box>
                        )}
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
}

export default RecipeForm;
