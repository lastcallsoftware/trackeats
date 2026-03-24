import { useEffect } from "react";
import { useContext, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IFood, DataContext } from "./DataProvider";
import { foodGroups } from "./FoodGroups";
import TitleCard from "./TitleCard";
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

function FoodForm() {
    const location = useLocation();
    const navigate = useNavigate()
    const emptyFormData: IFood = {
        group: "", name: "", subtype: "", description: "", vendor: "",
        size_description: "", size_oz: 0, size_g: 0, servings: 0,
        nutrition: {
            serving_size_description: "", serving_size_oz: 0, serving_size_g: 0,
            calories: 0, total_fat_g: 0, saturated_fat_g: 0, trans_fat_g: 0,
            cholesterol_mg: 0, sodium_mg: 0, total_carbs_g: 0, fiber_g: 0, total_sugar_g: 0, added_sugar_g: 0,
            protein_g: 0, vitamin_d_mcg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0
        },
        price: 0, price_per_serving: 0, price_per_oz: 0, price_per_calorie: 0, price_date: "", shelf_life: ""
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
    const defaultFormData = location.state?.food || emptyFormData;
    const [formData, setFormData] = useState<IFood>(defaultFormData);

    // const saveIsDisabled = false;

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, []);
    const context = useContext(DataContext)
    if (!context)
        throw Error("useDataContext can only be used inside a DataProvider")
    const errorMessage = context.errorMessage;

    const handleSubmit = async (e: { preventDefault: () => void; }) => {
        // Prevent default behavior for form submission (namely, sending the form to the server)
        e.preventDefault();

        // Save the new Food
        if (isEdit)
            await context.updateFood(formData);
        else
            await context.addFood(formData);
        
        // Return to the Foods page
        navigate("/foods")
    }

    const handleCancel = (e: { preventDefault: () => void; }) => {
        e.preventDefault();

        // Return to the Foods page
        navigate("/foods", { state: { } })
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
            <TitleCard title={isEdit ? 'Edit Food' : 'Add Food'} subtitle="Enter food and nutrition details" />
            <Paper elevation={3} sx={{ maxWidth: 700, width: '100%', p: 4 }}>
            <form onSubmit={handleSubmit} autoComplete="off">
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            select
                            label="Food Group"
                            id="food-group"
                            value={formData.group}
                            onChange={e => setFormData(prev => ({ ...prev, group: e.target.value }))}
                            fullWidth
                            required
                        >
                            {foodGroups.map(option => (
                                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Name"
                            id="name"
                            value={formData.name}
                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            inputProps={{ maxLength: 50 }}
                            fullWidth
                            required
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Subtype"
                            id="subtype"
                            value={formData.subtype}
                            onChange={e => setFormData(prev => ({ ...prev, subtype: e.target.value }))}
                            inputProps={{ maxLength: 50 }}
                            fullWidth
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Vendor"
                            id="vendor"
                            value={formData.vendor}
                            onChange={e => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                            inputProps={{ maxLength: 50 }}
                            fullWidth
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Description"
                            id="description"
                            value={formData.description}
                            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
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
                            value={formData.size_description}
                            onChange={e => setFormData(prev => ({ ...prev, size_description: e.target.value }))}
                            inputProps={{ maxLength: 50 }}
                            fullWidth
                        />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <TextField
                            label="Size (oz)"
                            id="size_oz"
                            type="number"
                            value={formData.size_oz}
                            onChange={e => setFormData(prev => ({ ...prev, size_oz: Number(e.target.value) }))}
                            inputProps={{ min: 0, step: 0.01 }}
                            fullWidth
                        />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <TextField
                            label="Size (g)"
                            id="size_g"
                            type="number"
                            value={formData.size_g}
                            onChange={e => setFormData(prev => ({ ...prev, size_g: Number(e.target.value) }))}
                            inputProps={{ min: 0 }}
                            fullWidth
                        />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <TextField
                            label="Servings"
                            id="servings"
                            type="number"
                            value={formData.servings}
                            onChange={e => setFormData(prev => ({ ...prev, servings: Number(e.target.value) }))}
                            inputProps={{ min: 0, step: 0.01 }}
                            fullWidth
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 9 }}>
                        <TextField
                            label="Shelf Life"
                            id="shelf_life"
                            value={formData.shelf_life}
                            onChange={e => setFormData(prev => ({ ...prev, shelf_life: e.target.value }))}
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
                            value={formData.price}
                            onChange={e => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                            inputProps={{ min: 0, step: 0.01 }}
                            fullWidth
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Price Date"
                            id="price_date"
                            type="date"
                            value={formData.price_date}
                            onChange={e => setFormData(prev => ({ ...prev, price_date: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                    </Grid>

                    {/* Nutrition Section */}
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
                                Nutrition
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="Serving Size Description"
                                id="serving_size_description"
                                value={formData.nutrition.serving_size_description}
                                onChange={e => setFormData(prev => ({ ...prev, nutrition: { ...prev.nutrition, serving_size_description: e.target.value } }))}
                                inputProps={{ maxLength: 50 }}
                                fullWidth
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField
                                label="Serving Size (oz)"
                                id="serving_size_oz"
                                type="number"
                                value={formData.nutrition.serving_size_oz}
                                onChange={e => setFormData(prev => ({ ...prev, nutrition: { ...prev.nutrition, serving_size_oz: Number(e.target.value) } }))}
                                inputProps={{ min: 0, step: 0.01 }}
                                fullWidth
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField
                                label="Serving Size (g)"
                                id="serving_size_g"
                                type="number"
                                value={formData.nutrition.serving_size_g}
                                onChange={e => setFormData(prev => ({ ...prev, nutrition: { ...prev.nutrition, serving_size_g: Number(e.target.value) } }))}
                                inputProps={{ min: 0 }}
                                fullWidth
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField
                                label="Calories"
                                id="calories"
                                type="number"
                                value={formData.nutrition.calories}
                                onChange={e => setFormData(prev => ({ ...prev, nutrition: { ...prev.nutrition, calories: Number(e.target.value) } }))}
                                inputProps={{ min: 0 }}
                                fullWidth
                            />
                        </Grid>
                        {/* Start Total Fat on a new row */}
                        <Grid size={{ xs: 12 }} />
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField
                                label="Total Fat (g)"
                                id="total_fat_g"
                                type="number"
                                value={formData.nutrition.total_fat_g}
                                onChange={e => setFormData(prev => ({ ...prev, nutrition: { ...prev.nutrition, total_fat_g: Number(e.target.value) } }))}
                                inputProps={{ min: 0, step: 0.1 }}
                                fullWidth
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField
                                label="Saturated Fat (g)"
                                id="saturated_fat_g"
                                type="number"
                                value={formData.nutrition.saturated_fat_g}
                                onChange={e => setFormData(prev => ({ ...prev, nutrition: { ...prev.nutrition, saturated_fat_g: Number(e.target.value) } }))}
                                inputProps={{ min: 0, step: 0.1 }}
                                fullWidth
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField
                                label="Cholesterol (mg)"
                                id="cholesterol_mg"
                                type="number"
                                value={formData.nutrition.cholesterol_mg}
                                onChange={e => setFormData(prev => ({ ...prev, nutrition: { ...prev.nutrition, cholesterol_mg: Number(e.target.value) } }))}
                                inputProps={{ min: 0 }}
                                fullWidth
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField
                                label="Sodium (mg)"
                                id="sodium_mg"
                                type="number"
                                value={formData.nutrition.sodium_mg}
                                onChange={e => setFormData(prev => ({ ...prev, nutrition: { ...prev.nutrition, sodium_mg: Number(e.target.value) } }))}
                                inputProps={{ min: 0 }}
                                fullWidth
                            />
                        </Grid>
                        {/* Start Total Carbs on a new row */}
                        <Grid size={{ xs: 12 }} />
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField
                                label="Total Carbs (g)"
                                id="total_carbs_g"
                                type="number"
                                value={formData.nutrition.total_carbs_g}
                                onChange={e => setFormData(prev => ({ ...prev, nutrition: { ...prev.nutrition, total_carbs_g: Number(e.target.value) } }))}
                                inputProps={{ min: 0, step: 0.1 }}
                                fullWidth
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField
                                label="Total Fiber (g)"
                                id="fiber_g"
                                type="number"
                                value={formData.nutrition.fiber_g}
                                onChange={e => setFormData(prev => ({ ...prev, nutrition: { ...prev.nutrition, fiber_g: Number(e.target.value) } }))}
                                inputProps={{ min: 0, step: 0.1 }}
                                fullWidth
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField
                                label="Total Sugar (g)"
                                id="total_sugar_g"
                                type="number"
                                value={formData.nutrition.total_sugar_g}
                                onChange={e => setFormData(prev => ({ ...prev, nutrition: { ...prev.nutrition, total_sugar_g: Number(e.target.value) } }))}
                                inputProps={{ min: 0, step: 0.1 }}
                                fullWidth
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField
                                label="Added Sugar (g)"
                                id="added_sugar_g"
                                type="number"
                                value={formData.nutrition.added_sugar_g}
                                onChange={e => setFormData(prev => ({ ...prev, nutrition: { ...prev.nutrition, added_sugar_g: Number(e.target.value) } }))}
                                inputProps={{ min: 0, step: 0.1 }}
                                fullWidth
                            />
                        </Grid>
                        {/* Start Vitamin D on a new row */}
                        <Grid size={{ xs: 12 }} />
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField
                                label="Vitamin D (mcg)"
                                id="vitamin_d_mcg"
                                type="number"
                                value={formData.nutrition.vitamin_d_mcg}
                                onChange={e => setFormData(prev => ({ ...prev, nutrition: { ...prev.nutrition, vitamin_d_mcg: Number(e.target.value) } }))}
                                inputProps={{ min: 0, step: 0.1 }}
                                fullWidth
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField
                                label="Calcium (mg)"
                                id="calcium_mg"
                                type="number"
                                value={formData.nutrition.calcium_mg}
                                onChange={e => setFormData(prev => ({ ...prev, nutrition: { ...prev.nutrition, calcium_mg: Number(e.target.value) } }))}
                                inputProps={{ min: 0, step: 0.1 }}
                                fullWidth
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField
                                label="Iron (mg)"
                                id="iron_mg"
                                type="number"
                                value={formData.nutrition.iron_mg}
                                onChange={e => setFormData(prev => ({ ...prev, nutrition: { ...prev.nutrition, iron_mg: Number(e.target.value) } }))}
                                inputProps={{ min: 0, step: 0.1 }}
                                fullWidth
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField
                                label="Potassium (mg)"
                                id="potassium_mg"
                                type="number"
                                value={formData.nutrition.potassium_mg}
                                onChange={e => setFormData(prev => ({ ...prev, nutrition: { ...prev.nutrition, potassium_mg: Number(e.target.value) } }))}
                                inputProps={{ min: 0, step: 0.1 }}
                                fullWidth
                            />
                        </Grid>
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
                {errorMessage && (
                    <Typography color="error" sx={{ mt: 2 }}>
                        {errorMessage}
                    </Typography>
                )}
            </form>
            </Paper>
        </Box>
    );
}

export default FoodForm;
