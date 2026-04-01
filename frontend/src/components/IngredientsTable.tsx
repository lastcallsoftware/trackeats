import React, { useState } from "react";
import { createColumnHelper, flexRender, getCoreRowModel, Row, useReactTable } from '@tanstack/react-table';
import { IIngredient } from "../contexts/DataProvider";
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';



const columnHelper = createColumnHelper<IIngredient>();
const columns = [
    columnHelper.accessor("ordinal", {
        header: "Ordinal",
        cell: (info) => info.getValue(),
        size: 60,
    }),
    columnHelper.accessor("summary", {
        header: "Ingredient",
        cell: (info) => info.getValue() ?? "",
        size: 380,
    }),
];

interface IngredientsTableProps {
    data: IIngredient[];
    setSelectedRowId?: (id: number[] | null) => void;
    selectedRowId?: number[] | null;
}

const IngredientsTable: React.FC<IngredientsTableProps> = ({ data, setSelectedRowId, selectedRowId: selectedRowIdProp }) => {
    const [selectedRowIdLocal, setSelectedRowIdLocal] = useState<number[] | null>(null);
    const selectedRowId = selectedRowIdProp !== undefined ? selectedRowIdProp : (setSelectedRowId ? null : selectedRowIdLocal);
    const setRowId = setSelectedRowId || setSelectedRowIdLocal;

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        state: {
            rowSelection: (setSelectedRowId ? undefined : (selectedRowId ? { [selectedRowId.join("-")]: true } : {})),
        },
        enableRowSelection: true,
        getRowId: (row) => `${row.food_ingredient_id}-${row.recipe_ingredient_id}`,
        onRowSelectionChange: () => {},
    });

    const handleClick = (row: Row<IIngredient>) => {
        const tuple: number[] = [
            row.original.food_ingredient_id ?? 0,
            row.original.recipe_ingredient_id ?? 0,
        ];
        if (!setRowId) return;
        if (selectedRowId && selectedRowId[0] === tuple[0] && selectedRowId[1] === tuple[1]) {
            setRowId(null);
        } else {
            setRowId(tuple);
        }
    };

    return (
        <TableContainer component={Paper} sx={{ overflowX: 'auto', borderRadius: 2, boxShadow: 2 }}>
            <Table size="small" sx={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}>
                <colgroup>
                    {table.getAllLeafColumns().map((col) => (
                        <col key={col.id} style={{ width: col.getSize() }} />
                    ))}
                </colgroup>
                <TableHead>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <TableCell
                                    key={header.id}
                                    colSpan={header.colSpan}
                                    sx={theme => ({
                                        userSelect: "none",
                                        fontWeight: "bold",
                                        fontSize: 13,
                                        color: theme.palette.table.headerColor,
                                        background: theme.palette.table.headerBg,
                                        borderBottom: `1px solid ${theme.palette.table.headerBorder}`,
                                        borderRight: `1px solid ${theme.palette.table.headerBorder}`,
                                        p: '5px 8px',
                                    })}
                                >
                                    {header.isPlaceholder ? null : (
                                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </Box>
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableHead>
                <TableBody>
                    {table.getRowModel().rows.map((row) => {
                        const food_id = row.original.food_ingredient_id ?? 0;
                        const recipe_id = row.original.recipe_ingredient_id ?? 0;
                        const isSelected = !!(selectedRowId && selectedRowId[0] === food_id && selectedRowId[1] === recipe_id);
                        return (
                            <TableRow
                                key={row.id}
                                hover
                                onClick={() => handleClick(row)}
                                sx={isSelected ? (theme => ({ backgroundColor: `${theme.palette.table.rowSelectedBg} !important` })) : {}}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell
                                        key={cell.id}
                                        sx={theme => ({
                                            borderRight: `1px solid ${theme.palette.table.rowBorder}`,
                                            borderBottom: `1px solid ${theme.palette.table.rowBorder}`,
                                            fontSize: 13,
                                            p: '4px 8px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        })}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default IngredientsTable;
