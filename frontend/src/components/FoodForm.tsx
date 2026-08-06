import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { IFood, INutritionAlternative } from "../contexts/DataProvider";
import { foodGroups } from "./FoodGroups";
import TitleCard from "./TitleCard";
import { useData, Food } from "@/utils/useData";
import { useToast } from "@/contexts/useToast";
import { Controller, useForm, useWatch } from "react-hook-form";
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
    IconButton,
    Select,
    FormControl,
    InputLabel,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

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
    size_imperial: z.coerce.number().min(0, "Must be 0 or greater"),
    size_metric: z.coerce.number().min(0, "Must be 0 or greater"),
    unit_type: z.enum(["weight", "volume"]).default("weight"),
    density: z.coerce.number().min(0, "Must be 0 or greater").default(1.0),
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
});

type FoodFormInput = z.input<typeof foodSchema>;
type FoodFormValues = z.output<typeof foodSchema>;

// Conversion factors to grams (for solid units) or milliliters (for liquid units).
// Mirrors the backend NutritionAlternative.compute_serving_weight_g() logic.
const SOLID_TO_G: Record<string, number> = {
    g: 1.0, gram: 1.0, grams: 1.0,
    oz: 28.3495, ounce: 28.3495, ounces: 28.3495,
    kg: 1000.0, kilogram: 1000.0, kilograms: 1000.0,
    lb: 453.592, pound: 453.592, pounds: 453.592,
    mg: 0.001, milligram: 0.001, milligrams: 0.001,
};

type NewServingUnitKind = "solid" | "liquid" | "arbitrary";

type NewServingUnitOption = {
    value: string;
    label: string;
    kind: NewServingUnitKind;
    defaultAmount: number;
};

const NEW_SERVING_UNITS: NewServingUnitOption[] = [
    { value: "g", label: "g", kind: "solid", defaultAmount: 100 },
    { value: "oz", label: "oz", kind: "solid", defaultAmount: 1 },
    { value: "kg", label: "kg", kind: "solid", defaultAmount: 1 },
    { value: "lb", label: "lb", kind: "solid", defaultAmount: 1 },
    { value: "mg", label: "mg", kind: "solid", defaultAmount: 100 },
    { value: "ml", label: "ml", kind: "liquid", defaultAmount: 100 },
    { value: "fl oz", label: "fl oz", kind: "liquid", defaultAmount: 1 },
    { value: "cup", label: "cup", kind: "solid", defaultAmount: 1 },
    { value: "tbsp", label: "tbsp", kind: "solid", defaultAmount: 1 },
    { value: "tsp", label: "tsp", kind: "solid", defaultAmount: 1 },
    { value: "arbitrary", label: "Arbitrary", kind: "arbitrary", defaultAmount: 1 },
];

const LIQUID_TO_ML: Record<string, number> = {
    ml: 1.0, milliliter: 1.0, milliliters: 1.0,
    l: 1000.0, liter: 1000.0, liters: 1000.0,
    "fl oz": 29.5735, "fluid ounce": 29.5735, "fluid ounces": 29.5735,
    cup: 236.588, cups: 236.588,
    tbsp: 14.7868, tablespoon: 14.7868, tablespoons: 14.7868,
    tsp: 4.92892, teaspoon: 4.92892, teaspoons: 4.92892,
    pint: 473.176, pints: 473.176,
    quart: 946.353, quarts: 946.353,
    gallon: 3785.41, gallons: 3785.41,
};

const computeServingWeightG = (
    kind: "solid" | "liquid" | "arbitrary",
    value: number,
    unit: string,
    householdWeightG: number | null,
    density: number | null,
): number | null => {
    if (kind === "solid") {
        const factor = SOLID_TO_G[unit.toLowerCase()];
        return factor == null ? null : value * factor;
    }
    if (kind === "liquid") {
        const factor = LIQUID_TO_ML[unit.toLowerCase()];
        if (factor == null || density == null) return null;
        return value * factor * density;
    }
    if (kind === "arbitrary") {
        return householdWeightG;
    }
    return null;
};

