import FoodsTable from "./FoodsTable";
import { useContext, useState } from "react";
import { DataContext } from "./DataProvider";
import { IconContext } from "react-icons";
import { MdAddCircleOutline, MdRemoveCircleOutline } from "react-icons/md";
import RecipesTable from "./RecipesTable"

function MealsPage() {
    const [, setSelectedFoodRowId] = useState(null)
    const [, setSelectedMealRowId] = useState(null)
    const context = useContext(DataContext)
    if (!context)
        throw Error("useDataContext can only be used inside a DataProvider")
    const errorMessage = context.errorMessage;

    const addFood = () => {
    }

    const removeFood = () => {
    }

    return (
        <section className="recipePage">
            <section className="recipesListContainer">
                <RecipesTable setSelectedRowId={setSelectedMealRowId} />
            </section>

            <section className="buttonBar">
                <button className="addButton" onClick={addFood}>
                    <IconContext.Provider value={{ size: "30px", color: "green"}}>
                        <p className="editButtonText">Add</p><MdAddCircleOutline/>
                    </IconContext.Provider>
                </button>
                <button className="removeButton" onClick={removeFood}>
                    <IconContext.Provider value={{ size: "30px", color: "red"}}>
                        <p className="editButtonText">Delete</p><MdRemoveCircleOutline/>
                    </IconContext.Provider>
                </button>
            </section>

            <section className="foodsListContainer">
                <FoodsTable setSelectedRowId={setSelectedFoodRowId} />
            </section>

            <p>{errorMessage}</p>
        </section>
    )

}

export default MealsPage;
