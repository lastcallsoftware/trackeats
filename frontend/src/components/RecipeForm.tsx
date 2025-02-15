import { useContext, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom";
import { IRecipe, DataContext } from "./DataProvider";
import { cuisines } from "./Cuisines";

function RecipeForm() {
    const location = useLocation();
    const navigate = useNavigate()

    const emptyFormData: IRecipe = {
        cuisine: "", 
        name: "",
        total_yield: 0,
        servings: 0,
        food_ingredients: [],
        recipe_ingredients: [],
        nutrition: {
            serving_size_description: "", serving_size_g: 0,
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
    const defaultFormData = location.state?.food || emptyFormData;
    const [formData, setFormData] = useState<IRecipe>(defaultFormData);

    const saveIsDisabled = false;
    const context = useContext(DataContext)
    if (!context)
        throw Error("useDataContext can only be used inside a DataProvider")
    const errorMessage = context.errorMessage;
    const addRecipe = context.addRecipe;
    const updateRecipe = context.updateRecipe;

    const handleSubmit = (e: { preventDefault: () => void; }) => {
        // Prevent default behavior for form submission (namely, sending the form to the server)
        e.preventDefault();

        // Save the new Food
        if (isEdit)
            updateRecipe(formData);
        else
            addRecipe(formData);
        
        // Return to the Recipes page
        navigate("/recipes")
    }

    const handleCancel = (e: { preventDefault: () => void; }) => {
        e.preventDefault();

        // Return to the Recipes page
        navigate("/recipes", { state: { } })
    }

   return (
        <section className="registerPage">
            <form className="inputForm" onSubmit={handleSubmit}>
                <section className="inputBoundingBox">

                    {/* Cuisine */}
                    <section className="inputLine">
                        <label htmlFor="group">Cuisine:</label>
                        <select id="group" value={formData.cuisine}
                            onChange={(e) => setFormData(prevState => ({...prevState, group: e.target.value}))}>
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
                            onChange={(e) => setFormData(prevState => ({...prevState, subtype: e.target.value}))} />
                    </section>

                    {/* Servings */}
                    <section className="inputLine">
                        <label htmlFor="size_g">Servings:</label>
                        <input id="servings" type="number" value={formData.servings} min={0}
                            onChange={(e) => setFormData(prevState => ({...prevState, servings: Number(e.target.value)}))} />
                    </section>

                    <button className="button" type="submit" disabled={saveIsDisabled}>Save</button>
                    <button className="button" onClick={handleCancel}>Cancel</button>

                    <p>{errorMessage}</p>
                </section>
            </form>
        </section>
    );
}

export default RecipeForm;