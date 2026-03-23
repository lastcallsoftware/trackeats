import { MdAddCircleOutline, MdEdit, MdRemoveCircleOutline } from "react-icons/md";
import Button from '@mui/material/Button';
import FoodsTable from "./FoodsTable";
import Pagination from "./Pagination";
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

    // Pagination state is now managed here
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

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
        <section className="foodPageModern">
            <div className="foodPageHeader">
                {/* Removed AddCircle icon from header as this is a browse page */}
                <span className="foodPageTitle">Foods</span>
                <span className="foodPageSubtitle">Manage your ingredients and nutrition data</span>
            </div>

            <div className="foodPageCard">
                <section className="foodTableBox">
                    <FoodsTable setSelectedRowId={setSelectedRowId} pagination={pagination} setPagination={setPagination} />
                </section>
                <Pagination pagination={pagination} setPagination={setPagination} totalCount={foods.length} />

                    <section className="buttonBarModern" style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 24 }}>
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<MdAddCircleOutline />}
                            onClick={addRecord}
                            title="Add Food"
                        >
                            Add
                        </Button>
                        <Button
                            variant="contained"
                            color="warning"
                            startIcon={<MdEdit />}
                            onClick={editRecord}
                            title="Edit Selected"
                            disabled={!selectedRowId}
                        >
                            Edit
                        </Button>
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<MdRemoveCircleOutline />}
                            onClick={deleteRecord}
                            title="Delete Selected"
                            disabled={!selectedRowId}
                        >
                            Delete
                        </Button>
                    </section>

                {context.errorMessage && (
                    <div className="modernErrorMsg" role="alert">{context.errorMessage}</div>
                )}
            </div>
        </section>
    )
}

export default FoodsPage;