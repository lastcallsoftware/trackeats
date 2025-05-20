import { useContext, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom";
import { IFood, DataContext } from "./DataProvider";
import { foodGroups } from "./FoodGroups";
import { Grid, GridItem } from "@chakra-ui/react";

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

    const saveIsDisabled = false;
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
        <form className="input-form food-input-form" onSubmit={handleSubmit}>
            <Grid templateColumns="200px 1fr" alignItems="center" gap={1}>
                {/* Food Group */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="food-group">Food Group:</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <select id="food-group" value={formData.group} 
                        onChange={(e) => setFormData(prevState => ({...prevState, group: e.target.value}))}>
                        {foodGroups.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </GridItem>

                {/* Name */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="name">Name:</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="name" type="text" value={formData.name} maxLength={50} size={50} 
                            onChange={(e) => setFormData(prevState => ({...prevState, name: e.target.value}))} />
                </GridItem>

                {/* Subtype */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="subtype">Subtype:</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="subtype" type="text" value={formData.subtype} maxLength={50} size={50}
                            onChange={(e) => setFormData(prevState => ({...prevState, subtype: e.target.value}))} />
                </GridItem>

                {/* Description */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="description">Description:</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <textarea id="description" value={formData.description} maxLength={100} rows={2} cols={50}
                        onChange={(e) => setFormData(prevState => ({...prevState, description: e.target.value}))} />
                </GridItem>

                {/* Vendor */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="vendor">Vendor:</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="vendor" type="text" value={formData.vendor} maxLength={50} size={50}
                        onChange={(e) => setFormData(prevState => ({...prevState, vendor: e.target.value}))} />
                </GridItem>

                {/* Size Description */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="size_description">Size:</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="size_description" type="text" value={formData.size_description} maxLength={50} size={50}
                        onChange={(e) => setFormData(prevState => ({...prevState, size_description: e.target.value}))} />
                </GridItem>

                {/* Size (oz) */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="size_oz">Size (oz):</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="size_oz" type="number"value={formData.size_oz} min={0} step={"0.01"}
                        onChange={(e) => setFormData(prevState => ({...prevState, size_oz: Number(e.target.value)}))} />
                </GridItem>

                {/* Size (g) */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="size_g">Size (g):</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="size_g" type="number"value={formData.size_g} min={0}
                        onChange={(e) => setFormData(prevState => ({...prevState, size_g: Number(e.target.value)}))} />
                </GridItem>

                {/* Servings */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="servings">Servings:</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="servings" type="number" value={formData.servings} min={0} step="0.01"
                        onChange={(e) => setFormData(prevState => ({...prevState, servings: Number(e.target.value)}))} />
                </GridItem>

                {/* NUTRITION */}
                {/* Serving Size Description */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="serving_size_description">Serving Size:</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="serving_size_description" type="text" value={formData.nutrition.serving_size_description} maxLength={50} size={50}
                        onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, serving_size_description: e.target.value}}))} />
                </GridItem>

                {/* Serving Size (oz) */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="serving_size_oz">Serving Size (oz):</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="serving_size_oz" type="number" value={formData.nutrition.serving_size_oz} min={0} step={"0.01"}
                        onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, serving_size_oz: Number(e.target.value)}}))} />
                </GridItem>

                {/* Serving Size (g) */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="serving_size_g">Serving Size (g):</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="serving_size_g" type="number" value={formData.nutrition.serving_size_g} min={0}
                        onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, serving_size_g: Number(e.target.value)}}))} />
                </GridItem>

                {/* Calories */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="calories">Calories:</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="calories" type="number" value={formData.nutrition.calories} min={0}
                        onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, calories: Number(e.target.value)}}))} />
                </GridItem>

                {/* Total Fat (g) */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="total_fat_g">Total Fat (g):</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="total_fat_g" type="number" value={formData.nutrition.total_fat_g} min={0} step="0.1"
                        onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, total_fat_g: Number(e.target.value)}}))} />
                </GridItem>

                {/* Saturated Fat (g) */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="saturated_fat_g">Saturated Fat (g):</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="saturated_fat_g" type="number" value={formData.nutrition.saturated_fat_g} min={0} step="0.1"
                        onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, saturated_fat_g: Number(e.target.value)}}))} />
                </GridItem>

                {/* Trans Fat (g) */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="trans_fat_g">Trans Fat (g):</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="trans_fat_g" type="number" value={formData.nutrition.trans_fat_g} min={0} step="0.1"
                        onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, trans_fat_g: Number(e.target.value)}}))} />
                </GridItem>

                {/* Cholesterol (mg) */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="cholesterol_mg">Cholesterol (mg):</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="cholesterol_mg" type="number" value={formData.nutrition.cholesterol_mg} min={0}
                        onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, cholesterol_mg: Number(e.target.value)}}))} />
                </GridItem>

                {/* Sodium (mg) */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="sodium_mg">Sodium (mg):</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="sodium_mg" type="number" value={formData.nutrition.sodium_mg} min={0}
                        onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, sodium_mg: Number(e.target.value)}}))} />
                </GridItem>

                {/* Total Carbs (g) */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="total_carbs_g">Total Carbs (g):</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="total_carbs_g" type="number" value={formData.nutrition.total_carbs_g} min={0}
                        onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, total_carbs_g: Number(e.target.value)}}))} />
                </GridItem>

                {/* Fiber (g) */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="fiber_g">Fiber (g):</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="fiber_g" type="number" value={formData.nutrition.fiber_g} min={0}
                        onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, fiber_g: Number(e.target.value)}}))} />
                </GridItem>

                {/* Total Sugar (g) */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="total_sugar_g">Total Sugar (g):</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="total_sugar_g" type="number" value={formData.nutrition.total_sugar_g} min={0}
                        onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, total_sugar_g: Number(e.target.value)}}))} />
                </GridItem>

                {/* Added Sugar (g) */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="added_sugar_g">Added Sugar (g):</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="added_sugar_g" type="number" value={formData.nutrition.added_sugar_g} min={0}
                        onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, added_sugar_g: Number(e.target.value)}}))} />
                </GridItem>

                {/* Protein (g) */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="protein_g">Protein (g):</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="protein_g" type="number" value={formData.nutrition.protein_g} min={0}
                        onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, protein_g: Number(e.target.value)}}))} />
                </GridItem>

                {/* Vitamin D (mcg) */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="vitamin_d_mcg">Vitamin D (mcg):</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="vitamin_d_mcg" type="number" value={formData.nutrition.vitamin_d_mcg} min={0}
                        onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, vitamin_d_mcg: Number(e.target.value)}}))} />
                </GridItem>

                {/* Calcium (mg) */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="calcium_mg">Calcium (mg):</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="calcium_mg" type="number" value={formData.nutrition.calcium_mg} min={0}
                        onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, calcium_mg: Number(e.target.value)}}))} />
                </GridItem>

                {/* Iron (mg) */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="iron_mg">Iron (mg):</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="iron_mg" type="number" value={formData.nutrition.iron_mg} min={0} step="0.1"
                        onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, iron_mg: Number(e.target.value)}}))} />
                </GridItem>

                {/* Potassium (mg) */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="potassium_mg">Potassium (mg):</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="potassium_mg" type="number" value={formData.nutrition.potassium_mg} min={0}
                        onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, potassium_mg: Number(e.target.value)}}))} />
                </GridItem>

                {/* Price ($) */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="price">Price:</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="price" type="number" value={formData.price} min={0}  step="0.01"
                        onChange={(e) => setFormData(prevState => ({...prevState, price: Number(e.target.value)}))} />
                </GridItem>

                {/* Price Date (YYYY-MM-DD) */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="price_date">Price Date:</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <input id="price_date" type="date" value={formData.price_date}
                        onChange={(e) => setFormData(prevState => ({...prevState, price_date: e.target.value}))} />
                </GridItem>

                {/* Shelf Life */}
                <GridItem textAlign={"right"}>
                    <label htmlFor="shelf_life">Shelf Life:</label>
                </GridItem>
                <GridItem textAlign={"left"}>
                    <textarea id="shelf_life" value={formData.shelf_life} maxLength={150} rows={3} cols={57}
                        onChange={(e) => setFormData(prevState => ({...prevState, shelf_life: e.target.value}))} />
                </GridItem>
            </Grid>

            <button className="button" type="submit" disabled={saveIsDisabled}>Save</button>
            <button className="button" onClick={handleCancel}>Cancel</button>

            <p className="error-text">{errorMessage}</p>
        </form>
    );
}

export default FoodForm;
