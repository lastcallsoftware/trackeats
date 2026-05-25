import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import ClearIcon from '@mui/icons-material/Clear';
import TruncatedCell from './TruncatedCell';

export type USDAFoodRow = {
    fdcId: number;
    description: string;
    dataType: string;
    brandOwner?: string;
    brandName?: string;
    packageWeight?: string;
    modifiedDate?: string;
};

type USDAFoodsTableProps = {
    foods: USDAFoodRow[];
    selectedIds: Set<number>;
    onToggleSelected: (fdcId: number) => void;
    selectedRowId: number | null;
    onSelectRow: (fdcId: number) => void;
    loading: boolean;
};

function USDAFoodsTable({ foods, selectedIds, onToggleSelected, selectedRowId, onSelectRow, loading }: USDAFoodsTableProps) {
    const [globalFilter, setGlobalFilter] = React.useState('');

    const filteredFoods = React.useMemo(() => {
        const q = globalFilter.trim().toLowerCase();
        if (!q) {
            return foods;
        }

        return foods.filter((food) => {
            return (
                String(food.fdcId).includes(q)
                || (food.description ?? '').toLowerCase().includes(q)
                || (food.dataType ?? '').toLowerCase().includes(q)
                || (food.brandOwner ?? '').toLowerCase().includes(q)
                || (food.brandName ?? '').toLowerCase().includes(q)
                || (food.packageWeight ?? '').toLowerCase().includes(q)
                || (food.modifiedDate ?? '').toLowerCase().includes(q)
            );
        });
    }, [foods, globalFilter]);

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: 520,
                minHeight: 0,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.75 }}>
                <TextField
                    variant="outlined"
                    size="small"
                    fullWidth
                    placeholder="Filter USDA results..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    InputProps={{
                        endAdornment: globalFilter ? (
                            <InputAdornment position="end">
                                <IconButton
                                    aria-label="Clear filter"
                                    onClick={() => setGlobalFilter('')}
                                    edge="end"
                                    size="small"
                                >
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ) : null,
                    }}
                />
            </Box>

            <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    overflowX: 'auto',
                    overflowY: 'auto',
                    flex: 1,
                    minHeight: 0,
                    mb: 2,
                }}
            >
                <Table size="small" stickyHeader sx={{ minWidth: 950, tableLayout: 'fixed' }}>
                    <TableHead>
                        <TableRow sx={{ '& th': { backgroundColor: 'grey.50' } }}>
                            <TableCell sx={{ fontWeight: 700, width: 90 }}>Select</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 120 }}>FDC ID</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 300 }}>Description</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 120 }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 180 }}>Brand</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 180 }}>Brand Name</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 120 }}>Package</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 120 }}>Modified</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredFoods.map((food) => (
                            <TableRow
                                key={food.fdcId}
                                hover
                                onClick={() => onSelectRow(food.fdcId)}
                                sx={(theme) => ({
                                    cursor: 'pointer',
                                    ...(selectedRowId === food.fdcId ? { backgroundColor: `${theme.palette.table.rowSelectedBg} !important` } : {}),
                                })}
                            >
                                <TableCell>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                size="small"
                                                checked={selectedIds.has(food.fdcId)}
                                                onChange={() => onToggleSelected(food.fdcId)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        }
                                        label=""
                                    />
                                </TableCell>
                                <TableCell>{food.fdcId}</TableCell>
                                <TableCell><TruncatedCell>{food.description || '—'}</TruncatedCell></TableCell>
                                <TableCell><TruncatedCell>{food.dataType || '—'}</TruncatedCell></TableCell>
                                <TableCell><TruncatedCell>{food.brandOwner || '—'}</TruncatedCell></TableCell>
                                <TableCell><TruncatedCell>{food.brandName || '—'}</TruncatedCell></TableCell>
                                <TableCell><TruncatedCell>{food.packageWeight || '—'}</TruncatedCell></TableCell>
                                <TableCell><TruncatedCell>{food.modifiedDate || '—'}</TruncatedCell></TableCell>
                            </TableRow>
                        ))}
                        {!loading && filteredFoods.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                    {foods.length === 0 ? 'No USDA results yet. Run a search to get started.' : 'No rows match your filter.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

export default USDAFoodsTable;
