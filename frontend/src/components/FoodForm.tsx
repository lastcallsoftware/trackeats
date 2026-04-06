import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { IFood } from "../contexts/DataProvider";
import { foodGroups } from "./FoodGroups";
import TitleCard from "./TitleCard";
import { useData, Food } from "@/utils/useData";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Grid,
    Paper,
    Typography,
    TextField,
    MenuItem,
    Button,
    Divider,
    Box
} from '@mui/material';

const nutritionSchema = z.object({
    serving_size_description: z.string().max(50, "Must be 50 characters or fewer"),
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

const foodSchema = z.object({
    id: z.number().optional(),
    group: z.string().min(1, "Food group is required"),
    vendor: z.string().trim().min(1, "Vendor is required").max(50, "Must be 50 characters or fewer"),
    name: z.string().trim().min(1, "Name is required").max(50, "Must be 50 characters or fewer"),
    subtype: z.string().max(50, "Must be 50 characters or fewer"),
    description: z.string().max(100, "Must be 100 characters or fewer"),
    size_description: z.string().max(50, "Must be 50 characters or fewer"),
    size_oz: z.coerce.number().min(0, "Must be 0 or greater"),
    size_g: z.coerce.number().min(0, "Must be 0 or greater"),
    servings: z.coerce.number().gt(0, "Servings must be greater than 0"),
    nutrition_id: z.number().optional(),
    nutrition: nutritionSchema,
    price: z.coerce.number().min(0, "Must be 0 or greater"),
    price_per_serving: z.coerce.number().optional().default(0),
    price_per_oz: z.coerce.number().optional().default(0),
    price_per_calorie: z.coerce.number().optional().default(0),
    price_date: z
        .string()
        .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Invalid date format"),
    shelf_life: z.string().max(150, "Must be 150 characters or fewer"),
});

type FoodFormInput = z.input<typeof foodSchema>;
type FoodFormValues = z.output<typeof foodSchema>;

function FoodForm() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { foods, addFood, updateFood } = useData();

    const { id } = useParams();
    const isEditMode = Boolean(id)
    const food = isEditMode ? foods.find(f => f.id === Number(id)) : null;
    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors },
    } = useForm<FoodFormInput, unknown, FoodFormValues>({
        mode: "onBlur",
        reValidateMode: "onChange",
        resolver: zodResolver(foodSchema),
        defaultValues: (food || new Food()) as FoodFormInput,
    });

    useEffect(() => {
        reset((food || new Food()) as FoodFormInput);
    }, [food, reset]);
    
    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    const onSubmit = async (data: FoodFormValues) => {
        // Save the new Food
        if (isEditMode)
            await updateFood(data as IFood);
        else
            await addFood(data as IFood);
        
        // Return to the Foods page
        const returnPath = searchParams.get("returnTo") || "/foods"
        navigate(returnPath)
    }

    const handleCancel = (e: { preventDefault: () => void; }) => {
        e.preventDefault();

        // Return to the Foods page
        const returnPath = searchParams.get("returnTo") || "/foods"
        navigate(returnPath)
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #e3f2fd 0%, #fce4ec 100%)',
                py: { xs: 3, sm: 5 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            <TitleCard title={isEditMode ? 'Edit Food' : 'Add Food'} subtitle="Enter food and nutrition details" />
            <Paper elevation={3} sx={{ maxWidth: 1200, width: '95%', p: 4 }}>
            <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" noValidate>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller
                            name="group"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    select
                                    label="Food Group"
                                    id="food-group"
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    inputRef={field.ref}
                                    error={!!errors.group}
                                    helperText={errors.group?.message}
                                    fullWidth
                                    required
                                >
                                    {foodGroups.map(option => (
                                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
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
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Subtype"
                            id="subtype"
                            {...register("subtype")}
                            error={!!errors.subtype}
                            helperText={errors.subtype?.message}
                            inputProps={{ maxLength: 50 }}
                            fullWidth
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Vendor"
                            id="vendor"
                            {...register("vendor")}
                            error={!!errors.vendor}
                            helperText={errors.vendor?.message}
                            inputProps={{ maxLength: 50 }}
                            fullWidth
                            required
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Description"
                            id="description"
                            {...register("description")}
                            error={!!errors.description}
                            helperText={errors.description?.message}
                            inputProps={{ maxLength: 100 }}
                            fullWidth
                            multiline
                            minRows={2}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Size Description"
                            id="size_description"
                            {...register("size_description")}
                            error={!!errors.size_description}
                            helperText={errors.size_description?.message}
                            inputProps={{ maxLength: 50 }}
                            fullWidth
                        />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <TextField
                            label="Size (oz)"
                            id="size_oz"
                            type="number"
                            {...register("size_oz", { valueAsNumber: true })}
                            error={!!errors.size_oz}
                            helperText={errors.size_oz?.message}
                            inputProps={{ min: 0, step: 0.01 }}
                            fullWidth
                        />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <TextField
                            label="Size (g)"
                            id="size_g"
                            type="number"
                            {...register("size_g", { valueAsNumber: true })}
                            error={!!errors.size_g}
                            helperText={errors.size_g?.message}
                            inputProps={{ min: 0 }}
                            fullWidth
                        />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <TextField
                            label="Servings"
                            id="servings"
                            type="number"
                            {...register("servings", { valueAsNumber: true })}
                            error={!!errors.servings}
                            helperText={errors.servings?.message}
                            inputProps={{ min: 0, step: 0.01 }}
                            fullWidth
                            required
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 9 }}>
                        <TextField
                            label="Shelf Life"
                            id="shelf_life"
                            {...register("shelf_life")}
                            error={!!errors.shelf_life}
                            helperText={errors.shelf_life?.message}
                            inputProps={{ maxLength: 150 }}
                            fullWidth
                            multiline
                            minRows={2}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField
                            label="Price ($)"
                            id="price"
                            type="number"
                            {...register("price", { valueAsNumber: true })}
                            error={!!errors.price}
                            helperText={errors.price?.message}
                            inputProps={{ min: 0, step: 0.01 }}
                            fullWidth
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Price Date"
                            id="price_date"
                            type="date"
                            {...register("price_date")}
                            error={!!errors.price_date}
                            helperText={errors.price_date?.message}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <Divider sx={{ my: 1.5 }} />
                    </Grid>
                    <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                        >
                            Save
                        </Button>
                        <Button variant="outlined" color="secondary" onClick={handleCancel}>
                            Cancel
                        </Button>
                    </Grid>
                </Grid>
                </Box>

                <Box
                    sx={{
                        width: { xs: '100%', md: 380 },
                        boxSizing: 'border-box',
                        bgcolor: '#fff',
                        color: '#222',
                        border: '2px solid #222',
                        borderRadius: 2,
                        p: 2,
                        boxShadow: 2,
                        fontFamily: 'Arial Narrow, Arial, sans-serif',
                        '& .MuiInputLabel-root': {
                            fontSize: '0.72rem',
                        },
                        '& .MuiInputBase-input': {
                            fontSize: '0.72rem',
                            py: 0.35,
                        },
                        '& .MuiFormHelperText-root': {
                            fontSize: '0.62rem',
                            lineHeight: 1.1,
                            mt: 0.25,
                        },
                        '& .nutrition-input-rows .MuiTypography-root': {
                            fontSize: '0.78rem',
                            lineHeight: 1.1,
                        },
                    }}
                >
                    <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: 1, mb: 1 }}>
                        Nutrition Facts
                    </Typography>
                    <Divider sx={{ borderBottomWidth: 4, mb: 1 }} />

                    <TextField
                        label="Serving Size Description"
                        id="serving_size_description"
                        {...register("nutrition.serving_size_description")}
                        error={!!errors.nutrition?.serving_size_description}
                        helperText={errors.nutrition?.serving_size_description?.message}
                        inputProps={{ maxLength: 50 }}
                        size="small"
                        fullWidth
                        sx={{
                            mb: 1,
                            '& .MuiInputBase-input': {
                                py: 0.75,
                            },
                            mt: 0.5 
                        }}
                    />

                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, mb: 1 }}>
                        <TextField
                            label="Serving Size (oz)"
                            id="serving_size_oz"
                            type="number"
                            {...register("nutrition.serving_size_oz", { valueAsNumber: true })}
                            error={!!errors.nutrition?.serving_size_oz}
                            helperText={errors.nutrition?.serving_size_oz?.message}
                            inputProps={{ min: 0, step: 0.01 }}
                            size="small"
                            fullWidth
                            sx={{
                                '& .MuiInputBase-input': {
                                    py: 0.75,
                                },
                            }}
                        />
                        <TextField
                            label="Serving Size (g)"
                            id="serving_size_g"
                            type="number"
                            {...register("nutrition.serving_size_g", { valueAsNumber: true })}
                            error={!!errors.nutrition?.serving_size_g}
                            helperText={errors.nutrition?.serving_size_g?.message}
                            inputProps={{ min: 0 }}
                            size="small"
                            fullWidth
                            sx={{
                                '& .MuiInputBase-input': {
                                    py: 0.75,
                                },
                            }}
                        />
                    </Box>

                    <Divider sx={{ borderBottomWidth: 2, my: 1 }} />

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="h5" sx={{ fontWeight: 900 }}>
                            Calories
                        </Typography>
                        <TextField
                            id="calories"
                            type="number"
                            {...register("nutrition.calories", { valueAsNumber: true })}
                            error={!!errors.nutrition?.calories}
                            inputProps={{ min: 0 }}
                            size="small"
                            sx={{
                                width: 110,
                                '& .MuiInputBase-input': {
                                    py: 0.75,
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                },
                            }}
                        />
                    </Box>

                    <Divider sx={{ borderBottomWidth: 2, my: 1 }} />

                    <Box className="nutrition-input-rows" sx={{ display: 'flex', flexDirection: 'column', gap: 0.45 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontWeight: 700 }}>Total Fat (g)</Typography>
                            <TextField id="total_fat_g" type="number" {...register("nutrition.total_fat_g", { valueAsNumber: true })} error={!!errors.nutrition?.total_fat_g} inputProps={{ min: 0, step: 0.1 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pl: 2 }}>
                            <Typography>Saturated Fat (g)</Typography>
                            <TextField id="saturated_fat_g" type="number" {...register("nutrition.saturated_fat_g", { valueAsNumber: true })} error={!!errors.nutrition?.saturated_fat_g} inputProps={{ min: 0, step: 0.1 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pl: 2 }}>
                            <Typography>Trans Fat (g)</Typography>
                            <TextField id="trans_fat_g" type="number" {...register("nutrition.trans_fat_g", { valueAsNumber: true })} error={!!errors.nutrition?.trans_fat_g} inputProps={{ min: 0, step: 0.1 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontWeight: 700 }}>Cholesterol (mg)</Typography>
                            <TextField id="cholesterol_mg" type="number" {...register("nutrition.cholesterol_mg", { valueAsNumber: true })} error={!!errors.nutrition?.cholesterol_mg} inputProps={{ min: 0 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontWeight: 700 }}>Sodium (mg)</Typography>
                            <TextField id="sodium_mg" type="number" {...register("nutrition.sodium_mg", { valueAsNumber: true })} error={!!errors.nutrition?.sodium_mg} inputProps={{ min: 0 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontWeight: 700 }}>Total Carbohydrate (g)</Typography>
                            <TextField id="total_carbs_g" type="number" {...register("nutrition.total_carbs_g", { valueAsNumber: true })} error={!!errors.nutrition?.total_carbs_g} inputProps={{ min: 0, step: 0.1 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pl: 2 }}>
                            <Typography>Dietary Fiber (g)</Typography>
                            <TextField id="fiber_g" type="number" {...register("nutrition.fiber_g", { valueAsNumber: true })} error={!!errors.nutrition?.fiber_g} inputProps={{ min: 0, step: 0.1 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pl: 2 }}>
                            <Typography>Total Sugars (g)</Typography>
                            <TextField id="total_sugar_g" type="number" {...register("nutrition.total_sugar_g", { valueAsNumber: true })} error={!!errors.nutrition?.total_sugar_g} inputProps={{ min: 0, step: 0.1 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pl: 2 }}>
                            <Typography>Added Sugars (g)</Typography>
                            <TextField id="added_sugar_g" type="number" {...register("nutrition.added_sugar_g", { valueAsNumber: true })} error={!!errors.nutrition?.added_sugar_g} inputProps={{ min: 0, step: 0.1 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontWeight: 700 }}>Protein (g)</Typography>
                            <TextField id="protein_g" type="number" {...register("nutrition.protein_g", { valueAsNumber: true })} error={!!errors.nutrition?.protein_g} inputProps={{ min: 0, step: 0.1 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontWeight: 700 }}>Vitamin D (mcg)</Typography>
                            <TextField id="vitamin_d_mcg" type="number" {...register("nutrition.vitamin_d_mcg", { valueAsNumber: true })} error={!!errors.nutrition?.vitamin_d_mcg} inputProps={{ min: 0, step: 0.1 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontWeight: 700 }}>Calcium (mg)</Typography>
                            <TextField id="calcium_mg" type="number" {...register("nutrition.calcium_mg", { valueAsNumber: true })} error={!!errors.nutrition?.calcium_mg} inputProps={{ min: 0, step: 0.1 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontWeight: 700 }}>Iron (mg)</Typography>
                            <TextField id="iron_mg" type="number" {...register("nutrition.iron_mg", { valueAsNumber: true })} error={!!errors.nutrition?.iron_mg} inputProps={{ min: 0, step: 0.1 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontWeight: 700 }}>Potassium (mg)</Typography>
                            <TextField id="potassium_mg" type="number" {...register("nutrition.potassium_mg", { valueAsNumber: true })} error={!!errors.nutrition?.potassium_mg} inputProps={{ min: 0, step: 0.1 }} size="small" sx={{ width: 110 }} />
                        </Box>
                    </Box>
                </Box>
                </Box>
            </form>
            </Paper>
        </Box>
    );
}

export default FoodForm;
