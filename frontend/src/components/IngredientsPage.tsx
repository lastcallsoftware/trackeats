import { IconContext } from "react-icons";
import { MdAddCircleOutline, MdEdit, MdRemoveCircleOutline } from "react-icons/md";
import IngredientsTable from "./IngredientsTable";
import { useContext, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { IIngredient, IngredientContext } from "./IngredientProvider";

const IngredientsPage = () => {
    const navigate = useNavigate();
    const [selectedRowId, setSelectedRowId] = useState(null)
    const context = useContext(IngredientContext)
    if (!context)
        throw Error("useIngredientContext can only be used inside an IngredientProvider")
    const ingredients = context.ingredients;
    const deleteIngredient = context.deleteIngredient;
    const errorMessage = context.errorMessage;

    const addRecord = () => {
        // Go to the edit form
        navigate("/ingredientForm");
    }

    const editRecord = () => {
        if (selectedRowId) {
            // Get the selected record and go to the edit form
            const ingredient = ingredients.find((item:IIngredient) => item.id == selectedRowId);
            navigate("/ingredientForm", { state: { ingredient } });
        }
    }

    const deleteRecord = () => {
        // Get the selected record
        if (selectedRowId) {
            // Confirm the deletion request
            const confirmed = confirm("Delete record.  Are you sure?  This cannot be undone.")
            if (confirmed) {
                // Delete the record from the database and the ingredients list.
                deleteIngredient(selectedRowId);
            }
        }
    }

    return (
        <section className="ingredientPage">
            <section className="ingredientTableContainer">
                <IngredientsTable setSelectedRowId={setSelectedRowId} />
            </section>

            <section className="buttonBar">
                <button className="editButton" onClick={addRecord}>
                    <IconContext.Provider value={{ size: "30px", color: "green"}}>
                        <p className="editButtonText">Add</p><MdAddCircleOutline/>
                    </IconContext.Provider>
                </button>
                <button className="editButton" onClick={editRecord}>
                    <IconContext.Provider value={{ size: "30px", color: "orange"}}>
                        <p className="editButtonText">Edit</p><MdEdit/>
                    </IconContext.Provider>
                </button>
                <button className="editButton" onClick={deleteRecord}>
                    <IconContext.Provider value={{ size: "30px", color: "red"}}>
                        <p className="editButtonText">Delete</p><MdRemoveCircleOutline/>
                    </IconContext.Provider>
                </button>
            </section>

            <p>{errorMessage}</p>
        </section>
    )
}

export default IngredientsPage;