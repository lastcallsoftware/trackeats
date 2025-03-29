import { useContext, useState } from "react";
import { DataContext, IRecipe } from "./DataProvider";
import { IconContext } from "react-icons";
import { MdAddCircleOutline, MdEdit, MdRemoveCircleOutline } from "react-icons/md";
import RecipesTable from "./RecipesTable"
import { useNavigate } from "react-router-dom";

function MealsPage() {
    const navigate = useNavigate();
    const [selectedRowId, setSelectedRowId] = useState<number|null>(null)
    const context = useContext(DataContext)
    if (!context)
        throw Error("useDataContext can only be used inside a DataProvider")
    const recipes = context.recipes
    const deleteRecipe = context.deleteRecipe;
    const errorMessage = context.errorMessage;

    const addRecord = () => {
        // Go to the edit form
        navigate("/recipeForm");
    }

    const editRecord = () => {
        if (selectedRowId) {
            // Get the selected record and go to the edit form
            const recipe = recipes.find((item:IRecipe) => item.id == selectedRowId);
            navigate("/recipeForm", { state: { recipe } });
        }
    }

    const deleteRecord = () => {
        // Get the selected record
        if (selectedRowId) {
            // Confirm the deletion request
            const confirmed = confirm("Delete record.  Are you sure?  This cannot be undone.")
            if (confirmed) {
                // Delete the record from the database and the foods list.
                deleteRecipe(selectedRowId);
            }
        }
    }

    return (
        <section className="recipePage">
            <section className="recipeTableBox">
                <RecipesTable setSelectedRowId={setSelectedRowId} />
            </section>

            <section className="buttonBar">
                <button style={{width: "150px"}} onClick={addRecord}>
                    <IconContext.Provider value={{ size: "30px", color: "green"}}>
                        <p>Add</p><MdAddCircleOutline/>
                    </IconContext.Provider>
                </button>
                <button style={{width: "150px"}} onClick={editRecord}>
                    <IconContext.Provider value={{ size: "30px", color: "orange"}}>
                        <p>Edit</p><MdEdit/>
                    </IconContext.Provider>
                </button>
                <button style={{width: "150px"}} onClick={deleteRecord}>
                    <IconContext.Provider value={{ size: "30px", color: "red"}}>
                        <p>Delete</p><MdRemoveCircleOutline/>
                    </IconContext.Provider>
                </button>
            </section>

            <p>{errorMessage}</p>
        </section>
    )

}

export default MealsPage;
