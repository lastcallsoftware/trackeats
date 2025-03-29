import { IconContext } from "react-icons";
import { MdAddCircleOutline, MdEdit, MdRemoveCircleOutline } from "react-icons/md";
import FoodsTable from "./FoodsTable";
import { useContext, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { IFood, DataContext } from "./DataProvider";

const FoodsPage = () => {
    const navigate = useNavigate();
    const [selectedRowId, setSelectedRowId] = useState<number|null>(null)
    const context = useContext(DataContext)
    if (!context)
        throw Error("useDataContext can only be used inside a DataProvider")
    const foods = context.foods;

    const addRecord = () => {
        // Go to the edit form
        navigate("/foodForm");
    }

    const editRecord = () => {
        if (selectedRowId) {
            // Get the selected record and go to the edit form
            const food = foods.find((item:IFood) => item.id == selectedRowId);
            navigate("/foodForm", { state: { food } });
        }
    }

    const deleteRecord = () => {
        // Get the selected record
        if (selectedRowId) {
            // Confirm the deletion request
            const confirmed = confirm("Delete record.  Are you sure?  This cannot be undone.")
            if (confirmed) {
                // Delete the record from the database and the foods list.
                context.deleteFood(selectedRowId);
            }
        }
    }

    if (context.isLoading) {
        return (<p>Loading...</p>)
    }
    return (
        <section className="foodPage">
            <section className="foodTableBox">
                <FoodsTable setSelectedRowId={setSelectedRowId} />
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

            <p>{context.errorMessage}</p>
        </section>
    )
}

export default FoodsPage;