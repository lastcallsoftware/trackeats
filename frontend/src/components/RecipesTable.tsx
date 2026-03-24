import { ColumnFiltersState, createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, Row, SortingState, TableOptions, useReactTable } from '@tanstack/react-table';
import React, { useContext, useEffect } from 'react';
import { IRecipe, DataContext } from "./DataProvider";
import { getCuisineLabel } from './Cuisines';
import { useNavigate } from 'react-router-dom';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import { TABLE_HEADER_BG, TABLE_HEADER_COLOR, TABLE_HEADER_BORDER, TABLE_ROW_SELECTED_BG, TABLE_ROW_BORDER } from './tableStyles';

// Define the table's columns
const columnHelper = createColumnHelper<IRecipe>()
const columns = [
    columnHelper.group({
        id: "general_info",
        header: () => <span>General Info</span>,
        columns: [
            columnHelper.accessor("id", {
                header: () => <span>ID</span>,
                cell: info => info.getValue(),
                size: 55
            }),
            columnHelper.accessor("cuisine", {
                header: () => <span>Cuisine</span>,
                cell: info => getCuisineLabel(info.getValue()),
                size: 150,
                meta: { filterVariant: "text" }
            }),
            columnHelper.accessor("name", {
                header: () => <span>Name</span>,
                cell: info => info.getValue(),
                size: 150,
                meta: { filterVariant: "text" }
            }),
            columnHelper.accessor("total_yield", {
                header: () => <span>Yield</span>,
                cell: info => info.getValue(),
                size: 120,
            }),
            columnHelper.accessor("servings", {
                header: () => <span>Servings</span>,
                cell: info => info.getValue(),
                size: 80,
            }),
        ]
    }),
    columnHelper.group({
        id: "nutrition_data",
        header: () => <span>Nutrition Info</span>,
        columns: [
            columnHelper.accessor("nutrition.serving_size_description", {
                header: () => <span>Serving Size Desc</span>,
                cell: info => info.getValue(),
                size: 120
            }),
            columnHelper.accessor("nutrition.serving_size_oz", {
                header: () => <span>Serving Size (oz)</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("nutrition.serving_size_g", {
                header: () => <span>Serving Size (g)</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("nutrition.calories", {
                header: () => <span>Calories</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("nutrition.total_fat_g", {
                header: () => <span>Total Fat (g)</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("nutrition.saturated_fat_g", {
                header: () => <span>Sat. Fat (g)</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("nutrition.trans_fat_g", {
                header: () => <span>Trans Fat (g)</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("nutrition.cholesterol_mg", {
                header: () => <span>Cholesterol (mg)</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("nutrition.sodium_mg", {
                header: () => <span>Sodium (mg)</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("nutrition.total_carbs_g", {
                header: () => <span>Total Carbs (g)</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("nutrition.fiber_g", {
                header: () => <span>Fiber (g)</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("nutrition.total_sugar_g", {
                header: () => <span>Total Sugar (g)</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("nutrition.added_sugar_g", {
                header: () => <span>Added Sugar (g)</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("nutrition.protein_g", {
                header: () => <span>Protein (g)</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("nutrition.vitamin_d_mcg", {
                header: () => <span>Vitamin D (mcg)</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("nutrition.calcium_mg", {
                header: () => <span>Calcium (mg)</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("nutrition.iron_mg", {
                header: () => <span>Iron (mg)</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("nutrition.potassium_mg", {
                header: () => <span>Potassium (mg)</span>,
                cell: info => info.getValue(),
                size: 80
            }),
        ]
    }),
    columnHelper.group({
        id: "price_info",
        header: () => <span>Price Info</span>,
        columns: [
            columnHelper.accessor("price", {
                header: () => <span>Price</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("price_per_calorie", {
                header: () => <span>Price / 100 cal</span>,
                cell: info => (info.row.original.nutrition.calories == 0 ? Infinity : info.row.original.price * 100 / info.row.original.servings / info.row.original.nutrition.calories).toFixed(2),
                sortingFn: (rowA, rowB) => {
                    const val1 = rowA.original.price / rowA.original.servings / rowA.original.nutrition.calories;
                    const val2 = rowB.original.price / rowB.original.servings / rowB.original.nutrition.calories;
                    return val1 < val2 ? -1 : (val1 > val2 ? 1 : 0);
                },
                size: 80
            }),
        ]
    }),
]

interface IRecipesTableProps {
    setSelectedRowId: React.Dispatch<React.SetStateAction<number | null>>,
    pagination: { pageIndex: number, pageSize: number };
}

// Declare the Recipes table itself
const RecipesTable: React.FC<IRecipesTableProps> = ({setSelectedRowId, pagination}) => {
    const navigate = useNavigate()
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const context = useContext(DataContext)
    if (!context)
        throw Error("useDataContext can only be used inside a DataProvider")
    const recipes = context.recipes;

    // Define the table's properties.
    const tableOptions: TableOptions<IRecipe> = {
        data: recipes,
        columns: columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        autoResetPageIndex: false,
        enableMultiRowSelection: false,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        filterFns: {},
        state: { sorting, columnFilters }
    }
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable(tableOptions)

    // Pagination state for the table
    // Sync Tanstack Table's pagination with local state
    React.useEffect(() => {
        table.setPageIndex(pagination.pageIndex);
        table.setPageSize(pagination.pageSize);
    }, [pagination.pageIndex, pagination.pageSize, table]);

    const handleClick = (row: Row<IRecipe>) => {
        // Toggle the row's state (selected/unselected).
        row.toggleSelected()
        // Inform our parent about which row was selected.
        // toggleSelected() doesn't take effect until the page is re-rendered, which happens AFTER
        // this function executes, so getIsSelected() actually returns the opposite of what you'd expect.
        // So we invert the logic too.
        if (row.getIsSelected())
            setSelectedRowId(null)
        else
            setSelectedRowId(row.getValue("id"))
    }

    const handleDoubleClick = (row: Row<IRecipe>) => {
        if (!row.getIsSelected())
            row.toggleSelected()
        // Retrieve the selected record from the context and send it to the edit form.
        const record_id:number = row.getValue("id")
        const recipe = recipes.find((item:IRecipe) => item.id == record_id);
        navigate("/recipeForm", { state: { recipe } });
    }
    
    const RECIPES_FILTERS_STORAGE = "recipes_filters_storage"

    // Restore filters on mount
    useEffect(() => {
        const savedFilters = sessionStorage.getItem(RECIPES_FILTERS_STORAGE);
        if (savedFilters) {
            setColumnFilters(JSON.parse(savedFilters));
        }
    }, []);

    return (
        <TableContainer component={Paper} sx={{ overflowX: 'auto', borderRadius: 2, boxShadow: 2 }}>
            <Table size="small" sx={{ minWidth: 650, tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}>
                <colgroup>
                    {table.getAllLeafColumns().map((col) => (
                        <col key={col.id} style={{ width: col.getSize() }} />
                    ))}
                </colgroup>
                <TableHead>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) =>
                                header.isPlaceholder ? (
                                    <TableCell
                                        key={header.id}
                                        colSpan={header.colSpan}
                                        sx={{
                                            background: TABLE_HEADER_BG,
                                            borderRight: `1px solid ${TABLE_HEADER_BORDER}`,
                                            borderBottom: `1px solid ${TABLE_HEADER_BORDER}`,
                                            p: 1,
                                        }}
                                    />
                                ) : (
                                    <TableCell
                                        key={header.id}
                                        sx={{
                                            width: header.getSize(),
                                            userSelect: 'none',
                                            fontWeight: 'bold',
                                            fontSize: 14,
                                            color: TABLE_HEADER_COLOR,
                                            background: TABLE_HEADER_BG,
                                            borderRight: `1px solid ${TABLE_HEADER_BORDER}`,
                                            borderBottom: `1px solid ${TABLE_HEADER_BORDER}`,
                                            p: 1,
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            lineHeight: 1.2,
                                        }}
                                        colSpan={header.colSpan}
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                <Box component="span" sx={{ ml: 1 }}>
                                                    {({asc: '🔼', desc: '🔽'} as Record<string, string>)[header.column.getIsSorted() as string] ?? null}
                                                </Box>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                )
                            )}
                        </TableRow>
                    ))}
                </TableHead>
                <TableBody>
                    {table.getRowModel().rows.map((row) => (
                        <TableRow
                            key={row.id}
                            hover
                            onClick={() => handleClick(row)}
                            onDoubleClick={() => handleDoubleClick(row)}
                            sx={row.getIsSelected() ? { backgroundColor: `${TABLE_ROW_SELECTED_BG} !important` } : {}}
                        >
                            {row.getVisibleCells().map((cell) => (
                                <TableCell
                                    key={cell.id}
                                    sx={{
                                        borderRight: `1px solid ${TABLE_ROW_BORDER}`,
                                        borderBottom: `1px solid ${TABLE_ROW_BORDER}`,
                                        fontSize: 14,
                                        padding: '2px',
                                        height: '2rem',
                                        textAlign: 'center',
                                    }}
                                >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
                {/* Optionally render footers if needed */}
            </Table>
        </TableContainer>
    );
}

export default RecipesTable;