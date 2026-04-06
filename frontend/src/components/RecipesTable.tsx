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
    useReactTable
} from '@tanstack/react-table';
import React, { useCallback, useEffect, useRef } from 'react';
import { IRecipe } from "../contexts/DataProvider";
import { useData } from "@/utils/useData";
import {
    enforceMandatoryColumns,
    getDefaultColumnsPreferences,
    RECIPES_COLUMNS_PREFERENCES_KEY,
    TABLE_PREFERENCES_DEBOUNCE_MS,
    toVisibilityState,
} from "@/utils/constants";
import { getCuisineLabel } from './Cuisines';
import { useNavigate } from 'react-router-dom';
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
import FilterWidget from './FilterWidget';


// Define the table's columns
const columnHelper = createColumnHelper<IRecipe>()
const formatPrice = (value: number): string => Number.isFinite(value) ? value.toFixed(2) : "0.00"
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
        header: () => <span>Nutrition Info (per serving)</span>,
        columns: [
            columnHelper.accessor("nutrition_id", {
                header: () => <span>Nutrition ID</span>,
                cell: info => info.row.original.nutrition_id ?? "",
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
                size: 80
            }),
            columnHelper.accessor("nutrition.serving_size_g", {
                header: () => <span>Serving Size (g)</span>,
                cell: info => info.getValue(),
                size: 80
            }),
            columnHelper.accessor("nutrition.calories", {
                header: () => <span>Calories</span>,
                cell: info => {
                    const servings = info.row.original.servings || 1;
                    const val = info.getValue();
                    return (val / servings).toFixed(0);
                },
                size: 80
            }),
            columnHelper.accessor("nutrition.total_fat_g", {
                header: () => <span>Total Fat (g)</span>,
                cell: info => {
                    const servings = info.row.original.servings || 1;
                    const val = info.getValue();
                    return (val / servings).toFixed(1);
                },
                size: 80
            }),
            columnHelper.accessor("nutrition.saturated_fat_g", {
                header: () => <span>Sat. Fat (g)</span>,
                cell: info => {
                    const servings = info.row.original.servings || 1;
                    const val = info.getValue();
                    return (val / servings).toFixed(1);
                },
                size: 80
            }),
            columnHelper.accessor("nutrition.trans_fat_g", {
                header: () => <span>Trans Fat (g)</span>,
                cell: info => {
                    const servings = info.row.original.servings || 1;
                    const val = info.getValue();
                    return (val / servings).toFixed(1);
                },
                size: 80
            }),
            columnHelper.accessor("nutrition.cholesterol_mg", {
                header: () => <span>Cholest. (mg)</span>,
                cell: info => {
                    const servings = info.row.original.servings || 1;
                    const val = info.getValue();
                    return (val / servings).toFixed(0);
                },
                size: 80
            }),
            columnHelper.accessor("nutrition.sodium_mg", {
                header: () => <span>Sodium (mg)</span>,
                cell: info => {
                    const servings = info.row.original.servings || 1;
                    const val = info.getValue();
                    return (val / servings).toFixed(0);
                },
                size: 80
            }),
            columnHelper.accessor("nutrition.total_carbs_g", {
                header: () => <span>Total Carbs (g)</span>,
                cell: info => {
                    const servings = info.row.original.servings || 1;
                    const val = info.getValue();
                    return (val / servings).toFixed(1);
                },
                size: 80
            }),
            columnHelper.accessor("nutrition.fiber_g", {
                header: () => <span>Fiber (g)</span>,
                cell: info => {
                    const servings = info.row.original.servings || 1;
                    const val = info.getValue();
                    return (val / servings).toFixed(1);
                },
                size: 80
            }),
            columnHelper.accessor("nutrition.total_sugar_g", {
                header: () => <span>Total Sugar (g)</span>,
                cell: info => {
                    const servings = info.row.original.servings || 1;
                    const val = info.getValue();
                    return (val / servings).toFixed(1);
                },
                size: 80
            }),
            columnHelper.accessor("nutrition.added_sugar_g", {
                header: () => <span>Added Sugar (g)</span>,
                cell: info => {
                    const servings = info.row.original.servings || 1;
                    const val = info.getValue();
                    return (val / servings).toFixed(1);
                },
                size: 80
            }),
            columnHelper.accessor("nutrition.protein_g", {
                header: () => <span>Protein (g)</span>,
                cell: info => {
                    const servings = info.row.original.servings || 1;
                    const val = info.getValue();
                    return (val / servings).toFixed(1);
                },
                size: 80
            }),
            columnHelper.accessor("nutrition.vitamin_d_mcg", {
                header: () => <span>Vitamin D (mcg)</span>,
                cell: info => {
                    const servings = info.row.original.servings || 1;
                    const val = info.getValue();
                    return (val / servings).toFixed(1);
                },
                size: 80
            }),
            columnHelper.accessor("nutrition.calcium_mg", {
                header: () => <span>Calcium (mg)</span>,
                cell: info => {
                    const servings = info.row.original.servings || 1;
                    const val = info.getValue();
                    return (val / servings).toFixed(0);
                },
                size: 80
            }),
            columnHelper.accessor("nutrition.iron_mg", {
                header: () => <span>Iron (mg)</span>,
                cell: info => {
                    const servings = info.row.original.servings || 1;
                    const val = info.getValue();
                    return (val / servings).toFixed(1);
                },
                size: 80
            }),
            columnHelper.accessor("nutrition.potassium_mg", {
                header: () => <span>Potassium (mg)</span>,
                cell: info => {
                    const servings = info.row.original.servings || 1;
                    const val = info.getValue();
                    return (val / servings).toFixed(0);
                },
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
                cell: info => formatPrice(info.getValue() ?? 0),
                size: 80
            }),
            columnHelper.accessor("price_per_serving" as keyof IRecipe, {
                header: () => <span>Price / serving</span>,
                cell: info => {
                    const val = info.getValue();
                    if (val !== undefined && val !== null) return formatPrice(Number(val));
                    const price = info.row.original.price ?? 0;
                    const servings = info.row.original.servings || 1;
                    return formatPrice(price / servings);
                },
                sortingFn: (rowA, rowB) => {
                    const val1 = (rowA.original.price_per_serving !== undefined)
                        ? rowA.original.price_per_serving
                        : (rowA.original.price ?? 0) / (rowA.original.servings || 1);
                    const val2 = (rowB.original.price_per_serving !== undefined)
                        ? rowB.original.price_per_serving
                        : (rowB.original.price ?? 0) / (rowB.original.servings || 1);
                    return val1 < val2 ? -1 : (val1 > val2 ? 1 : 0);
                },
                size: 80
            }),
            columnHelper.accessor("price_per_calorie", {
                header: () => <span>Price / 100 cal</span>,
                cell: info => formatPrice(
                    info.row.original.nutrition.calories == 0
                        ? 0
                        : info.row.original.price * 100 / info.row.original.nutrition.calories
                ),
                sortingFn: (rowA, rowB) => {
                    const val1 = rowA.original.nutrition.calories === 0
                        ? 0
                        : rowA.original.price * 100 / rowA.original.nutrition.calories;
                    const val2 = rowB.original.nutrition.calories === 0
                        ? 0
                        : rowB.original.price * 100 / rowB.original.nutrition.calories;
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
    setPagination: React.Dispatch<React.SetStateAction<{ pageIndex: number, pageSize: number }>>,
    setFilteredCount: React.Dispatch<React.SetStateAction<number>>,
}

// Declare the Recipes table itself
const RecipesTable: React.FC<IRecipesTableProps> = ({setSelectedRowId, pagination, setPagination, setFilteredCount}) => {
    const navigate = useNavigate()
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [preferencesReady, setPreferencesReady] = React.useState(false)
    const preferencesLoadedRef = useRef(false)
    const visibilitySaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const { recipes, preferences, updatePreferences } = useData();
    const columnsPreferencesKey = RECIPES_COLUMNS_PREFERENCES_KEY

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
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
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
        state: { sorting, columnFilters, columnVisibility }
    })

    // Pagination state for the table
    React.useEffect(() => {
        table.setPageIndex(pagination.pageIndex);
        table.setPageSize(pagination.pageSize);
    }, [pagination.pageIndex, pagination.pageSize, table]);

    const totalPages = table.getPageCount()
    useEffect(() => {
        if (pagination.pageIndex >= totalPages) {
            setPagination((prev) => ({ ...prev, pageIndex: Math.max(0, totalPages - 1) }))
        }
    }, [totalPages, pagination.pageIndex, setPagination])

    useEffect(() => {
        setFilteredCount(table.getFilteredRowModel().rows.length)
    }, [table, columnFilters, setFilteredCount])

    const handleClick = (row: Row<IRecipe>) => {
        row.toggleSelected()
        if (row.getIsSelected())
            setSelectedRowId(null)
        else
            setSelectedRowId(row.getValue("id"))
    }

    const handleDoubleClick = (row: Row<IRecipe>) => {
        if (!row.getIsSelected())
            row.toggleSelected()
        const record_id:number = row.getValue("id")
        const currentPath = window.location.pathname + window.location.search;
        const editUrl = `/recipe/edit/${record_id}?returnTo=${encodeURIComponent(currentPath)}`;
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
        <Box
            sx={{
                visibility: preferencesReady ? 'visible' : 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: 680,
            }}
        >
            {/* Column visibility picker toolbar */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1, py: 0.75 }}>
                <ColumnVisibilityPicker table={table} storageKey={columnsPreferencesKey} />
            </Box>

            <TableContainer
                component={Paper}
                sx={{
                    overflowX: 'auto',
                    overflowY: 'auto',
                    borderRadius: 2,
                    boxShadow: 2,
                    flex: 1,
                    minHeight: 0,
                }}
            >
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
                                                cursor: 'pointer',
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
                                                        {({asc: '🔼', desc: '🔽'} as Record<string, string>)[header.column.getIsSorted() as string] ?? null}
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
                                onDoubleClick={() => handleDoubleClick(row)}
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
                                            color: row.getIsSelected() ? theme.palette.common.white : 'inherit',
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

export default RecipesTable;