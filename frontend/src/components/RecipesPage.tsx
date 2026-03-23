import { useContext, useState } from "react";
import { DataContext, IRecipe } from "./DataProvider";
import { MdAddCircleOutline, MdEdit, MdRemoveCircleOutline } from "react-icons/md";
import RecipesTable from "./RecipesTable";
import Pagination from "./Pagination";
import { useNavigate } from "react-router-dom";
import Button from '@mui/material/Button';

function RecipesPage() {
    const navigate = useNavigate();
    const [selectedRowId, setSelectedRowId] = useState<number|null>(null)
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
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
        <section className="foodPageModern">
            <div className="foodPageHeader">
                <span className="foodPageTitle">Recipes</span>
                <span className="foodPageSubtitle">Manage your recipes and instructions</span>
            </div>
            <div className="foodPageCard">
                <section className="recipeTableBox">
                    <RecipesTable setSelectedRowId={setSelectedRowId} pagination={pagination} />
                </section>
                <Pagination pagination={pagination} setPagination={setPagination} totalCount={recipes.length} />

                <section className="buttonBarModern" style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 24 }}>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<MdAddCircleOutline />}
                        onClick={addRecord}
                        title="Add Recipe"
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

                {errorMessage && (
                    <div className="modernErrorMsg" role="alert">{errorMessage}</div>
                )}
            </div>
        </section>
    )
}

export default RecipesPage;