const round1 = (v: number): number => Math.round(v * 10) / 10;

// Scale a base nutrition record to a new serving size.
const scaleNutrition = (
    base: INutritionAlternative["nutrition"],
    scale: number,
    servingSizeG: number,
    servingSizeOz: number,
    description: string,
): INutritionAlternative["nutrition"] => ({
    serving_size_description: description,
    serving_size_oz: servingSizeOz,
    serving_size_g: servingSizeG,
    calories: Math.round(base.calories * scale),
    total_fat_g: round1(base.total_fat_g * scale),
    saturated_fat_g: round1(base.saturated_fat_g * scale),
    trans_fat_g: round1(base.trans_fat_g * scale),
    cholesterol_mg: Math.round(base.cholesterol_mg * scale),
    sodium_mg: Math.round(base.sodium_mg * scale),
    total_carbs_g: Math.round(base.total_carbs_g * scale),
    fiber_g: Math.round(base.fiber_g * scale),
    total_sugar_g: Math.round(base.total_sugar_g * scale),
    added_sugar_g: Math.round(base.added_sugar_g * scale),
    protein_g: Math.round(base.protein_g * scale),
    vitamin_d_mcg: Math.round(base.vitamin_d_mcg * scale),
    calcium_mg: Math.round(base.calcium_mg * scale),
    iron_mg: round1(base.iron_mg * scale),
    potassium_mg: round1(base.potassium_mg * scale),
});


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
        control,
        setValue,
        getValues,
        formState: { errors },
    } = useForm<FoodFormInput, unknown, FoodFormValues>({
        mode: "onBlur",
        reValidateMode: "onChange",
        resolver: zodResolver(foodSchema),
        defaultValues: (food || new Food()) as FoodFormInput,
    });


    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);

    const unitType = useWatch({ control, name: "unit_type" });

    // ── Serving view dropdown state ──
    const [localAlternatives, setLocalAlternatives] = useState<INutritionAlternative[]>(
        food?.nutrition_alternatives ?? []
    );

    // Track the primary serving's nutrition so new alternatives can be scaled
    // from it regardless of which serving view is currently selected.
    // Stored in state (not a ref) so it can be read safely during render.
    const [primaryNutrition, setPrimaryNutrition] = useState<INutritionAlternative["nutrition"]>(
        { ...((food?.nutrition || getValues("nutrition")) as INutritionAlternative["nutrition"]) }
    );

    const buildServingViews = () => {
        // The primary view always reflects the true primary serving, not the
        // live form values (which get overwritten when switching to an
        // alternative view).
        const primary = primaryNutrition;
        const views = [{ key: "primary", label: primary?.serving_size_description || "Primary", nutrition: primary, isPrimary: true }];
        localAlternatives.forEach((alt, i) => {
            views.push({
                key: `alt-${i}`,
                label: alt.nutrition?.serving_size_description || `${alt.serving_value} ${alt.serving_unit}`,
                nutrition: alt.nutrition,
                isPrimary: false,
            });
        });
        return views;
    };

    const [selectedKey, setSelectedKey] = useState("primary");

    const servingViews = buildServingViews();

    // Write a nutrition record's values into the live form fields.
    const applyServingToForm = (nutrition: INutritionAlternative["nutrition"]) => {
        setValue("nutrition.serving_size_description", nutrition.serving_size_description);
        setValue("nutrition.serving_size_oz", nutrition.serving_size_oz);
        setValue("nutrition.serving_size_g", nutrition.serving_size_g);
        setValue("nutrition.calories", nutrition.calories);
        setValue("nutrition.total_fat_g", nutrition.total_fat_g);
        setValue("nutrition.saturated_fat_g", nutrition.saturated_fat_g);
        setValue("nutrition.trans_fat_g", nutrition.trans_fat_g);
        setValue("nutrition.cholesterol_mg", nutrition.cholesterol_mg);
        setValue("nutrition.sodium_mg", nutrition.sodium_mg);
        setValue("nutrition.total_carbs_g", nutrition.total_carbs_g);
        setValue("nutrition.fiber_g", nutrition.fiber_g);
        setValue("nutrition.total_sugar_g", nutrition.total_sugar_g);
        setValue("nutrition.added_sugar_g", nutrition.added_sugar_g);
        setValue("nutrition.protein_g", nutrition.protein_g);
        setValue("nutrition.vitamin_d_mcg", nutrition.vitamin_d_mcg);
        setValue("nutrition.calcium_mg", nutrition.calcium_mg);
        setValue("nutrition.iron_mg", nutrition.iron_mg);
        setValue("nutrition.potassium_mg", nutrition.potassium_mg);
    };

    const onSelectView = (key: string) => {
        if (key === selectedKey) return;
        // If we're navigating AWAY from the primary view, capture the
        // current form values (which reflect the primary serving, including
        // any edits the user made) as the authoritative primary nutrition.
        // This must happen BEFORE the form is overwritten with the new
        // view's values, and must be keyed off the outgoing view, not the
        // incoming one - otherwise the primary's data gets clobbered with
        // whatever alternative was being viewed.
        if (selectedKey === "primary") {
            setPrimaryNutrition({
                ...(getValues("nutrition") as INutritionAlternative["nutrition"]),
            });
        }
        setSelectedKey(key);
        const view = servingViews.find(v => v.key === key);
        if (!view?.nutrition) return;
        applyServingToForm({ ...view.nutrition });
    };

    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newValue, setNewValue] = useState(100);
    const [newUnit, setNewUnit] = useState("g");
    const newServingKind = NEW_SERVING_UNITS.find(unit => unit.value === newUnit)?.kind ?? "solid";
    const [newHhName, setNewHhName] = useState("");
    const [newHhWeight, setNewHhWeight] = useState<number|null>(null);
    const [newSolidWeightG, setNewSolidWeightG] = useState<number|null>(null);
    const [newLiquidDensity, setNewLiquidDensity] = useState<number|null>(1);

    const handleAddServing = () => {
        // If we're currently viewing the primary serving, capture any
        // unsaved edits before using it as the scaling base, and before the
        // form is switched over to the new alternative's view.
        const primary = selectedKey === "primary"
            ? { ...(getValues("nutrition") as INutritionAlternative["nutrition"]) }
            : { ...primaryNutrition };
        if (selectedKey === "primary") {
            setPrimaryNutrition(primary);
        }

        const density = newServingKind === "liquid" ? newLiquidDensity : null;
        const newWeightG = newServingKind === "solid" && newUnit !== "g" && newUnit !== "oz"
            ? newSolidWeightG
            : newServingKind === "solid"
                ? computeServingWeightG(newServingKind, newValue, newUnit, newHhWeight, density)
                : newServingKind === "liquid" && newUnit === "fl oz" && density != null
                ? newValue * density * 28.3495
                : computeServingWeightG(newServingKind, newValue, newUnit, newHhWeight, density);
        const primaryWeightG = primary?.serving_size_g ?? 0;

        // The label reflects the user's new serving selections.
        const description = newServingKind === "arbitrary"
            ? (newHhName || newUnit)
            : `${newValue} ${newUnit}`;

        let nutrition: INutritionAlternative["nutrition"];
        if (newWeightG != null && primaryWeightG > 0) {
            const scale = newWeightG / primaryWeightG;
            const newWeightOz = newWeightG / 28.3495;
            nutrition = scaleNutrition(primary, scale, Math.round(newWeightG), round1(newWeightOz), description);
        } else {
            // Fallback: copy the primary nutrition with the new description.
            nutrition = { ...primary, serving_size_description: description };
        }

        const newAlt: INutritionAlternative = {
            ordinal: localAlternatives.length,
            serving_value: newValue,
            serving_unit: newServingKind === "arbitrary" ? (newHhName || newUnit) : newUnit,
            serving_unit_kind: newServingKind,
            household_weight_g: newServingKind === "arbitrary" ? newHhWeight : null,
            is_primary: false,
            nutrition,
        };
        setLocalAlternatives(prev => [...prev, newAlt]);
        setSelectedKey(`alt-${localAlternatives.length}`);
        applyServingToForm({ ...nutrition });
        setIsAddingNew(false);
        // Reset the add form
        setNewValue(100);
        setNewUnit("g");
        setNewHhName("");
        setNewHhWeight(null);
        setNewSolidWeightG(null);
        setNewLiquidDensity(1);
    };

    const handleDeleteServing = () => {
        if (servingViews.length <= 1) return;

        if (selectedKey === "primary") {
            // Promote the first alternative to primary when the original
            // primary serving is deleted. The promoted serving is removed
            // from the alternatives list so it is not duplicated.
            const promoted = localAlternatives[0]?.nutrition;
            if (!promoted) return;

            const nextPrimary = { ...promoted };
            setPrimaryNutrition(nextPrimary);
            setLocalAlternatives(prev => prev.slice(1));
            setSelectedKey("primary");
            applyServingToForm(nextPrimary);
            return;
        }

        const idx = Number(selectedKey.replace("alt-", ""));
        setLocalAlternatives(prev => prev.filter((_, i) => i !== idx));
        setSelectedKey("primary");
        applyServingToForm({ ...primaryNutrition });
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
            nutrition_alternatives: localAlternatives,
        };

        if (isEditMode)
            await updateFood(payload as IFood);
        else
            await addFood(payload as IFood);
        
        const returnPath = searchParams.get("returnTo") || "/foods"
        navigate(returnPath)
    }

    const handleCancel = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
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
                        <Controller
                            name="unit_type"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    select
                                    label="Unit Type"
                                    id="unit_type"
                                    value={field.value ?? "weight"}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    inputRef={field.ref}
                                    error={!!errors.unit_type}
                                    helperText={errors.unit_type?.message}
                                    fullWidth
                                >
                                    <MenuItem value="weight">Weight</MenuItem>
                                    <MenuItem value="volume">Volume</MenuItem>
                                </TextField>
                            )}
                        />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <TextField
                            label="Size (oz / fl oz)"
                            id="size_imperial"
                            type="number"
                            {...register("size_imperial", {
                                valueAsNumber: true,
                                onChange: (event) => {
                                    const nextImperial = Number(event.target.value);
                                    if (!Number.isNaN(nextImperial)) {
                                        setValue('size_metric', Math.round(nextImperial * 28.3495), { shouldValidate: true });
                                    }
                                },
                            })}
                            error={!!errors.size_imperial}
                            helperText={errors.size_imperial?.message}
                            inputProps={{ min: 0, step: 0.01 }}
                            fullWidth
                        />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField
                                label="Size (g / ml)"
                                id="size_metric"
                                type="number"
                                {...register("size_metric", {
                                    valueAsNumber: true,
                                    onChange: (event) => {
                                        const nextMetric = Number(event.target.value);
                                        if (!Number.isNaN(nextMetric)) {
                                            setValue('size_imperial', parseFloat((nextMetric / 28.3495).toFixed(2)), { shouldValidate: true });
                                        }
                                    },
                                })}
                                error={!!errors.size_metric}
                                helperText={errors.size_metric?.message}
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
                    {unitType === "volume" && (
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField
                                label="Density (g/ml)"
                                id="density"
                                type="number"
                                {...register("density", { valueAsNumber: true })}
                                error={!!errors.density}
                                helperText={errors.density?.message || "Grams per milliliter"}
                                inputProps={{ min: 0, step: 0.01 }}
                                fullWidth
                            />
                        </Grid>
                    )}
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

                {/* ── NUTRITION FACTS PANEL ── */}
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
                        '& .MuiInputLabel-root': { fontSize: '0.72rem' },
                        '& .MuiInputBase-input': { fontSize: '0.72rem', py: 0.35 },
                        '& .MuiFormHelperText-root': { fontSize: '0.62rem', lineHeight: 1.1, mt: 0.25 },
                        '& .nutrition-input-rows .MuiTypography-root': { fontSize: '0.78rem', lineHeight: 1.1 },
                    }}
                >
                    <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: 1, mb: 1 }}>
                        Nutrition Facts
                    </Typography>
                    <Divider sx={{ borderBottomWidth: 4, mb: 1 }} />

                    {/* ── Serving View Selector ── */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <FormControl size="small" fullWidth sx={{ mt: 0.5 }}>
                            <InputLabel id="serving-select-label">Serving Size</InputLabel>
                            <Select
                                labelId="serving-select-label"
                                label="Serving Size"
                                value={selectedKey}
                                onChange={(e) => onSelectView(e.target.value)}
                            >
                                {servingViews.map(v => (
                                    <MenuItem key={v.key} value={v.key}>{v.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <IconButton size="small" color="primary" onClick={() => setIsAddingNew(true)}>
                            <AddCircleOutlineIcon fontSize="small" />
                        </IconButton>
                        {servingViews.length > 1 && (
                            <IconButton size="small" color="error" onClick={handleDeleteServing}>
                                <RemoveCircleOutlineIcon fontSize="small" />
                            </IconButton>
                        )}
                    </Box>

                    {/* ── Add New Serving Size (inline form) ── */}
                    {isAddingNew && (
                        <Box sx={{ bgcolor: '#f5f5f5', border: '1px solid #d5d5d5', borderRadius: 1, p: 1, pt: 0.5, mb: 1 }}>
                            <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, lineHeight: 1.2, mb: 1.5 }}>New Serving Size</Typography>
                            <Grid container spacing={0.5}>
                                <Grid size={{ xs: 4 }}>
                                    <TextField
                                        select
                                        label="Unit"
                                        InputLabelProps={{ shrink: true }}
                                        size="small"
                                        value={newUnit}
                                        onChange={e => {
                                            const nextUnit = e.target.value;
                                            const previousOption = NEW_SERVING_UNITS.find(unit => unit.value === newUnit);
                                            const nextOption = NEW_SERVING_UNITS.find(unit => unit.value === nextUnit);
                                            setNewUnit(nextUnit);
                                            if (newValue === (previousOption?.defaultAmount ?? 1)) {
                                                setNewValue(nextOption?.defaultAmount ?? 1);
                                            }
                                        }}
                                        fullWidth
                                        sx={{ "& .MuiInputBase-root": { height: 40 } }}
                                    >
                                        {NEW_SERVING_UNITS.map(unit => (
                                            <MenuItem key={unit.value} value={unit.value}>{unit.label}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 3 }}>
                                    <TextField
                                        label="Amount"
                                        InputLabelProps={{ shrink: true }}
                                        type="number"
                                        size="small"
                                        value={newValue}
                                        onChange={e => setNewValue(Number(e.target.value))}
                                        inputProps={{ min: 0, step: 0.01 }}
                                        fullWidth
                                        sx={{ "& .MuiInputBase-root": { height: 40 } }}
                                    />
                                </Grid>
                                {newServingKind === "arbitrary" && (
                                    <Grid size={{ xs: 5 }}>
                                        <TextField
                                            label="Name"
                                            InputLabelProps={{ shrink: true }}
                                            size="small"
                                            value={newHhName}
                                            onChange={e => setNewHhName(e.target.value)}
                                            inputProps={{ maxLength: 30 }}
                                            fullWidth
                                            sx={{ "& .MuiInputBase-root": { height: 40 } }}
                                        />
                                    </Grid>
                                )}
                                {newServingKind === "arbitrary" ? (
                                    <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
                                        <TextField
                                            label="Weight (g)"
                                            InputLabelProps={{ shrink: true }}
                                            type="number"
                                            size="small"
                                            value={newHhWeight ?? ""}
                                            onChange={e => setNewHhWeight(e.target.value ? Number(e.target.value) : null)}
                                            helperText="Weight in grams for this arbitrary unit"
                                            inputProps={{ min: 0, step: 0.1 }}
                                            fullWidth
                                            sx={{ "& .MuiInputBase-root": { height: 40 } }}
                                        />
                                    </Grid>
                                ) : newServingKind === "solid" && newUnit !== "g" && newUnit !== "oz" ? (
                                    <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
                                        <TextField
                                            label="Weight (g)"
                                            InputLabelProps={{ shrink: true }}
                                            type="number"
                                            size="small"
                                            value={newSolidWeightG ?? ""}
                                            onChange={e => setNewSolidWeightG(e.target.value ? Number(e.target.value) : null)}
                                            helperText="Weight in grams for this serving"
                                            inputProps={{ min: 0, step: 0.1 }}
                                            fullWidth
                                            sx={{ "& .MuiInputBase-root": { height: 40 } }}
                                        />
                                    </Grid>
                                ) : newServingKind === "liquid" ? (
                                    <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
                                        <TextField
                                            label={newUnit === "fl oz" ? "Density (oz/fl oz)" : "Density (g/ml)"}
                                            InputLabelProps={{ shrink: true }}
                                            type="number"
                                            size="small"
                                            value={newLiquidDensity ?? ""}
                                            onChange={e => setNewLiquidDensity(e.target.value ? Number(e.target.value) : null)}
                                            helperText={newUnit === "fl oz" ? "Ounces per fluid ounce" : "Grams per milliliter"}
                                            inputProps={{ min: 0, step: 0.01 }}
                                            fullWidth
                                            sx={{ "& .MuiInputBase-root": { height: 40 } }}
                                        />
                                    </Grid>
                                ) : null}
                                <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-start', gap: 1, mt: 0.5 }}>
                                    <Button size="small" variant="contained" onClick={handleAddServing}>Add</Button>
                                    <Button size="small" onClick={() => setIsAddingNew(false)}>Cancel</Button>
                                </Grid>
                            </Grid>
                        </Box>
                    )}

                    {/* ── Serving Size oz/g ── */}
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5, mb: 1 }}>
                        <TextField label="Serving Size (oz)" id="serving_size_oz" type="number"
                            {...register("nutrition.serving_size_oz", { valueAsNumber: true })}
                            error={!!errors.nutrition?.serving_size_oz} helperText={errors.nutrition?.serving_size_oz?.message}
                            inputProps={{ min: 0, step: 0.01, readOnly: true }} size="small" fullWidth
                            sx={{ backgroundColor: '#f5f5f5', '& .MuiInputBase-input': { py: 0.75 } }} />
                        <TextField label="Serving Size (g)" id="serving_size_g" type="number"
                            {...register("nutrition.serving_size_g", { valueAsNumber: true })}
                            error={!!errors.nutrition?.serving_size_g} helperText={errors.nutrition?.serving_size_g?.message}
                            inputProps={{ min: 0, step: 1, readOnly: true }} size="small" fullWidth
                            sx={{ backgroundColor: '#f5f5f5', '& .MuiInputBase-input': { py: 0.75 } }} />
                    </Box>

                    <Divider sx={{ borderBottomWidth: 2, my: 1 }} />

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="h5" sx={{ fontWeight: 900 }}>Calories</Typography>
                        <TextField id="calories" type="number" {...register("nutrition.calories", { valueAsNumber: true })}
                            error={!!errors.nutrition?.calories} inputProps={{ min: 0, step: 1 }} size="small"
                            sx={{ width: 110, '& .MuiInputBase-input': { py: 0.75, fontSize: '1rem', fontWeight: 700 } }} />
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
            </form>
            </Paper>
        </Box>
    );
}

export default FoodForm;