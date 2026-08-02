import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { IFood } from "../contexts/DataProvider";
import { foodGroups } from "./FoodGroups";
import TitleCard from "./TitleCard";
import { useData, Food } from "@/utils/useData";
import { useToast } from "@/contexts/ToastContext";
import { Controller, useForm, useWatch, useFieldArray } from "react-hook-form";
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
    Box,
    Alert,
    FormControlLabel,
    Checkbox,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

const CANONICAL_MASS_UNITS: string[] = ["g", "oz", "lb", "kg"];
const CANONICAL_VOLUME_UNITS: string[] = ["ml", "cup", "tbsp", "tsp", "fl oz", "L"];

const getCanonicalUnitsForKind = (kind: string | null | undefined): string[] => {
    if (kind === "mass") return CANONICAL_MASS_UNITS;
    if (kind === "volume") return CANONICAL_VOLUME_UNITS;
    return [];
};

const nutritionSchema = z.object({
    serving_size_description: z.string().max(50, "Must be 50 characters or fewer"),
    serving_size_oz: z.coerce.number().min(0, "Must be 0 or greater"),
    serving_size_g: z.coerce.number().int("Must be an integer").min(0, "Must be 0 or greater"),
    calories: z.coerce.number().int("Must be an integer").min(0, "Must be 0 or greater"),
    total_fat_g: z.coerce.number().min(0, "Must be 0 or greater"),
    saturated_fat_g: z.coerce.number().min(0, "Must be 0 or greater"),
    trans_fat_g: z.coerce.number().min(0, "Must be 0 or greater"),
    cholesterol_mg: z.coerce.number().int("Must be an integer").min(0, "Must be 0 or greater"),
    sodium_mg: z.coerce.number().int("Must be an integer").min(0, "Must be 0 or greater"),
    total_carbs_g: z.coerce.number().int("Must be an integer").min(0, "Must be 0 or greater"),
    fiber_g: z.coerce.number().int("Must be an integer").min(0, "Must be 0 or greater"),
    total_sugar_g: z.coerce.number().int("Must be an integer").min(0, "Must be 0 or greater"),
    added_sugar_g: z.coerce.number().int("Must be an integer").min(0, "Must be 0 or greater"),
    protein_g: z.coerce.number().int("Must be an integer").min(0, "Must be 0 or greater"),
    vitamin_d_mcg: z.coerce.number().int("Must be an integer").min(0, "Must be 0 or greater"),
    calcium_mg: z.coerce.number().int("Must be an integer").min(0, "Must be 0 or greater"),
    iron_mg: z.coerce.number().min(0, "Must be 0 or greater"),
    potassium_mg: z.coerce.number().min(0, "Must be 0 or greater"),
    // Structured serving fields (Slice I — accepted in form submits)
    serving_value: z.coerce.number().positive("Must be greater than 0").nullable().optional(),
    serving_unit: z.string().max(50, "Must be 50 characters or fewer").nullable().optional(),
    serving_unit_kind: z.enum(["mass", "volume", "household", "unknown"]).nullable().optional(),
});

const nutritionAlternativeSchema = z.object({
    serving_value: z.coerce.number().positive("Must be greater than 0"),
    serving_unit: z.string().min(1, "Unit is required").max(50),
    serving_unit_kind: z.enum(["mass", "volume", "household", "unknown"]),
    ordinal: z.coerce.number().int().min(0).default(0),
    nutrition: nutritionSchema,
});

