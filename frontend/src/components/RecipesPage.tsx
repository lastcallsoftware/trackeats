import { useContext, useState } from "react";
import { DataContext, IRecipe } from "./DataProvider";
import { MdAddCircleOutline, MdEdit, MdRemoveCircleOutline } from "react-icons/md";
import RecipesTable from "./RecipesTable";
import Pagination from "./Pagination";
import { useNavigate } from "react-router-dom";
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TitleCard from './TitleCard';

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
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #e3f2fd 0%, #fce4ec 100%)',
                py: { xs: 3, sm: 5 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            <TitleCard title="Recipes" subtitle="Manage your recipes and nutritional info" />

            <Paper
                elevation={4}
                sx={{
                    background: '#fff',
                    borderRadius: 2.25,
                    boxShadow: '0 4px 24px 0 rgba(25, 118, 210, 0.10)',
                    px: { xs: 2, sm: 5 },
                    py: { xs: 2, sm: 3 },
                    width: { xs: '98%', md: '90%' },
                    maxWidth: 1600,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Box
                    sx={{
                        my: 0,
                        mx: { xs: 0, sm: 4 },
                        overflowX: 'auto',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1.5,
                        background: '#fff',
                        boxShadow: '0 2px 12px 0 rgba(0,0,0,0.07)',
                    }}
                >
                    <RecipesTable setSelectedRowId={setSelectedRowId} pagination={pagination} />
                </Box>
                <Pagination pagination={pagination} setPagination={setPagination} totalCount={recipes.length} />

                <Stack
                    direction="row"
                    spacing={2}
                    justifyContent="center"
                    sx={{ mt: 3 }}
                >
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
                </Stack>

                {errorMessage && (
                    <Box
                        role="alert"
                        sx={{
                            mt: 3,
                            background: '#ffebee',
                            color: '#b71c1c',
                            border: '1px solid #e57373',
                            borderRadius: 1,
                            p: 2,
                            fontSize: '1.05em',
                            fontWeight: 500,
                            boxShadow: '0 1px 4px 0 rgba(229, 57, 53, 0.08)',
                            textAlign: 'left',
                            maxWidth: 600,
                        }}
                    >
                        {errorMessage}
                    </Box>
                )}
            </Paper>
        </Box>
    )
}

export default RecipesPage;
