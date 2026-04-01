import {
    ColumnFiltersState,
    VisibilityState,
    createColumnHelper, 
    flexRender,
    getCoreRowModel, 
    getFilteredRowModel, 
    getPaginationRowModel, 
    getSortedRowModel, 
    Row, 
    SortingState, 
    TableOptions, 
    useReactTable 
} from '@tanstack/react-table';
import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IFood } from "../contexts/DataProvider";
import { useData } from "@/utils/useData";
import {
    enforceMandatoryColumns,
    FOODS_COLUMNS_PREFERENCES_KEY,
    getDefaultColumnsPreferences,
    TABLE_PREFERENCES_DEBOUNCE_MS,
    toVisibilityState,
} from "@/utils/constants";
import { getFoodGroupLabel } from './FoodGroups';
import FilterWidget from './FilterWidget';
//import TruncatedCellWithTooltip from './TruncatedCellWithTooltip';
import TruncatedCell from './TruncatedCell';
import ColumnVisibilityPicker from './ColumnVisibilityPicker';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';


// Define the table's columns
const columnHelper = createColumnHelper<IFood>()
const foodColumns = [
    columnHelper.group({
        id: "general_info",
        header: () => <span>General Info</span>,
        columns: [
            columnHelper.accessor("id", {
                header: () => <span>ID</span>,
                cell: info => info.getValue(),
                size: 55
            }),
            columnHelper.accessor("group", {
                header: () => <span>Group</span>,
                cell: info => getFoodGroupLabel(info.getValue()),
                size: 85,
                meta: { filterVariant: "text" }
            }),
            columnHelper.accessor("vendor", {
                header: () => <span>Vendor</span>,
                cell: info => info.getValue(),
                size: 150,
                meta: { filterVariant: "text" }
            }),
            columnHelper.accessor("name", {
                header: () => <span>Name</span>,
                cell: info => info.getValue(),
                size: 150,
                meta: { filterVariant: "text" }
            }),
            columnHelper.accessor("subtype", {
                header: () => <span>Subtype</span>,
                cell: info => info.getValue(),
                size: 100,
                meta: { filterVariant: "text" }
            }),
            columnHelper.accessor("description", {
                header: () => <span>Description</span>,
                cell: info => info.getValue(),
                size: 200,
                meta: { filterVariant: "text" }
            }),
            columnHelper.accessor("size_description", {
                header: () => <span>Size Desc</span>,
                cell: info => info.getValue(),
                size: 120
            }),
            columnHelper.accessor("size_oz", {
                header: () => <span>Size (oz)</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("size_g", {
                header: () => <span>Size (g)</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("servings", {
                header: () => <span>Servings</span>,
                cell: info => info.getValue(),
                size: 80
            }),
        ]
    }),
    columnHelper.group({
        id: "nutrition_data",
        header: () => <span>Nutrition Info (per serving)</span>,
        columns: [
            columnHelper.accessor("nutrition_id", {
                header: () => <span>Nutrition ID</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("nutrition.serving_size_description", {
                header: () => <span>Serving Size Desc</span>,
                cell: info => info.getValue(),
                size: 120
            }),
            columnHelper.accessor("nutrition.serving_size_oz", {
                header: () => <span>Serving Size (oz)</span>,
                cell: info => info.getValue(),
                size: 100
            }),
            columnHelper.accessor("nutrition.serving_size_g", {
                header: () => <span>Serving Size (g)</span>,
                cell: info => info.getValue(),
                size: 100
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
                header: () => <span>Cholest. (mg)</span>,
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
                header: () => <span>Total Price</span>,
                cell: info => (info.getValue() ?? 0).toFixed(2),
                size: 65
            }),
            columnHelper.accessor("price_per_serving", {
                header: () => <span>Price / serving</span>,
                cell: info => ((info.row.original.price ?? 0)/info.row.original.servings).toFixed(2),
                sortingFn: (rowA, rowB) => {
                    const val1 = rowA.original.price/rowA.original.servings
                    const val2 = rowB.original.price/rowB.original.servings
                    return val1 < val2 ? -1 : (val1 > val2 ? 1 : 0);
                },
                size: 65
            }),
            columnHelper.accessor("price_per_oz", {
                header: () => <span>Price / oz</span>,
                cell: info => ((info.row.original.price ?? 0)/info.row.original.size_oz).toFixed(2),
                sortingFn: (rowA, rowB) => {
                    const val1 = rowA.original.price/rowA.original.size_oz
                    const val2 = rowB.original.price/rowB.original.size_oz
                    return val1 < val2 ? -1 : (val1 > val2 ? 1 : 0);
                },
                size: 65
            }),
            columnHelper.accessor("price_per_calorie", {
                header: () => <span>Price / 100 cal</span>,
                cell: info => (info.row.original.nutrition.calories == 0 ? Infinity : info.row.original.price*100/info.row.original.servings/info.row.original.nutrition.calories).toFixed(2),
                sortingFn: (rowA, rowB) => {
                    const val1 = rowA.original.price/rowA.original.servings/rowA.original.nutrition.calories
                    const val2 = rowB.original.price/rowB.original.servings/rowB.original.nutrition.calories
                    return val1 < val2 ? -1 : (val1 > val2 ? 1 : 0);
                },
                size: 65
            }),
            columnHelper.accessor("price_date", {
                header: () => <span>Price Date</span>,
                cell: info => {
                    const val = info.getValue();
                    if (typeof val === 'string' && val.trim().length > 0)
                        return new Date(val.replace(/-/g, '/').replace(/T.+/, '')).toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'})
                    else
                        return "";
                },
                size: 100
            }),
        ]
    }),
    columnHelper.accessor("shelf_life", {
        header: () => <span>Shelf Life</span>,
        cell: info => info.getValue(),
        size: 400
    }),
]

interface FoodsTableProps {
    setSelectedRowId: React.Dispatch<React.SetStateAction<number | null>>,
    pagination: { pageIndex: number, pageSize: number },
    setPagination: React.Dispatch<React.SetStateAction<{ pageIndex: number, pageSize: number }>>,
    isRecipesForm?: boolean
}

// Now declare the foods table itself
const FoodsTable: React.FC<FoodsTableProps> = ({setSelectedRowId, pagination, setPagination, isRecipesForm = false}) => {
    const navigate = useNavigate()
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [preferencesReady, setPreferencesReady] = React.useState(false)
    const preferencesLoadedRef = useRef(false)
    const visibilitySaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const { foods, preferences, updatePreferences } = useData();
    const columnsPreferencesKey = FOODS_COLUMNS_PREFERENCES_KEY

    const saveColumnVisibility = useCallback((next: VisibilityState) => {
        const withMandatory = enforceMandatoryColumns(columnsPreferencesKey, next as Record<string, boolean>)
        void updatePreferences(columnsPreferencesKey, {
            columnVisibility: withMandatory,
        })
    }, [columnsPreferencesKey, updatePreferences])

    useEffect(() => {
        const tablePreferences = preferences[columnsPreferencesKey]

        if (!tablePreferences || preferencesLoadedRef.current) {
            return
        }

        preferencesLoadedRef.current = true
        setPreferencesReady(true)

        if (tablePreferences.columnVisibility) {
            const loadedVisibility = tablePreferences.columnVisibility as Record<string, boolean>
            setColumnVisibility(enforceMandatoryColumns(columnsPreferencesKey, loadedVisibility) as VisibilityState)
        } else {
            const defaults = getDefaultColumnsPreferences(columnsPreferencesKey)
            if (defaults) {
                setColumnVisibility(toVisibilityState(defaults.columnVisibility) as VisibilityState)
            }
        }

        if (tablePreferences.columnFilters) {
            saveColumnVisibility((tablePreferences.columnVisibility as VisibilityState | undefined) ?? {})
        }
    }, [preferences, columnsPreferencesKey, saveColumnVisibility])

    useEffect(() => {
        return () => {
            if (visibilitySaveTimeoutRef.current) {
                clearTimeout(visibilitySaveTimeoutRef.current)
            }
        }
    }, [])

    // Define the table's properties.
    const tableOptions: TableOptions<IFood> = {
        data: foods,
        columns: foodColumns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        autoResetPageIndex: false,
        enableMultiRowSelection: false,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onPaginationChange: setPagination,
        onColumnVisibilityChange: (updater) => {
            setColumnVisibility(prev => {
                const rawNext = typeof updater === 'function' ? updater(prev) : updater;
                const next = enforceMandatoryColumns(columnsPreferencesKey, rawNext as Record<string, boolean>) as VisibilityState
                if (visibilitySaveTimeoutRef.current) {
                    clearTimeout(visibilitySaveTimeoutRef.current)
                }
                visibilitySaveTimeoutRef.current = setTimeout(() => {
                    saveColumnVisibility(next)
                }, TABLE_PREFERENCES_DEBOUNCE_MS)
                return next;
            });
        },
        filterFns: {},
        state: { sorting, columnFilters, pagination, columnVisibility },
        initialState: {
            pagination: {
                pageSize: 10
            }
        }
    }
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable(tableOptions)

    // If a column filter causes the list to shrink such that the current page
    // is greater than the maximum page, go to the last page.
    const totalPages = table.getPageCount()
    useEffect(() => {
        if (pagination.pageIndex >= totalPages) {
            setPagination((prev) => ({...prev, pageIndex: Math.max(0, totalPages - 1)}))
        }
    }, [totalPages, pagination.pageIndex, setPagination])

    const handleClick = (row: Row<IFood>) => {
        row.toggleSelected()
        if (row.getIsSelected())
            setSelectedRowId(null)
        else
            setSelectedRowId(row.getValue("id"))
    }

    const handleDoubleClick = (row: Row<IFood>) => {
        if (!row.getIsSelected())
            row.toggleSelected()
        const record_id:number = row.getValue("id")
        const currentPath = window.location.pathname + window.location.search;
        const editUrl = `/food/edit/${record_id}?returnTo=${encodeURIComponent(currentPath)}`;
        navigate(editUrl);
    }

    const updateFilter = (id: string, value: string) => {
        setColumnFilters((prev) => {
            const updatedFilters = prev.filter((f) => f.id !== id);
            if (value)
                updatedFilters.push({ id, value });
            return updatedFilters;
        });
    };
    
    return (
        <Box sx={{ visibility: preferencesReady ? 'visible' : 'hidden' }}>
            {/* Column visibility picker toolbar */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1, py: 0.75 }}>
                <ColumnVisibilityPicker table={table} storageKey={columnsPreferencesKey} />
            </Box>

            <TableContainer component={Paper} sx={{ overflowX: 'auto', boxShadow: 2, borderRadius: 2 }}>
                <Table size="small" sx={{ minWidth: 650, tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <colgroup>
                        {table.getVisibleLeafColumns().map((col) => (
                            <col key={col.id} style={{ width: col.getSize() }} />
                        ))}
                    </colgroup>
                    <TableHead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} sx={{ height: '2.5rem' }}>
                                {headerGroup.headers.map((header) =>
                                    header.isPlaceholder ? (
                                        <TableCell
                                            key={header.id}
                                            colSpan={header.colSpan}
                                            sx={theme => ({
                                                background: theme.palette.table.headerBg,
                                                borderRight: `1px solid ${theme.palette.table.headerBorder}`,
                                                borderBottom: `1px solid ${theme.palette.table.headerBorder}`,
                                                p: 1,
                                            })}
                                        />
                                    ) : (
                                        <TableCell
                                            key={header.id}
                                            sx={theme => ({
                                                width: header.getSize(),
                                                userSelect: 'none',
                                                fontWeight: 'bold',
                                                fontSize: 14,
                                                color: theme.palette.table.headerColor,
                                                background: theme.palette.table.headerBg,
                                                borderRight: `1px solid ${theme.palette.table.headerBorder}`,
                                                borderBottom: `1px solid ${theme.palette.table.headerBorder}`,
                                                p: 1,
                                                textAlign: 'center',
                                                lineHeight: 1.2,
                                            })}
                                            colSpan={header.colSpan}
                                            onClick={header.column.getToggleSortingHandler()}
                                        >
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    <Box component="span" sx={{ ml: 1 }}>
                                                        {{asc: '🔼', desc: '🔽'}[header.column.getIsSorted() as string] ?? null}
                                                    </Box>
                                                </Box>
                                                {header.column.getCanFilter() && header.column.columnDef.meta?.filterVariant === "text" ? (
                                                    <Box sx={{ mt: 0.5, width: '100%' }} onClick={e => e.stopPropagation()}>
                                                        <FilterWidget column={header.column} updateFilterFunction={updateFilter} />
                                                    </Box>
                                                ) : null}
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
                                onDoubleClick={isRecipesForm ? undefined : () => handleDoubleClick(row)}
                                sx={theme => ({
                                    ...(row.getIsSelected() ? { backgroundColor: `${theme.palette.table.rowSelectedBg} !important` } : {}),
                                    height: '2.5rem',
                                })}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell
                                        key={cell.id}
                                        sx={theme => ({
                                            borderRight: `1px solid ${theme.palette.table.rowBorder}`,
                                            borderBottom: `1px solid ${theme.palette.table.rowBorder}`,
                                            fontSize: 14,
                                            padding: '2px',
                                            height: '2.5rem',
                                            maxHeight: '2.5rem',
                                            textAlign: 'center',
                                            whiteSpace: 'normal',
                                        })}
                                    >
                                    <TruncatedCell>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TruncatedCell>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

export default FoodsTable;