const foodSchema = z.object({
    id: z.number().optional(),
    group: z.string().min(1, "Food group is required"),
    vendor: z.string().trim().min(1, "Vendor is required").max(50, "Must be 50 characters or fewer"),
    name: z.string().trim().min(1, "Name is required").max(50, "Must be 50 characters or fewer"),
    subtype: z.string().max(50, "Must be 50 characters or fewer"),
    description: z.string().max(100, "Must be 100 characters or fewer"),
    size_description: z.string().max(50, "Must be 50 characters or fewer"),
    size_description_2: z.string().max(50, "Must be 50 characters or fewer").nullable().optional(),
    size_oz: z.coerce.number().min(0, "Must be 0 or greater"),
    size_g: z.coerce.number().min(0, "Must be 0 or greater"),
    servings: z.coerce.number().gt(0, "Servings must be greater than 0"),
    nutrition_id: z.number().optional(),
    nutrition: nutritionSchema,
    price: z.coerce.number().min(0, "Must be 0 or greater"),
    price_per_serving: z.coerce.number().optional().default(0),
    price_per_oz: z.coerce.number().optional().default(0),
    price_per_calorie: z.coerce.number().optional().default(0),
    starter_food: z.boolean().optional().default(false),
    price_date: z
        .string()
        .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Invalid date format"),
    shelf_life: z.string().max(150, "Must be 150 characters or fewer"),
    nutrition_alternatives: z.array(nutritionAlternativeSchema).optional().default([]),
});

type FoodFormInput = z.input<typeof foodSchema>;
type FoodFormValues = z.output<typeof foodSchema>;

