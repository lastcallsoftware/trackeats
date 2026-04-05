import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MdAddCircleOutline, MdEdit, MdRemoveCircleOutline } from "react-icons/md";
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { useData } from "@/utils/useData";
import RecipesTable from "./RecipesTable";
import NutritionLabel from "./NutritionLabel";
import MuiPagination from "@mui/material/Pagination";
import TitleCard from './TitleCard';

function RecipesPage() {
    // -- State and navigation --
    const navigate = useNavigate();
    const [selectedRowId, setSelectedRowId] = useState<number|null>(null)
    const [filteredCount, setFilteredCount] = useState<number>(0)
    const { recipes, deleteRecipe } = useData();

    // -- Pagination management --
    // Read page from URL as 1-based, convert to 0-based for state
    const [searchParams, setSearchParams] = useSearchParams();
    const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Number(searchParams.get("pageSize")) || 10;
    const pagination = { pageIndex: currentPage - 1, pageSize };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setPagination = (updater: any) => {
        const nextValue = typeof updater === "function" ? updater(pagination) : updater;
        // Write page to URL as 1-based
        setSearchParams({
            ...Object.fromEntries(searchParams),
            page: (nextValue.pageIndex + 1).toString(),
            pageSize: nextValue.pageSize.toString()
        });
    }

    // -- CRUD action handlers --
    const addRecord = () => {
        navigate("/recipe/add");
    }

    const editRecord = () => {
        if (selectedRowId) {
            const currentPath = window.location.pathname + window.location.search;
            const editUrl = `/recipe/edit/${selectedRowId}?returnTo=${encodeURIComponent(currentPath)}`;
            navigate(editUrl);
        }
    }

    const deleteRecord = () => {
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
                    alignItems: 'stretch',
                    gap: 1.5,
                }}
            >
                {/* ── Control bar ── */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, minHeight: 40, mb: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 40 }}>
                        {recipes.length > 0 && Math.ceil(filteredCount / pageSize) > 1 && (
                            <MuiPagination
                                count={Math.ceil(filteredCount / pageSize)}
                                page={currentPage}
                                onChange={(_, p) => setPagination({ pageIndex: p - 1, pageSize })}
                                size="small"
                            />
                        )}
                    </Box>
                    <Stack direction="row" spacing={2} justifyContent="center">
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
                </Box>

                {/* ── Main content: table + nutrition panel ── */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        {/* ── Empty state check ── */}
                        {recipes.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary', fontSize: 20 }}>
                                Looks like you haven't added any recipes yet.<br />
                                Click <b>Add</b> to get started!
                            </Box>
                        ) : (
                            <>
                                {/* ── Table ── */}
                                <Box
                                    sx={{
                                        overflowX: 'auto',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1.5,
                                        boxShadow: '0 2px 12px 0 rgba(0,0,0,0.07)',
                                    }}
                                >
                                    <RecipesTable
                                        setSelectedRowId={setSelectedRowId}
                                        pagination={pagination}
                                        setPagination={setPagination}
                                        setFilteredCount={setFilteredCount}
                                    />
                                </Box>
                            </>
                        )}

                    </Box>
                    {/* ── Nutrition panel ── */}
                    <Box sx={{ flex: 1, minWidth: 280, maxWidth: 310, display: { xs: 'none', md: 'block' }, pl: 1, mt: 0 }}>
                        {(() => {
                            const recipe = recipes.find(r => r.id === selectedRowId);
                            if (!recipe) return <NutritionLabel nutrition={null} />;
                            const servings = recipe.servings || 1;
                            // Create a per-serving nutrition object
                            const n = recipe.nutrition;
                            const perServing = n ? {
                                ...n,
                                calories: n.calories / servings,
                                total_fat_g: n.total_fat_g / servings,
                                saturated_fat_g: n.saturated_fat_g / servings,
                                trans_fat_g: n.trans_fat_g / servings,
                                cholesterol_mg: n.cholesterol_mg / servings,
                                sodium_mg: n.sodium_mg / servings,
                                total_carbs_g: n.total_carbs_g / servings,
                                fiber_g: n.fiber_g / servings,
                                total_sugar_g: n.total_sugar_g / servings,
                                added_sugar_g: n.added_sugar_g / servings,
                                protein_g: n.protein_g / servings,
                                vitamin_d_mcg: n.vitamin_d_mcg / servings,
                                calcium_mg: n.calcium_mg / servings,
                                iron_mg: n.iron_mg / servings,
                                potassium_mg: n.potassium_mg / servings,
                            } : null;
                            return <NutritionLabel nutrition={perServing} />;
                        })()}
                    </Box>
                </Box>
            </Paper>
        </Box>
    )
}

export default RecipesPage;
