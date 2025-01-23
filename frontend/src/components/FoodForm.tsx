import { useContext, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom";
import { IFood, DataContext } from "./DataProvider";

function FoodForm() {
    const location = useLocation();
    const navigate = useNavigate()
    const emptyFormData: IFood = {
        group: "", name: "", subtype: "", description: "", vendor: "",
        size_description: "", size_g: 0, servings: 0,
        nutrition: {
            serving_size_description: "", serving_size_g: 0,
            calories: 0, total_fat_g: 0, saturated_fat_g: 0, trans_fat_g: 0,
            cholesterol_mg: 0, sodium_mg: 0, total_carbs_g: 0, fiber_g: 0, total_sugar_g: 0, added_sugar_g: 0,
            protein_g: 0, vitamin_d_mcg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0
        },
        price: 0, price_date: "", shelf_life: ""
    }
    const isEdit = (location.state != null);

    const defaultFormData = location.state?.food || emptyFormData;
    const [formData, setFormData] = useState<IFood>(defaultFormData);

    const foodGroups = [
        { value: "", label: "-- select one --" },
        { value: "beverages", label: "Beverages" },
        { value: "condiments", label: "Condiments" },
        { value: "dairy", label: "Dairy" },
        { value: "fatsAndSugars ", label: "Fats and Sugars" },
        { value: "fruits", label: "Fruits" },
        { value: "grains", label: "Grains" },
        { value: "herbsAndSpices", label: "Herbs and Spices" },
        { value: "nutsAndSeeds", label: "Nuts and Seeds" },
        { value: "preparedFoods", label: "Prepared and Packaged Foods" },
        { value: "proteins", label: "Proteins" },
        { value: "vegetables", label: "Vegetables" },
        { value: "other", label: "Other" }
    ];
    const saveIsDisabled = false;
    const context = useContext(DataContext)
    if (!context)
        throw Error("useDataContext can only be used inside a DataProvider")
    const errorMessage = context.errorMessage;
    const addFood = context.addFood;
    const updateFood = context.updateFood;

    const handleSubmit = (e: { preventDefault: () => void; }) => {
        // Prevent default behavior for form submission (namely, sending the form to the server)
        e.preventDefault();

        // Save the new Food
        if (isEdit)
            updateFood(formData);
        else
            addFood(formData);
        
        // Return to the Foods page
        navigate("/foods")
    }

    const handleCancel = (e: { preventDefault: () => void; }) => {
        e.preventDefault();

        // Return to the Foods page
        navigate("/foods", { state: { } })
    }

    return (
        <section className="registerPage">
            <form className="inputForm" onSubmit={handleSubmit}>
                <section className="inputBoundingBox">

                    {/* Food Group */}
                    <section className="inputLine">
                        <label htmlFor="group">Food Group:</label>
                        <select id="group" value={formData.group}
                            onChange={(e) => setFormData(prevState => ({...prevState, group: e.target.value}))}>
                            {foodGroups.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </section>

                    {/* Name */}
                    <section className="inputLine">
                        <label htmlFor="name">Type:</label>
                        <input id="name" type="text" value={formData.name} maxLength={100}
                            onChange={(e) => setFormData(prevState => ({...prevState, name: e.target.value}))} />
                    </section>

                    {/* Subtype */}
                    <section className="inputLine">
                        <label htmlFor="subtype">Subtype:</label>
                        <input id="subtype" type="text" value={formData.subtype} maxLength={100}
                            onChange={(e) => setFormData(prevState => ({...prevState, subtype: e.target.value}))} />
                    </section>

                    {/* Description */}
                    <section className="inputLine">
                        <label htmlFor="description">Description:</label>
                        <input id="description" type="text" value={formData.description} maxLength={100}
                            onChange={(e) => setFormData(prevState => ({...prevState, description: e.target.value}))} />
                    </section>

                    {/* Vendor */}
                    <section className="inputLine">
                        <label htmlFor="vendor">Vendor:</label>
                        <input id="vendor" type="text" value={formData.vendor} maxLength={100}
                            onChange={(e) => setFormData(prevState => ({...prevState, vendor: e.target.value}))} />
                    </section>

                    {/* Size Description */}
                    <section className="inputLine">
                        <label htmlFor="size_description">Size:</label>
                        <input id="size_description" type="text" value={formData.size_description} maxLength={100}
                            onChange={(e) => setFormData(prevState => ({...prevState, size_description: e.target.value}))} />
                    </section>

                    {/* Size (g) */}
                    <section className="inputLine">
                        <label htmlFor="size_g">Size (g):</label>
                        <input id="size_g" type="number"value={formData.size_g}  min={0}
                            onChange={(e) => setFormData(prevState => ({...prevState, size_g: Number(e.target.value)}))} />
                    </section>

                    {/* Servings */}
                    <section className="inputLine">
                        <label htmlFor="size_g">Servings:</label>
                        <input id="servings" type="number" value={formData.servings} min={0}
                            onChange={(e) => setFormData(prevState => ({...prevState, servings: Number(e.target.value)}))} />
                    </section>

                    {/* NUTRITION */}
                    {/* Serving Size Description */}
                    <section className="inputLine">
                        <label htmlFor="serving_size_description">Serving Size:</label>
                        <input id="serving_size_description" type="text" value={formData.nutrition.serving_size_description} maxLength={100}
                            onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, serving_size_description: e.target.value}}))} />
                    </section>

                    {/* Serving Size (g) */}
                    <section className="inputLine">
                        <label htmlFor="serving_size_g">Serving Size (g):</label>
                        <input id="serving_size_g" type="number" value={formData.nutrition.serving_size_g} min={0}
                            onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, serving_size_g: Number(e.target.value)}}))} />
                    </section>

                    {/* Calories */}
                    <section className="inputLine">
                        <label htmlFor="calories">Calories:</label>
                        <input id="calories" type="number" value={formData.nutrition.calories} min={0}
                            onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, calories: Number(e.target.value)}}))} />
                    </section>

                    {/* Total Fat (g) */}
                    <section className="inputLine">
                        <label htmlFor="total_fat_g">Total Fat (g):</label>
                        <input id="total_fat_g" type="number" value={formData.nutrition.total_fat_g} min={0} step="0.1"
                            onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, total_fat_g: Number(e.target.value)}}))} />
                    </section>

                    {/* Saturated Fat (g) */}
                    <section className="inputLine">
                        <label htmlFor="saturated_fat_g">Saturated Fat (g):</label>
                        <input id="saturated_fat_g" type="number" value={formData.nutrition.saturated_fat_g} min={0} step="0.1"
                            onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, saturated_fat_g: Number(e.target.value)}}))} />
                    </section>

                    {/* Trans Fat (g) */}
                    <section className="inputLine">
                        <label htmlFor="trans_fat_g">Trans Fat (g):</label>
                        <input id="trans_fat_g" type="number" value={formData.nutrition.trans_fat_g} min={0} step="0.1"
                            onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, trans_fat_g: Number(e.target.value)}}))} />
                    </section>

                    {/* Cholesterol (mg) */}
                    <section className="inputLine">
                        <label htmlFor="cholesterol_mg">Cholesterol (mg):</label>
                        <input id="cholesterol_mg" type="number" value={formData.nutrition.cholesterol_mg} min={0}
                            onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, cholesterol_mg: Number(e.target.value)}}))} />
                    </section>

                    {/* Sodium (mg) */}
                    <section className="inputLine">
                        <label htmlFor="sodium_mg">Sodium (mg):</label>
                        <input id="sodium_mg" type="number" value={formData.nutrition.sodium_mg} min={0}
                            onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, sodium_mg: Number(e.target.value)}}))} />
                    </section>

                    {/* Total Carbs (g) */}
                    <section className="inputLine">
                        <label htmlFor="total_carbs_g">Total Carbs (g):</label>
                        <input id="total_carbs_g" type="number" value={formData.nutrition.total_carbs_g} min={0}
                            onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, total_carbs_g: Number(e.target.value)}}))} />
                    </section>

                    {/* Fiber (g) */}
                    <section className="inputLine">
                        <label htmlFor="fiber_g">Fiber (g):</label>
                        <input id="fiber_g" type="number" value={formData.nutrition.fiber_g} min={0}
                            onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, fiber_g: Number(e.target.value)}}))} />
                    </section>

                    {/* Total Sugar (g) */}
                    <section className="inputLine">
                        <label htmlFor="total_sugar_g">Total Sugar (g):</label>
                        <input id="total_sugar_g" type="number" value={formData.nutrition.total_sugar_g} min={0}
                            onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, total_sugar_g: Number(e.target.value)}}))} />
                    </section>

                    {/* Added Sugar (g) */}
                    <section className="inputLine">
                        <label htmlFor="added_sugar_g">Added Sugar (g):</label>
                        <input id="added_sugar_g" type="number" value={formData.nutrition.added_sugar_g} min={0}
                            onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, added_sugar_g: Number(e.target.value)}}))} />
                    </section>

                    {/* Protein (g) */}
                    <section className="inputLine">
                        <label htmlFor="protein_g">Protein (g):</label>
                        <input id="protein_g" type="number" value={formData.nutrition.protein_g} min={0}
                            onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, protein_g: Number(e.target.value)}}))} />
                    </section>

                    {/* Vitamin D (mcg) */}
                    <section className="inputLine">
                        <label htmlFor="vitamin_d_mcg">Vitamin D (mcg):</label>
                        <input id="vitamin_d_mcg" type="number" value={formData.nutrition.vitamin_d_mcg} min={0}
                            onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, vitamin_d_mcg: Number(e.target.value)}}))} />
                    </section>

                    {/* Calcium (mg) */}
                    <section className="inputLine">
                        <label htmlFor="calcium_mg">Calcium (mg):</label>
                        <input id="calcium_mg" type="number" value={formData.nutrition.calcium_mg} min={0}
                            onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, calcium_mg: Number(e.target.value)}}))} />
                    </section>

                    {/* Iron (mg) */}
                    <section className="inputLine">
                        <label htmlFor="iron_mg">Iron (mg):</label>
                        <input id="iron_mg" type="number" value={formData.nutrition.iron_mg} min={0} step="0.1"
                            onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, iron_mg: Number(e.target.value)}}))} />
                    </section>

                    {/* Potassium (mg) */}
                    <section className="inputLine">
                        <label htmlFor="potassium_mg">Potassium (mg):</label>
                        <input id="potassium_mg" type="number" value={formData.nutrition.potassium_mg} min={0}
                            onChange={(e) => setFormData(prevState => ({...prevState, nutrition: {...prevState.nutrition, potassium_mg: Number(e.target.value)}}))} />
                    </section>

                    {/* Price ($) */}
                    <section className="inputLine">
                        <label htmlFor="price">Price (mg):</label>
                        <input id="price" type="number" value={formData.price} min={0}  step="0.01"
                            onChange={(e) => setFormData(prevState => ({...prevState, price: Number(e.target.value)}))} />
                    </section>

                    {/* Price Date (YYYY-MM-DD) */}
                    <section className="inputLine">
                        <label htmlFor="price_date">Price Date:</label>
                        <input id="price_date" type="date" value={formData.price_date}
                            onChange={(e) => setFormData(prevState => ({...prevState, price_date: e.target.value}))} />
                    </section>

                    {/* Shelf Life */}
                    <section className="inputLine">
                        <label htmlFor="shelf_life">Shelf Life:</label>
                        <input id="shelf_life" type="text" value={formData.shelf_life} maxLength={100}
                            onChange={(e) => setFormData(prevState => ({...prevState, shelf_life: e.target.value}))} />
                    </section>

                    <button className="button" type="submit" disabled={saveIsDisabled}>Save</button>
                    <button className="button" onClick={handleCancel}>Cancel</button>

                    <p>{errorMessage}</p>
                </section>
            </form>
        </section>
    );
}

export default FoodForm;