// ── Serving unit field: canonical dropdown for mass/volume, free text for household/unknown ──
const ServingUnitField: React.FC<{
    control: ReturnType<typeof useForm<FoodFormInput>>["control"];
    errors: ReturnType<typeof useForm<FoodFormInput>>["formState"]["errors"];
}> = ({ control, errors }) => {
    const unitKind = useWatch({ control, name: "nutrition.serving_unit_kind" });
    const canonicalUnits = getCanonicalUnitsForKind(unitKind);

    if (unitKind === "mass" || unitKind === "volume") {
        // Clear serving_unit when switching away from these kinds
        return (
            <Controller
                name="nutrition.serving_unit"
                control={control}
                render={({ field }) => (
                    <TextField
                        select
                        label="Serving Unit"
                        id="serving_unit"
                        value={canonicalUnits.includes(field.value ?? "") ? (field.value ?? "") : ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        onBlur={field.onBlur}
                        inputRef={field.ref}
                        error={!!errors.nutrition?.serving_unit}
                        helperText={errors.nutrition?.serving_unit?.message}
                        size="small"
                        sx={{ flex: 1, '& .MuiInputBase-input': { py: 0.75 } }}
                    >
                        <MenuItem value=""><em>Select unit</em></MenuItem>
                        {canonicalUnits.map(u => (
                            <MenuItem key={u} value={u}>{u}</MenuItem>
                        ))}
                    </TextField>
                )}
            />
        );
    }

    // Free-text for household / unknown / legacy
    return (
        <TextField
            label="Serving Unit"
            id="serving_unit"
            {...control.register("nutrition.serving_unit")}
            error={!!errors.nutrition?.serving_unit}
            helperText={errors.nutrition?.serving_unit?.message}
            inputProps={{ maxLength: 50 }}
            placeholder={unitKind === "household" ? "e.g. slice, medium banana" : ""}
            size="small"
            sx={{ flex: 1, '& .MuiInputBase-input': { py: 0.75 } }}
        />
    );
};


function FoodForm() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { foods, addFood, updateFood, canWrite, isAdmin } = useData();
    const { showToast } = useToast();

    const { id } = useParams();
    const isEditMode = Boolean(id)
    const food = isEditMode ? foods.find(f => f.id === Number(id)) : null;
    const {
        register,
        handleSubmit,
        reset,
        control,
        setValue,
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

    // Alternatives field array
    const { fields: altFields, append, remove } = useFieldArray({
        control,
        name: "nutrition_alternatives",
    });

    // Build a default empty nutrition object for alternative pre-population
    const emptyNutrition = {
        serving_size_description: "",
        serving_size_oz: 0,
        serving_size_g: 0,
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
        serving_value: null as number | null,
        serving_unit: null as string | null,
        serving_unit_kind: null as "mass" | "volume" | "household" | "unknown" | null,
    };

    const handleAddAlternative = () => {
        append({
            serving_value: 0,
            serving_unit: "g",
            serving_unit_kind: "mass" as const,
            ordinal: altFields.length,
            nutrition: { ...emptyNutrition },
        });
    };

    const onSubmit = async (data: FoodFormValues) => {
        if (!canWrite) {
            showToast("Your account is read-only.", 'error')
            return
        }

        const payload = {
            ...data,
            size_description_2: data.size_description_2 && data.size_description_2.trim().length > 0
                ? data.size_description_2
                : null,
            starter_food: isAdmin ? Boolean(data.starter_food) : false,
        };

        // Save the new Food
        if (isEditMode)
            await updateFood(payload as IFood);
        else
            await addFood(payload as IFood);
        
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
                {!canWrite ? (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        This account is read-only. Saving changes is disabled.
                    </Alert>
                ) : null}
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
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Size Description 2"
                            id="size_description_2"
                            {...register("size_description_2")}
                            error={!!errors.size_description_2}
                            helperText={errors.size_description_2?.message}
                            inputProps={{ maxLength: 50 }}
                            fullWidth
                        />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <TextField
                            label="Size (oz)"
                            id="size_oz"
                            type="number"
                            {...register("size_oz", {
                                valueAsNumber: true,
                                onChange: (event) => {
                                    const nextOz = Number(event.target.value);
                                    if (!Number.isNaN(nextOz)) {
                                        setValue('size_g', Math.round(nextOz * 28.3495), { shouldValidate: true });
                                    }
                                },
                            })}
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
                                {...register("size_g", {
                                    valueAsNumber: true,
                                    onChange: (event) => {
                                        const nextG = Number(event.target.value);
                                        if (!Number.isNaN(nextG)) {
                                            setValue('size_oz', parseFloat((nextG / 28.3495).toFixed(2)), { shouldValidate: true });
                                        }
                                    },
                                })}
                                error={!!errors.size_g}
                                helperText={errors.size_g?.message}
                                inputProps={{ min: 0, step: 1 }}
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
                                inputProps={{ min: 0, step: 1 }}
                                fullWidth
                                required
                            />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
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
                    <Grid size={{ xs: 12, sm: 3 }} />

                    {isAdmin ? (
                        <Grid size={{ xs: 12 }}>
                            <Controller
                                name="starter_food"
                                control={control}
                                render={({ field }) => (
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={Boolean(field.value)}
                                                onChange={(event) => field.onChange(event.target.checked)}
                                            />
                                        }
                                        label="Starter food (included in new-user seed set)"
                                    />
                                )}
                            />
                        </Grid>
                    ) : null}

                    <Grid size={{ xs: 12 }}>
                        <Divider sx={{ my: 1.5 }} />
                    </Grid>
                    <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={!canWrite}
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
                            {...register("nutrition.serving_size_oz", {
                                valueAsNumber: true,
                                onChange: (event) => {
                                    const nextOz = Number(event.target.value);
                                    if (!Number.isNaN(nextOz)) {
                                        setValue('nutrition.serving_size_g', Math.round(nextOz * 28.3495), { shouldValidate: true });
                                    }
                                },
                            })}
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
                            {...register("nutrition.serving_size_g", {
                                valueAsNumber: true,
                                onChange: (event) => {
                                    const nextG = Number(event.target.value);
                                    if (!Number.isNaN(nextG)) {
                                        setValue('nutrition.serving_size_oz', parseFloat((nextG / 28.3495).toFixed(2)), { shouldValidate: true });
                                    }
                                },
                            })}
                            error={!!errors.nutrition?.serving_size_g}
                            helperText={errors.nutrition?.serving_size_g?.message}
                            inputProps={{ min: 0, step: 1 }}
                            size="small"
                            fullWidth
                            sx={{
                                '& .MuiInputBase-input': {
                                    py: 0.75,
                                },
                            }}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Controller
                            name="nutrition.serving_unit_kind"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    select
                                    label="Unit Kind"
                                    id="serving_unit_kind"
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    inputRef={field.ref}
                                    error={!!errors.nutrition?.serving_unit_kind}
                                    helperText={errors.nutrition?.serving_unit_kind?.message}
                                    size="small"
                                    sx={{ flex: 1, '& .MuiInputBase-input': { py: 0.75 } }}
                                >
                                    <MenuItem value=""><em>None (legacy)</em></MenuItem>
                                    <MenuItem value="mass">Mass</MenuItem>
                                    <MenuItem value="volume">Volume</MenuItem>
                                    <MenuItem value="household">Household</MenuItem>
                                    <MenuItem value="unknown">Unknown</MenuItem>
                                </TextField>
                            )}
                        />
                        <TextField
                            label="Serving Value"
                            id="serving_value"
                            type="number"
                            {...register("nutrition.serving_value", { valueAsNumber: true })}
                            error={!!errors.nutrition?.serving_value}
                            helperText={errors.nutrition?.serving_value?.message}
                            inputProps={{ min: 0, step: 0.01 }}
                            size="small"
                            sx={{ flex: 1, '& .MuiInputBase-input': { py: 0.75 } }}
                        />
                        <ServingUnitField control={control} errors={errors} />
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
                            inputProps={{ min: 0, step: 1 }}
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
                            <TextField id="cholesterol_mg" type="number" {...register("nutrition.cholesterol_mg", { valueAsNumber: true })} error={!!errors.nutrition?.cholesterol_mg} inputProps={{ min: 0, step: 1 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontWeight: 700 }}>Sodium (mg)</Typography>
                            <TextField id="sodium_mg" type="number" {...register("nutrition.sodium_mg", { valueAsNumber: true })} error={!!errors.nutrition?.sodium_mg} inputProps={{ min: 0, step: 1 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontWeight: 700 }}>Total Carbohydrate (g)</Typography>
                            <TextField id="total_carbs_g" type="number" {...register("nutrition.total_carbs_g", { valueAsNumber: true })} error={!!errors.nutrition?.total_carbs_g} inputProps={{ min: 0, step: 1 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pl: 2 }}>
                            <Typography>Dietary Fiber (g)</Typography>
                            <TextField id="fiber_g" type="number" {...register("nutrition.fiber_g", { valueAsNumber: true })} error={!!errors.nutrition?.fiber_g} inputProps={{ min: 0, step: 1 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pl: 2 }}>
                            <Typography>Total Sugars (g)</Typography>
                            <TextField id="total_sugar_g" type="number" {...register("nutrition.total_sugar_g", { valueAsNumber: true })} error={!!errors.nutrition?.total_sugar_g} inputProps={{ min: 0, step: 1 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pl: 2 }}>
                            <Typography>Added Sugars (g)</Typography>
                            <TextField id="added_sugar_g" type="number" {...register("nutrition.added_sugar_g", { valueAsNumber: true })} error={!!errors.nutrition?.added_sugar_g} inputProps={{ min: 0, step: 1 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontWeight: 700 }}>Protein (g)</Typography>
                            <TextField id="protein_g" type="number" {...register("nutrition.protein_g", { valueAsNumber: true })} error={!!errors.nutrition?.protein_g} inputProps={{ min: 0, step: 1 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontWeight: 700 }}>Vitamin D (mcg)</Typography>
                            <TextField id="vitamin_d_mcg" type="number" {...register("nutrition.vitamin_d_mcg", { valueAsNumber: true })} error={!!errors.nutrition?.vitamin_d_mcg} inputProps={{ min: 0, step: 1 }} size="small" sx={{ width: 110 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontWeight: 700 }}>Calcium (mg)</Typography>
                            <TextField id="calcium_mg" type="number" {...register("nutrition.calcium_mg", { valueAsNumber: true })} error={!!errors.nutrition?.calcium_mg} inputProps={{ min: 0, step: 1 }} size="small" sx={{ width: 110 }} />
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

                {/* Serving Alternatives Accordion — full width below the form + nutrition columns */}
                <Box sx={{ mt: 3 }}>
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                Serving Alternatives {altFields.length > 0 ? `(${altFields.length})` : ""}
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {altFields.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    No alternatives yet. Add different serving sizes (e.g., per slice, per tbsp) with their own nutrition values.
                                </Typography>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {altFields.map((field, idx) => (
                                        <Box
                                            key={field.id}
                                            sx={{
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                borderRadius: 1,
                                                p: 1.5,
                                                position: 'relative',
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                    Alternative {idx + 1}
                                                </Typography>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => remove(idx)}
                                                    title="Remove alternative"
                                                >
                                                    <RemoveCircleOutlineIcon fontSize="small" />
                                                </IconButton>
                                            </Box>

                                            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                                <TextField
                                                    label="Serving Value"
                                                    type="number"
                                                    {...register(`nutrition_alternatives.${idx}.serving_value`, { valueAsNumber: true })}
                                                    error={!!errors.nutrition_alternatives?.[idx]?.serving_value}
                                                    helperText={errors.nutrition_alternatives?.[idx]?.serving_value?.message}
                                                    inputProps={{ min: 0, step: 0.01 }}
                                                    size="small"
                                                    sx={{ flex: 1 }}
                                                />
                                                <Controller
                                                    name={`nutrition_alternatives.${idx}.serving_unit_kind`}
                                                    control={control}
                                                    render={({ field: kindField }) => (
                                                        <TextField
                                                            select
                                                            label="Unit Kind"
                                                            value={kindField.value ?? "mass"}
                                                            onChange={kindField.onChange}
                                                            onBlur={kindField.onBlur}
                                                            inputRef={kindField.ref}
                                                            size="small"
                                                            sx={{ flex: 1 }}
                                                        >
                                                            <MenuItem value="mass">Mass</MenuItem>
                                                            <MenuItem value="volume">Volume</MenuItem>
                                                            <MenuItem value="household">Household</MenuItem>
                                                            <MenuItem value="unknown">Unknown</MenuItem>
                                                        </TextField>
                                                    )}
                                                />
                                                <TextField
                                                    label="Unit"
                                                    {...register(`nutrition_alternatives.${idx}.serving_unit`)}
                                                    error={!!errors.nutrition_alternatives?.[idx]?.serving_unit}
                                                    helperText={errors.nutrition_alternatives?.[idx]?.serving_unit?.message}
                                                    inputProps={{ maxLength: 50 }}
                                                    size="small"
                                                    sx={{ flex: 1 }}
                                                />
                                            </Box>

                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                                Nutrition per serving (all 18 fields available — edit key values below)
                                            </Typography>

                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
                                                <TextField
                                                    label="Calories"
                                                    type="number"
                                                    {...register(`nutrition_alternatives.${idx}.nutrition.calories`, { valueAsNumber: true })}
                                                    size="small"
                                                    sx={{ width: 90 }}
                                                    inputProps={{ min: 0, step: 1 }}
                                                />
                                                <TextField
                                                    label="Fat (g)"
                                                    type="number"
                                                    {...register(`nutrition_alternatives.${idx}.nutrition.total_fat_g`, { valueAsNumber: true })}
                                                    size="small"
                                                    sx={{ width: 90 }}
                                                    inputProps={{ min: 0, step: 0.1 }}
                                                />
                                                <TextField
                                                    label="Carbs (g)"
                                                    type="number"
                                                    {...register(`nutrition_alternatives.${idx}.nutrition.total_carbs_g`, { valueAsNumber: true })}
                                                    size="small"
                                                    sx={{ width: 90 }}
                                                    inputProps={{ min: 0, step: 1 }}
                                                />
                                                <TextField
                                                    label="Protein (g)"
                                                    type="number"
                                                    {...register(`nutrition_alternatives.${idx}.nutrition.protein_g`, { valueAsNumber: true })}
                                                    size="small"
                                                    sx={{ width: 90 }}
                                                    inputProps={{ min: 0, step: 1 }}
                                                />
                                                <TextField
                                                    label="Sodium (mg)"
                                                    type="number"
                                                    {...register(`nutrition_alternatives.${idx}.nutrition.sodium_mg`, { valueAsNumber: true })}
                                                    size="small"
                                                    sx={{ width: 90 }}
                                                    inputProps={{ min: 0, step: 1 }}
                                                />
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            )}

                            <Button
                                variant="outlined"
                                startIcon={<AddCircleOutlineIcon />}
                                onClick={handleAddAlternative}
                                sx={{ mt: 2 }}
                                disabled={!canWrite}
                            >
                                Add Serving Alternative
                            </Button>
                        </AccordionDetails>
                    </Accordion>
                </Box>
            </form>
            </Paper>
        </Box>
    );
}

export default FoodForm;
