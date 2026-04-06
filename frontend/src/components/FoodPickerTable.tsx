import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Row,
    SortingState,
    TableOptions,
    VisibilityState,
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { IFood } from "../contexts/DataProvider";
import { useData } from "@/utils/useData";
import {
    enforceMandatoryColumns,
    FOOD_INGREDIENTS_COLUMNS_PREFERENCES_KEY,
    getDefaultColumnsPreferences,
    TABLE_PREFERENCES_DEBOUNCE_MS,
    toVisibilityState,
} from "@/utils/constants";
import { getFoodGroupLabel } from "./FoodGroups";
import TruncatedCell from "./TruncatedCell";
import ColumnVisibilityPicker from "./ColumnVisibilityPicker";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import MuiPagination from "@mui/material/Pagination";

const PAGE_SIZE = 10;

const columnHelper = createColumnHelper<IFood>();
const foodPickerColumns = [
    columnHelper.group({
        id: "general_info",
        header: () => <span>General Info</span>,
        columns: [
            columnHelper.accessor("id", {
                header: () => <span>ID</span>,
                cell: info => info.getValue(),
                size: 55,
            }),
            columnHelper.accessor("group", {
                header: () => <span>Group</span>,
                cell: info => getFoodGroupLabel(info.getValue()),
                size: 85,
            }),
            columnHelper.accessor("vendor", {
                header: () => <span>Vendor</span>,
                cell: info => info.getValue(),
                size: 150,
            }),
            columnHelper.accessor("name", {
                header: () => <span>Name</span>,
                cell: info => info.getValue(),
                size: 150,
            }),
            columnHelper.accessor("subtype", {
                header: () => <span>Subtype</span>,
                cell: info => info.getValue(),
                size: 100,
            }),
            columnHelper.accessor("description", {
                header: () => <span>Description</span>,
                cell: info => info.getValue(),
                size: 200,
            }),
            columnHelper.accessor("size_description", {
                header: () => <span>Size Desc</span>,
                cell: info => info.getValue(),
                size: 120,
            }),
            columnHelper.accessor("size_description_2", {
                header: () => <span>Size Desc 2</span>,
                cell: info => info.getValue(),
                size: 120,
            }),
            columnHelper.accessor("size_oz", {
                header: () => <span>Size (oz)</span>,
                cell: info => info.getValue(),
                size: 80,
            }),
            columnHelper.accessor("size_g", {
                header: () => <span>Size (g)</span>,
                cell: info => info.getValue(),
                size: 80,
            }),
            columnHelper.accessor("servings", {
                header: () => <span>Servings</span>,
                cell: info => info.getValue(),
                size: 80,
            }),
        ],
    }),
    columnHelper.group({
        id: "nutrition_data",
        header: () => <span>Nutrition Info (per serving)</span>,
        columns: [
            columnHelper.accessor("nutrition_id", {
                header: () => <span>Nutrition ID</span>,
                cell: info => info.getValue(),
                size: 80,
            }),
            columnHelper.accessor("nutrition.serving_size_description", {
                header: () => <span>Serving Size Desc</span>,
                cell: info => info.getValue(),
                size: 120,
            }),
            columnHelper.accessor("nutrition.serving_size_oz", {
                header: () => <span>Serving Size (oz)</span>,
                cell: info => info.getValue(),
                size: 100,
            }),
            columnHelper.accessor("nutrition.serving_size_g", {
                header: () => <span>Serving Size (g)</span>,
                cell: info => info.getValue(),
                size: 100,
            }),
            columnHelper.accessor("nutrition.calories", {
                header: () => <span>Calories</span>,
                cell: info => info.getValue(),
                size: 80,
            }),
            columnHelper.accessor("nutrition.total_fat_g", {
                header: () => <span>Total Fat (g)</span>,
                cell: info => info.getValue(),
                size: 80,
            }),
            columnHelper.accessor("nutrition.saturated_fat_g", {
                header: () => <span>Sat. Fat (g)</span>,
                cell: info => info.getValue(),
                size: 80,
            }),
            columnHelper.accessor("nutrition.trans_fat_g", {
                header: () => <span>Trans Fat (g)</span>,
                cell: info => info.getValue(),
                size: 80,
            }),
            columnHelper.accessor("nutrition.cholesterol_mg", {
                header: () => <span>Cholest. (mg)</span>,
                cell: info => info.getValue(),
                size: 80,
            }),
            columnHelper.accessor("nutrition.sodium_mg", {
                header: () => <span>Sodium (mg)</span>,
                cell: info => info.getValue(),
                size: 80,
            }),
            columnHelper.accessor("nutrition.total_carbs_g", {
                header: () => <span>Total Carbs (g)</span>,
                cell: info => info.getValue(),
                size: 80,
            }),
            columnHelper.accessor("nutrition.fiber_g", {
                header: () => <span>Fiber (g)</span>,
                cell: info => info.getValue(),
                size: 80,
            }),
            columnHelper.accessor("nutrition.total_sugar_g", {
                header: () => <span>Total Sugar (g)</span>,
                cell: info => info.getValue(),
                size: 80,
            }),
            columnHelper.accessor("nutrition.added_sugar_g", {
                header: () => <span>Added Sugar (g)</span>,
                cell: info => info.getValue(),
                size: 80,
            }),
            columnHelper.accessor("nutrition.protein_g", {
                header: () => <span>Protein (g)</span>,
                cell: info => info.getValue(),
                size: 80,
            }),
            columnHelper.accessor("nutrition.vitamin_d_mcg", {
                header: () => <span>Vitamin D (mcg)</span>,
                cell: info => info.getValue(),
                size: 80,
            }),
            columnHelper.accessor("nutrition.calcium_mg", {
                header: () => <span>Calcium (mg)</span>,
                cell: info => info.getValue(),
                size: 80,
            }),
            columnHelper.accessor("nutrition.iron_mg", {
                header: () => <span>Iron (mg)</span>,
                cell: info => info.getValue(),
                size: 80,
            }),
            columnHelper.accessor("nutrition.potassium_mg", {
                header: () => <span>Potassium (mg)</span>,
                cell: info => info.getValue(),
                size: 80,
            }),
        ],
    }),
    columnHelper.group({
        id: "price_info",
        header: () => <span>Price Info</span>,
        columns: [
            columnHelper.accessor("price", {
                header: () => <span>Total Price</span>,
                cell: info => (info.getValue() ?? 0).toFixed(2),
                size: 65,
            }),
            columnHelper.accessor("price_per_serving", {
                header: () => <span>Price / serving</span>,
                cell: info => ((info.row.original.price ?? 0) / info.row.original.servings).toFixed(2),
                sortingFn: (rowA, rowB) => {
                    const val1 = rowA.original.price / rowA.original.servings;
                    const val2 = rowB.original.price / rowB.original.servings;
                    return val1 < val2 ? -1 : val1 > val2 ? 1 : 0;
                },
                size: 65,
            }),
            columnHelper.accessor("price_per_oz", {
                header: () => <span>Price / oz</span>,
                cell: info => ((info.row.original.price ?? 0) / info.row.original.size_oz).toFixed(2),
                sortingFn: (rowA, rowB) => {
                    const val1 = rowA.original.price / rowA.original.size_oz;
                    const val2 = rowB.original.price / rowB.original.size_oz;
                    return val1 < val2 ? -1 : val1 > val2 ? 1 : 0;
                },
                size: 65,
            }),
            columnHelper.accessor("price_per_calorie", {
                header: () => <span>Price / 100 cal</span>,
                cell: info =>
                    info.row.original.nutrition.calories === 0
                        ? "∞"
                        : (info.row.original.price * 100 / info.row.original.servings / info.row.original.nutrition.calories).toFixed(2),
                sortingFn: (rowA, rowB) => {
                    const val1 = rowA.original.price / rowA.original.servings / rowA.original.nutrition.calories;
                    const val2 = rowB.original.price / rowB.original.servings / rowB.original.nutrition.calories;
                    return val1 < val2 ? -1 : val1 > val2 ? 1 : 0;
                },
                size: 65,
            }),
            columnHelper.accessor("price_date", {
                header: () => <span>Price Date</span>,
                cell: info => {
                    const val = info.getValue();
                    if (typeof val === "string" && val.trim().length > 0)
                        return new Date(val.replace(/-/g, "/").replace(/T.+/, "")).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                        });
                    return "";
                },
                size: 100,
            }),
        ],
    }),
    columnHelper.accessor("shelf_life", {
        header: () => <span>Shelf Life</span>,
        cell: info => info.getValue(),
        size: 400,
    }),
];

