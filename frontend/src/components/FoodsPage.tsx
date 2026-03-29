import { useState } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MdAddCircleOutline, MdEdit, MdRemoveCircleOutline } from "react-icons/md";
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { useData } from "@/utils/useData";
import FoodsTable from "./FoodsTable";
import Pagination from "./Pagination";
import TitleCard from './TitleCard';

const FoodsPage = () => {
    const navigate = useNavigate();
    const [selectedRowId, setSelectedRowId] = useState<number|null>(null)
    const { foods, deleteFood, isLoading, errorMessage, setErrorMessage } = useData();

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

    const addRecord = () => {
        setErrorMessage("")
        navigate("/food/add");
    }

    const editRecord = () => {
        setErrorMessage("")
        if (selectedRowId) {
            const currentPath = window.location.pathname + window.location.search;
            const editUrl = `/food/edit/${selectedRowId}?returnTo=${encodeURIComponent(currentPath)}`;
            navigate(editUrl);
        }
    }

    const deleteRecord = () => {
        setErrorMessage("")
        if (selectedRowId) {
            // Confirm the deletion request
            const confirmed = confirm("Delete record.  Are you sure?  This cannot be undone.")
            if (confirmed) {
                // Delete the record from the database and the foods list.
                deleteFood(selectedRowId);
            }
        }
    }

    if (isLoading) {
        return (<p style={{ textAlign: 'center' }}>Loading...</p>)
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
            <TitleCard title="Foods" subtitle="Manage your ingredients and nutrition data" />

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
                {foods.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary', fontSize: 20 }}>
                        Looks like you haven't added any foods yet.<br />
                        Click <b>Add</b> to get started!
                    </Box>
                ) : (
                    <>
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
                            <FoodsTable setSelectedRowId={setSelectedRowId} pagination={pagination} setPagination={setPagination} />
                        </Box>
                        <Pagination pagination={pagination} setPagination={setPagination} totalCount={foods.length} />
                    </>
                )}

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
                                width: '100%'
                            }}
                        >
                            {errorMessage}
                        </Box>
                )}
            </Paper>
        </Box>
    )
}

export default FoodsPage;