import { useState } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MdAddCircleOutline, MdEdit, MdRemoveCircleOutline } from "react-icons/md";
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import { useData } from "@/utils/useData";
import FoodsTable from "./FoodsTable";
import { NutritionLabel } from "./NutritionLabel";
import MuiPagination from "@mui/material/Pagination";
import DataPageLayout from './DataPageLayout';

const FoodsPage = () => {
    // -- State and navigation --
    const navigate = useNavigate();
    const [selectedRowId, setSelectedRowId] = useState<number|null>(null)
    const [filteredCount, setFilteredCount] = useState<number>(0)
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
    const [catalogOpen, setCatalogOpen] = useState(false)
    const [catalogQuery, setCatalogQuery] = useState("")
    const [catalogPage, setCatalogPage] = useState(1)
    const [catalogTotal, setCatalogTotal] = useState(0)
    const [catalogPageSize] = useState(10)
    const [catalogFoods, setCatalogFoods] = useState<Array<ReturnType<typeof createCatalogItem>>>([])
    const [catalogSelection, setCatalogSelection] = useState<Set<number>>(new Set())
    const [catalogStatus, setCatalogStatus] = useState<string | null>(null)
    const { foods, deleteFood, isLoading, canWrite, isAdmin, getCatalogFoods, copyCatalogFoods } = useData();

    function createCatalogItem(food: { id?: number; name: string; subtype: string; vendor: string; nutrition: { calories: number } }) {
        return {
            id: food.id ?? 0,
            name: food.name,
            subtype: food.subtype,
            vendor: food.vendor,
            calories: food.nutrition.calories,
        }
    }

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
        navigate("/food/add");
    }

    const editRecord = () => {
        if (selectedRowId) {
            const currentPath = window.location.pathname + window.location.search;
            const editUrl = `/food/edit/${selectedRowId}?returnTo=${encodeURIComponent(currentPath)}`;
            navigate(editUrl);
        }
    }

    const deleteRecord = () => {
        if (selectedRowId) {
            setConfirmDeleteOpen(true)
        }
    }

    const loadCatalogFoods = async (query: string, pageNumber: number) => {
        const response = await getCatalogFoods(query, pageNumber, catalogPageSize)
        if (!response) {
            return
        }
        setCatalogFoods(response.items.map(createCatalogItem))
        setCatalogTotal(response.total)
    }

    const openCatalogDialog = async () => {
        setCatalogOpen(true)
        setCatalogStatus(null)
        setCatalogQuery("")
        setCatalogPage(1)
        setCatalogSelection(new Set())
        await loadCatalogFoods("", 1)
    }

    const closeCatalogDialog = () => {
        setCatalogOpen(false)
    }

    const runCatalogSearch = async () => {
        setCatalogPage(1)
        setCatalogSelection(new Set())
        await loadCatalogFoods(catalogQuery, 1)
    }

    const handleCatalogPageChange = async (_event: React.ChangeEvent<unknown>, nextPage: number) => {
        setCatalogPage(nextPage)
        setCatalogSelection(new Set())
        await loadCatalogFoods(catalogQuery, nextPage)
    }

    const toggleCatalogSelection = (foodId: number) => {
        setCatalogSelection(prev => {
            const next = new Set(prev)
            if (next.has(foodId)) {
                next.delete(foodId)
            } else {
                next.add(foodId)
            }
            return next
        })
    }

    const addSelectedCatalogFoods = async () => {
        const selectedIds = Array.from(catalogSelection)
        if (selectedIds.length === 0) {
            setCatalogStatus("Select at least one catalog food to add.")
            return
        }

        const result = await copyCatalogFoods(selectedIds)
        if (!result) {
            return
        }

        setCatalogStatus(`Added ${result.created_count}, skipped ${result.skipped_count}, failed ${result.failure_count}.`)
        setCatalogSelection(new Set())
        await loadCatalogFoods(catalogQuery, catalogPage)
    }

    const cancelDelete = () => {
        setConfirmDeleteOpen(false)
    }

    const confirmDelete = () => {
        if (selectedRowId) {
            deleteFood(selectedRowId)
            setConfirmDeleteOpen(false)
        }
    }

    if (isLoading) {
        return (<p style={{ textAlign: 'center' }}>Loading...</p>)
    }
    return (
        <DataPageLayout
            title="Foods"
            subtitle="Manage your ingredients and nutrition data"
            topContent={
                !canWrite ? (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        This account is read-only. Write actions are disabled.
                    </Alert>
                ) : null
            }
            controlBarLeft={
                foods.length > 0 && Math.ceil(filteredCount / pageSize) > 1 ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Box component="span" sx={{fontSize: 20, fontWeight: 'bold' }}>
                            Page:
                        </Box>
                        <MuiPagination
                            count={Math.ceil(filteredCount / pageSize)}
                            page={currentPage}
                            onChange={(_, p) => setPagination({ pageIndex: p - 1, pageSize })}
                            size="small"
                        />
                    </Stack>
                ) : null
            }
            controlBarRight={
                <Stack direction="row" spacing={2} justifyContent="center">
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<MdAddCircleOutline />}
                        onClick={addRecord}
                        title="Add Food"
                        disabled={!canWrite}
                    >
                        Add
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={openCatalogDialog}
                        title="Add from Catalog"
                        disabled={!canWrite || isAdmin}
                    >
                        Add from Catalog
                    </Button>
                    <Button
                        variant="contained"
                        color="warning"
                        startIcon={<MdEdit />}
                        onClick={editRecord}
                        title="Edit Selected"
                        disabled={!canWrite || !selectedRowId}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        startIcon={<MdRemoveCircleOutline />}
                        onClick={deleteRecord}
                        title="Delete Selected"
                        disabled={!canWrite || !selectedRowId}
                    >
                        Delete
                    </Button>
                </Stack>
            }
            main={
                <>
                    {/* ── Empty state check ── */}
                    {foods.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary', fontSize: 20 }}>
                            Looks like you haven't added any foods yet.<br />
                            Click <b>Add</b> to get started!
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                overflowX: 'auto',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1.5,
                                boxShadow: '0 2px 12px 0 rgba(0,0,0,0.07)',
                            }}
                        >
                            <FoodsTable
                                setSelectedRowId={setSelectedRowId}
                                pagination={pagination}
                                setPagination={setPagination}
                                setFilteredCount={setFilteredCount}
                            />
                        </Box>
                    )}

                    <Dialog open={confirmDeleteOpen} onClose={cancelDelete}>
                        <DialogTitle>Delete record?</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                Are you sure? This action cannot be undone.
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={cancelDelete}>Cancel</Button>
                            <Button onClick={confirmDelete} color="error" variant="contained">
                                Delete
                            </Button>
                        </DialogActions>
                    </Dialog>

                    <Dialog open={catalogOpen} onClose={closeCatalogDialog} maxWidth="md" fullWidth>
                        <DialogTitle>Add Foods from Catalog</DialogTitle>
                        <DialogContent>
                            <Stack direction="row" spacing={2} sx={{ mb: 2, mt: 1 }}>
                                <TextField
                                    label="Search catalog"
                                    value={catalogQuery}
                                    onChange={(e) => setCatalogQuery(e.target.value)}
                                    fullWidth
                                />
                                <Button variant="outlined" onClick={runCatalogSearch}>Search</Button>
                            </Stack>
                            {catalogStatus ? <Alert severity="info" sx={{ mb: 2 }}>{catalogStatus}</Alert> : null}
                            <List sx={{ maxHeight: 360, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                {catalogFoods.map((food) => (
                                    <ListItem key={food.id} disablePadding secondaryAction={
                                        <Checkbox
                                            edge="end"
                                            checked={catalogSelection.has(food.id)}
                                            onChange={() => toggleCatalogSelection(food.id)}
                                        />
                                    }>
                                        <ListItemButton onClick={() => toggleCatalogSelection(food.id)}>
                                            <ListItemText
                                                primary={`${food.name}${food.subtype ? `, ${food.subtype}` : ''}`}
                                                secondary={`${food.vendor} • ${food.calories} cal`}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                            {catalogFoods.length === 0 ? (
                                <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                                    No catalog foods found for this search.
                                </Typography>
                            ) : null}
                            {catalogTotal > catalogPageSize ? (
                                <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
                                    <MuiPagination
                                        count={Math.ceil(catalogTotal / catalogPageSize)}
                                        page={catalogPage}
                                        onChange={handleCatalogPageChange}
                                        size="small"
                                    />
                                </Stack>
                            ) : null}
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={closeCatalogDialog}>Close</Button>
                            <Button variant="contained" onClick={addSelectedCatalogFoods} disabled={!canWrite || catalogSelection.size === 0}>
                                Add Selected
                            </Button>
                        </DialogActions>
                    </Dialog>
                </>
            }
            sidebar={(() => {
                const food = foods.find(f => f.id === selectedRowId);
                const pricePerServing = food ? (food.price ?? 0) / (food.servings || 1) : null;
                return <NutritionLabel nutrition={food?.nutrition || null} pricePerServing={pricePerServing} />;
            })()}
        />
    )
}

export default FoodsPage;