const foodPickerGlobalFilter = (row: Row<IFood>, _columnId: string, filterValue: string): boolean => {
    if (!filterValue) return true;
    const q = filterValue.toLowerCase();
    const food = row.original;
    return (
        food.name.toLowerCase().includes(q) ||
        (food.vendor ?? "").toLowerCase().includes(q) ||
        (food.subtype ?? "").toLowerCase().includes(q)
    );
};

interface FoodPickerTableProps {
    setSelectedRowId: (id: number | null) => void;
    selectedRowId: number | null;
}

const FoodPickerTable: React.FC<FoodPickerTableProps> = ({ setSelectedRowId, selectedRowId }) => {
    const { foods, preferences, updatePreferences } = useData();
    // Sort foods by group, then by name (both alphabetically)
    const sortedFoods = React.useMemo(() => {
        if (!foods) return [];
        return [...foods].sort((a, b) => {
            const groupA = (a.group || "").toLowerCase();
            const groupB = (b.group || "").toLowerCase();
            if (groupA < groupB) return -1;
            if (groupA > groupB) return 1;
            const nameA = (a.name || "").toLowerCase();
            const nameB = (b.name || "").toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });
    }, [foods]);
    const columnsPreferencesKey = FOOD_INGREDIENTS_COLUMNS_PREFERENCES_KEY;
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
        const stored = preferences[columnsPreferencesKey];
        if (stored?.columnVisibility) {
            return enforceMandatoryColumns(columnsPreferencesKey, stored.columnVisibility as Record<string, boolean>) as VisibilityState;
        }
        const defaults = getDefaultColumnsPreferences(columnsPreferencesKey);
        return defaults ? toVisibilityState(defaults.columnVisibility) as VisibilityState : {};
    });
    const [globalFilter, setGlobalFilter] = useState("");
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
    const visibilitySaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const saveColumnVisibility = useCallback(
        (next: VisibilityState) => {
            const withMandatory = enforceMandatoryColumns(columnsPreferencesKey, next as Record<string, boolean>);
            void updatePreferences(columnsPreferencesKey, { columnVisibility: withMandatory });
        },
        [columnsPreferencesKey, updatePreferences]
    );

    useEffect(() => {
        const tablePreferences = preferences[columnsPreferencesKey];
        if (!tablePreferences) return;
        let nextVisibility: VisibilityState | null = null;
        if (tablePreferences.columnVisibility) {
            const loadedVisibility = tablePreferences.columnVisibility as Record<string, boolean>;
            nextVisibility = enforceMandatoryColumns(columnsPreferencesKey, loadedVisibility) as VisibilityState;
        } else {
            const defaults = getDefaultColumnsPreferences(columnsPreferencesKey);
            if (defaults) nextVisibility = toVisibilityState(defaults.columnVisibility) as VisibilityState;
        }
        if (!nextVisibility) return;
        setColumnVisibility(prev => {
            const prevKeys = Object.keys(prev);
            const nextKeys = Object.keys(nextVisibility);
            const same =
                prevKeys.length === nextKeys.length
                && prevKeys.every(key => prev[key] === nextVisibility[key]);
            return same ? prev : nextVisibility;
        });
    }, [preferences, columnsPreferencesKey]);

    useEffect(() => {
        return () => {
            if (visibilitySaveTimeoutRef.current) clearTimeout(visibilitySaveTimeoutRef.current);
        };
    }, []);

    const tableOptions: TableOptions<IFood> = {
        data: sortedFoods,
        columns: foodPickerColumns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        globalFilterFn: foodPickerGlobalFilter,
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        onColumnVisibilityChange: (updater) => {
            setColumnVisibility(prev => {
                const rawNext = typeof updater === "function" ? updater(prev) : updater;
                const next = enforceMandatoryColumns(columnsPreferencesKey, rawNext as Record<string, boolean>) as VisibilityState;
                if (visibilitySaveTimeoutRef.current) clearTimeout(visibilitySaveTimeoutRef.current);
                visibilitySaveTimeoutRef.current = setTimeout(() => saveColumnVisibility(next), TABLE_PREFERENCES_DEBOUNCE_MS);
                return next;
            });
        },
        state: { sorting, columnVisibility, globalFilter, pagination },
    };
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable(tableOptions);

    const totalPages = table.getPageCount();

    const handleClick = (row: Row<IFood>) => {
        const id = row.original.id ?? null;
        setSelectedRowId(selectedRowId === id ? null : id);
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column" }}>
            {/* Toolbar: search box + column visibility picker */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <Box sx={{ position: "relative", flex: 1 }}>
                    <input
                        type="text"
                        style={{ width: "100%", boxSizing: "border-box", paddingRight: globalFilter ? 28 : 8, borderRadius: 4, border: "1px solid #ccc", fontSize: 16, height: 36 }}
                        placeholder="Filter by name, vendor, subtype…"
                        value={globalFilter}
                        onChange={e => { setGlobalFilter(e.target.value); table.setPageIndex(0); }}
                    />
                    {globalFilter ? (
                        <button
                            onClick={() => { setGlobalFilter(""); table.setPageIndex(0); }}
                            style={{ position: "absolute", right: 2, top: 10, background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }}
                            aria-label="Clear filter"
                        >
                            ❌
                        </button>
                    ) : null}
                </Box>
                <ColumnVisibilityPicker table={table} storageKey={columnsPreferencesKey} />
            </Box>

            <TableContainer component={Paper} sx={{ borderRadius: 1, boxShadow: 1, overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 520, tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0 }}>
                    <colgroup>
                        {table.getVisibleLeafColumns().map(col => (
                            <col key={col.id} style={{ width: col.getSize() }} />
                        ))}
                    </colgroup>
                    <TableHead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map(header =>
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
                                            colSpan={header.colSpan}
                                            onClick={header.column.getToggleSortingHandler()}
                                            sx={theme => ({
                                                width: header.getSize(),
                                                userSelect: "none",
                                                fontWeight: "bold",
                                                fontSize: 13,
                                                color: theme.palette.table.headerColor,
                                                background: theme.palette.table.headerBg,
                                                borderRight: `1px solid ${theme.palette.table.headerBorder}`,
                                                borderBottom: `1px solid ${theme.palette.table.headerBorder}`,
                                                p: "5px 8px",
                                                cursor: "pointer",
                                                textAlign: "center",
                                                lineHeight: 1.2,
                                            })}
                                        >
                                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                <Box component="span" sx={{ ml: 0.5 }}>
                                                    {({ asc: " 🔼", desc: " 🔽" } as Record<string, string>)[header.column.getIsSorted() as string] ?? ""}
                                                </Box>
                                            </Box>
                                        </TableCell>
                                    )
                                )}
                            </TableRow>
                        ))}
                    </TableHead>
                    <TableBody>
                        {table.getRowModel().rows.map(row => (
                            <TableRow
                                key={row.id}
                                hover
                                onClick={() => handleClick(row)}
                                sx={theme => ({
                                    cursor: "pointer",
                                    ...(row.original.id === selectedRowId
                                        ? { backgroundColor: `${theme.palette.table.rowSelectedBg} !important` }
                                        : {}),
                                })}
                            >
                                {row.getVisibleCells().map(cell => (
                                    <TableCell
                                        key={cell.id}
                                        sx={theme => ({
                                            borderRight: `1px solid ${theme.palette.table.rowBorder}`,
                                            borderBottom: `1px solid ${theme.palette.table.rowBorder}`,
                                            fontSize: 13,
                                            p: '4px 8px',
                                            textAlign: "center",
                                            whiteSpace: "normal",
                                        })}
                                    >
                                        <TruncatedCell>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TruncatedCell>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                        {table.getRowModel().rows.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={table.getVisibleLeafColumns().length || 1}
                                    sx={{ textAlign: "center", color: "text.secondary", py: 2 }}
                                >
                                    No foods match the filter.
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
                        page={pagination.pageIndex + 1}
                        onChange={(_, p) => table.setPageIndex(p - 1)}
                        size="small"
                    />
                </Box>
            )}
        </Box>
    );
};

export default FoodPickerTable;
