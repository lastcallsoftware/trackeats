import React, { useState } from "react";
import { IRecipe } from "../contexts/DataProvider";
import { useData } from "@/utils/useData";
import { getCuisineLabel } from "./Cuisines";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import { Theme } from '@mui/material/styles';
import MuiPagination from "@mui/material/Pagination";


const PAGE_SIZE = 10;

interface RecipePickerTableProps {
    setSelectedRowId: (id: number | null) => void;
    selectedRowId: number | null;
    excludeRecipeId?: number;   // optionally hide the recipe being edited (can't add itself)
}

const RecipePickerTable: React.FC<RecipePickerTableProps> = ({ setSelectedRowId, selectedRowId, excludeRecipeId }) => {
    const { recipes } = useData();
    const [filter, setFilter] = useState("");
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        setSort(prev => {
            if (prev?.key === key) return prev.dir === 'asc' ? { key, dir: 'desc' } : null;
            return { key, dir: 'asc' };
        });
        setPage(1);
    };

    const filtered = recipes.filter((r: IRecipe) => {
        if (excludeRecipeId !== undefined && r.id === excludeRecipeId) return false;
        const q = filter.toLowerCase();
        return (
            !q ||
            r.name.toLowerCase().includes(q) ||
            (getCuisineLabel(r.cuisine) ?? "").toLowerCase().includes(q)
        );
    });

    const sorted = sort ? [...filtered].sort((a, b) => {
        let valA: string | number = '';
        let valB: string | number = '';
        switch (sort.key) {
            case 'cuisine':  valA = getCuisineLabel(a.cuisine) ?? '';               valB = getCuisineLabel(b.cuisine) ?? '';               break;
            case 'name':     valA = a.name;                                         valB = b.name;                                         break;
            case 'serving':  valA = a.nutrition?.serving_size_description ?? '';   valB = b.nutrition?.serving_size_description ?? '';    break;
            case 'calories': valA = a.servings > 0 ? (a.nutrition?.calories ?? 0) / a.servings : 0;
                             valB = b.servings > 0 ? (b.nutrition?.calories ?? 0) / b.servings : 0; break;
        }
        if (valA < valB) return sort.dir === 'asc' ? -1 : 1;
        if (valA > valB) return sort.dir === 'asc' ? 1 : -1;
        return 0;
    }) : filtered;

    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const rows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const handleClick = (recipe: IRecipe) => {
        const id = recipe.id ?? null;
        setSelectedRowId(selectedRowId === id ? null : id);
    };

    const headerSx = {
        fontWeight: "bold",
        fontSize: 13,
        color: (theme: Theme) => theme.palette.table.headerColor,
        background: (theme: Theme) => theme.palette.table.headerBg,
        borderBottom: (theme: Theme) => `1px solid ${theme.palette.table.headerBorder}`,
        borderRight: (theme: Theme) => `1px solid ${theme.palette.table.headerBorder}`,
        p: "4px 8px",
        cursor: "pointer",
        userSelect: "none",
    };

    const sortIcon = (key: string) => sort?.key === key ? (sort.dir === 'asc' ? ' 🔼' : ' 🔽') : '';

    const cellSx = {
        fontSize: 13,
        borderRight: (theme: Theme) => `1px solid ${theme.palette.table.rowBorder}`,
        borderBottom: (theme: Theme) => `1px solid ${theme.palette.table.rowBorder}`,
        p: "3px 8px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    };

    return (
        <Box>
            <Box sx={{ position: 'relative', width: '100%', mb: 1 }}>
                <input
                    type="text"
                    style={{ width: '100%', boxSizing: 'border-box', paddingRight: filter ? 28 : 8, borderRadius: 4, border: '1px solid #ccc', fontSize: 16, height: 36 }}
                    placeholder="Filter by name or cuisine…"
                    value={filter}
                    onChange={(e) => { setFilter(e.target.value); setPage(1); }}
                />
                {filter ? (
                    <button
                        onClick={() => { setFilter(""); setPage(1); }}
                        style={{ position: 'absolute', right: 2, top: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}
                        aria-label="Clear filter"
                    >
                        ❌
                    </button>
                ) : null}
            </Box>
            <TableContainer component={Paper} sx={{ borderRadius: 1, boxShadow: 1 }}>
                <Table size="small" sx={{ tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0 }}>
                    <colgroup>
                        <col style={{ width: 110 }} />
                        <col style={{ width: 160 }} />
                        <col style={{ width: 100 }} />
                        <col style={{ width: 80 }} />
                    </colgroup>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={headerSx} onClick={() => handleSort('cuisine')}>Cuisine{sortIcon('cuisine')}</TableCell>
                            <TableCell sx={headerSx} onClick={() => handleSort('name')}>Name{sortIcon('name')}</TableCell>
                            <TableCell sx={headerSx} onClick={() => handleSort('serving')}>Serving Size{sortIcon('serving')}</TableCell>
                            <TableCell sx={headerSx} onClick={() => handleSort('calories')}>Cal/Srv{sortIcon('calories')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((recipe) => {
                            const isSelected = recipe.id === selectedRowId;
                            return (
                                <TableRow
                                    key={recipe.id}
                                    hover
                                    onClick={() => handleClick(recipe)}
                                    sx={(theme: Theme) => ({
                                        cursor: "pointer",
                                        ...(isSelected ? { backgroundColor: `${theme.palette.table.rowSelectedBg} !important` } : {}),
                                    })}
                                    >
                                    <TableCell sx={cellSx} title={getCuisineLabel(recipe.cuisine) ?? ''}>{getCuisineLabel(recipe.cuisine)}</TableCell>
                                    <TableCell sx={cellSx} title={recipe.name}>{recipe.name}</TableCell>
                                    <TableCell sx={cellSx} title={recipe.nutrition?.serving_size_description ?? ''}>{recipe.nutrition?.serving_size_description}</TableCell>
                                    <TableCell sx={{ ...cellSx, textAlign: "right" }}>
                                        {recipe.servings > 0 ? ((recipe.nutrition?.calories ?? 0) / recipe.servings).toFixed(0) : 0}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} sx={{ textAlign: "center", color: "text.secondary", py: 2 }}>
                                    No recipes match the filter.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            {totalPages > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
                    <MuiPagination
                        count={totalPages}
                        page={currentPage}
                        onChange={(_, p) => setPage(p)}
                        size="small"
                    />
                </Box>
            )}
        </Box>
    );
};

export default RecipePickerTable;
