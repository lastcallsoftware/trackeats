import { useContext, useState } from "react";
import { DataContext } from "./DataProvider";
import { IconContext } from "react-icons";
import { MdAddCircleOutline, MdEdit, MdRemoveCircleOutline } from "react-icons/md";
import RecipesTable from "./RecipesTable"

function MealsPage() {
    const [, setSelectedMealRowId] = useState(null)
    const context = useContext(DataContext)
    if (!context)
        throw Error("useDataContext can only be used inside a DataProvider")
    const errorMessage = context.errorMessage;

    const addRecipe = () => {
    }

    const editRecipe = () => {
    }

    const removeRecipe = () => {
    }

    return (
        <section className="recipePage">
            <section className="recipeTableContainer">
                <RecipesTable setSelectedRowId={setSelectedMealRowId} />
            </section>

            <section className="buttonBar">
                <button className="addButton" onClick={addRecipe}>
                    <IconContext.Provider value={{ size: "30px", color: "green"}}>
                        <p className="editButtonText">Add</p><MdAddCircleOutline/>
                    </IconContext.Provider>
                </button>
                <button className="editButton" onClick={editRecipe}>
                    <IconContext.Provider value={{ size: "30px", color: "orange"}}>
                        <p className="editButtonText">Edit</p><MdEdit/>
                    </IconContext.Provider>
                </button>
                <button className="removeButton" onClick={removeRecipe}>
                    <IconContext.Provider value={{ size: "30px", color: "red"}}>
                        <p className="editButtonText">Delete</p><MdRemoveCircleOutline/>
                    </IconContext.Provider>
                </button>
            </section>

            <p>{errorMessage}</p>
        </section>
    )

}

export default MealsPage;
