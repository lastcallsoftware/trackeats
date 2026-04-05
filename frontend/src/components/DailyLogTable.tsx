import {
    VisibilityState,
    ExpandedState,
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getExpandedRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { IDailyLogItem, INutrition } from '../contexts/DataProvider';
import { useData } from '@/utils/useData';
import {
    enforceMandatoryColumns,
    DAILYLOG_COLUMNS_PREFERENCES_KEY,
    getDefaultColumnsPreferences,
    TABLE_PREFERENCES_DEBOUNCE_MS,
    toVisibilityState,
} from '@/utils/constants';
import ColumnVisibilityPicker from './ColumnVisibilityPicker';
import TruncatedCell from './TruncatedCell';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = 'day' | 'week' | 'month';

// Every row in the table is a DisplayRow.
// Date rows have subRows (the items for that day); item rows do not.
// Week rows (month view only) have subRows of date rows.
interface DisplayRow {
    type: 'date' | 'item' | 'week';
    // Unique stable key for TanStack
    rowKey: string;
    // Date rows + week rows
    label?: string;
    date?: string;                 // ISO date string, present on date rows only
    weekKey?: string;              // ISO date string of Sunday, present on week rows only
    nutrition?: INutrition;       // totalled nutrition for this date/week
    price?: number;               // totalled price for this date/week
    // Item rows only
    item?: IDailyLogItem;
    recipeName?: string;
    // TanStack sub-rows
    subRows?: DisplayRow[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toISODate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function formatDate(isoDate: string): string {
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
    });
}

function formatWeekLabel(firstIso: string, lastIso: string): string {
    const fmt = (iso: string) => {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    return `Week of ${fmt(firstIso)} – ${fmt(lastIso)}`;
}

function zeroNutrition(): INutrition {
    return {
        serving_size_description: '',
        serving_size_oz: 0, serving_size_g: 0,
        calories: 0, total_fat_g: 0, saturated_fat_g: 0, trans_fat_g: 0,
        cholesterol_mg: 0, sodium_mg: 0, total_carbs_g: 0, fiber_g: 0,
        total_sugar_g: 0, added_sugar_g: 0, protein_g: 0,
        vitamin_d_mcg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0,
    };
}

function addNutrition(acc: INutrition, n: INutrition | undefined): INutrition {
    if (!n) return acc;
    return {
        serving_size_description: '',
        serving_size_oz:   acc.serving_size_oz   + (n.serving_size_oz   ?? 0),
        serving_size_g:    acc.serving_size_g    + (n.serving_size_g    ?? 0),
        calories:          acc.calories          + (n.calories          ?? 0),
        total_fat_g:       acc.total_fat_g       + (n.total_fat_g       ?? 0),
        saturated_fat_g:   acc.saturated_fat_g   + (n.saturated_fat_g   ?? 0),
        trans_fat_g:       acc.trans_fat_g       + (n.trans_fat_g       ?? 0),
        cholesterol_mg:    acc.cholesterol_mg    + (n.cholesterol_mg    ?? 0),
        sodium_mg:         acc.sodium_mg         + (n.sodium_mg         ?? 0),
        total_carbs_g:     acc.total_carbs_g     + (n.total_carbs_g     ?? 0),
        fiber_g:           acc.fiber_g           + (n.fiber_g           ?? 0),
        total_sugar_g:     acc.total_sugar_g     + (n.total_sugar_g     ?? 0),
        added_sugar_g:     acc.added_sugar_g     + (n.added_sugar_g     ?? 0),
        protein_g:         acc.protein_g         + (n.protein_g         ?? 0),
        vitamin_d_mcg:     acc.vitamin_d_mcg     + (n.vitamin_d_mcg     ?? 0),
        calcium_mg:        acc.calcium_mg        + (n.calcium_mg        ?? 0),
        iron_mg:           acc.iron_mg           + (n.iron_mg           ?? 0),
        potassium_mg:      acc.potassium_mg      + (n.potassium_mg      ?? 0),
    };
}

function addPrice(acc: number, price: number | undefined): number {
    return acc + (price ?? 0);
}

function weekSundayIso(isoDate: string): string {
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - date.getDay());
    return toISODate(date);
}

function findExpansionPath(
    rows: DisplayRow[],
    predicate: (row: DisplayRow) => boolean,
): string[] | null {
    for (const row of rows) {
        if (predicate(row)) {
            return [];
        }

        if (row.subRows && row.subRows.length > 0) {
            const childPath = findExpansionPath(row.subRows, predicate);
            if (childPath) {
                return [row.rowKey, ...childPath];
            }
        }
    }

    return null;
}

// ---------------------------------------------------------------------------
// Build hierarchical display rows
// ---------------------------------------------------------------------------

function buildDisplayRows(
    items: IDailyLogItem[],
    viewMode: ViewMode,
    rangeStart: Date,
    rangeEnd: Date,
    recipes: { id?: number; name: string }[],
): DisplayRow[] {

    // --- 1. Group items by date, pre-populating every date in the range ---
    const byDate = new Map<string, IDailyLogItem[]>();
    const cursor = new Date(rangeStart);
    while (cursor <= rangeEnd) {
        byDate.set(toISODate(cursor), []);
        cursor.setDate(cursor.getDate() + 1);
    }
    for (const item of items) {
        const list = byDate.get(item.date) ?? [];
        list.push(item);
        byDate.set(item.date, list);
    }

    const sortedDates = Array.from(byDate.keys()).sort();

    // --- 2. Build one DateRow per date, each with item subRows ---
    const dateRows: DisplayRow[] = sortedDates.map(date => {
        const dateItems = byDate.get(date)!;
        let dateNutrition = zeroNutrition();
        let datePrice = 0;

        const itemSubRows: DisplayRow[] = dateItems.map(item => {
            dateNutrition = addNutrition(dateNutrition, item.nutrition);
            datePrice = addPrice(datePrice, item.price);
            const recipeName = recipes.find(r => r.id === item.recipe_id)?.name
                ?? `Recipe ${item.recipe_id}`;
            return {
                type: 'item' as const,
                rowKey: `item-${item.id}`,
                item,
                recipeName,
            };
        });

        return {
            type: 'date' as const,
            rowKey: `date-${date}`,
            date,
            label: formatDate(date),
            nutrition: dateItems.length > 0 ? dateNutrition : undefined,
            price: dateItems.length > 0 ? roundToCents(datePrice) : undefined,
            subRows: itemSubRows,
        };
    });

    // --- 3. In month view, wrap date rows in week rows ---
    if (viewMode === 'month') {
        const byWeek = new Map<string, DisplayRow[]>();
        for (const dateRow of dateRows) {
            // Extract the ISO date from the rowKey "date-YYYY-MM-DD"
            const iso = dateRow.rowKey.replace('date-', '');
            const wk = weekSundayIso(iso);
            const list = byWeek.get(wk) ?? [];
            list.push(dateRow);
            byWeek.set(wk, list);
        }

        return Array.from(byWeek.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([sundayIso, children]) => {
                const weekNutrition = children.reduce(
                    (acc, dr) => addNutrition(acc, dr.nutrition),
                    zeroNutrition()
                );
                const weekPrice = children.reduce(
                    (acc, dr) => addPrice(acc, dr.price),
                    0
                );
                // Use the actual first and last dates present in this week group
                // (clamped to the month range) rather than always Sunday-Saturday.
                const childDates = children
                    .map(dr => dr.rowKey.replace('date-', ''))
                    .sort();
                const firstDate = childDates[0];
                const lastDate = childDates[childDates.length - 1];
                return {
                    type: 'week' as const,
                    rowKey: `week-${sundayIso}`,
                    weekKey: sundayIso,
                    label: formatWeekLabel(firstDate, lastDate),
                    nutrition: weekNutrition,
                    price: roundToCents(weekPrice),
                    subRows: children,
                };
            });
    }

    return dateRows;
}

// Define the table's columns
const columnHelper = createColumnHelper<DisplayRow>();

// Helper: pull a numeric nutrition value from whichever field is populated
function nutVal(row: DisplayRow, key: keyof INutrition): number | null {
    const n = row.item?.nutrition ?? row.nutrition;
    if (!n) return null;
    const v = n[key];
    return typeof v === 'number' ? v : null;
}

function roundToCents(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function priceVal(row: DisplayRow): number | null {
    if (row.type === 'item') {
        return typeof row.item?.price === 'number' ? row.item.price : null;
    }
    return typeof row.price === 'number' ? row.price : null;
}

function pricePerServingVal(row: DisplayRow): number | null {
    if (row.type !== 'item') return null;
    const price = row.item?.price;
    const servings = row.item?.servings;
    if (typeof price !== 'number' || typeof servings !== 'number' || servings <= 0) {
        return null;
    }
    return roundToCents(price / servings);
}

const columns = [
    columnHelper.group({
        id: "general_info",
        header: () => <span>General Info</span>,
        columns: [
            columnHelper.accessor(row => row.item?.id ?? null, {
                id: 'id',
                header: () => <span>ID</span>,
                cell: info => info.getValue() ?? '',
                size: 55,
            }),
            columnHelper.accessor('label', {
                id: 'label',
                header: () => <span>Date / Recipe</span>,
                cell: ({ row }) => {
                    const dr = row.original;
                    const canExpand = row.getCanExpand();
                    return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5,
                                   pl: dr.type === 'item' ? 3 : dr.type === 'date' && row.depth > 0 ? 2 : 0 }}>
                            {canExpand ? (
                                <Box
                                    component="span"
                                    onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
                                    sx={{ cursor: 'pointer', fontWeight: 700, fontSize: 16, lineHeight: 1,
                                          color: 'primary.main', userSelect: 'none', px: 0.5 }}
                                >
                                    {row.getIsExpanded() ? '−' : '+'}
                                </Box>
                            ) : (
                                <Box component="span" sx={{ display: 'inline-block', width: 24 }} />
                            )}
                            <TruncatedCell>
                                {dr.type === 'item' ? dr.recipeName : dr.label}
                            </TruncatedCell>
                        </Box>
                    );
                },
                size: 220,
            }),
            columnHelper.accessor(row => row.item?.servings ?? null, {
                id: 'servings',
                header: () => <span>Servings</span>,
                cell: info => info.getValue() ?? '',
                size: 75,
            }),
        ]
    }),
    columnHelper.group({
        id: "nutrition_data",
        header: () => <span>Nutrition Info</span>,
        columns: [
            columnHelper.accessor(row => row.item?.nutrition_id ?? null, {
                id: 'nutrition_id',
                header: () => <span>Nutrition ID</span>,
                cell: info => info.getValue() ?? '',
                size: 80,
            }),
            columnHelper.accessor(row => {
                const n = row.item?.nutrition ?? row.nutrition;
                return n?.serving_size_description ?? '';
            }, {
                id: 'nutrition_serving_size_description',
                header: () => <span>Serving Size Desc</span>,
                cell: info => info.getValue() || '',
                size: 120,
            }),
            columnHelper.accessor(row => nutVal(row, 'serving_size_oz'), {
                id: 'nutrition_serving_size_oz',
                header: () => <span>Serving Size (oz)</span>,
                cell: info => info.getValue() ?? '',
                size: 80,
            }),
            columnHelper.accessor(row => nutVal(row, 'serving_size_g'), {
                id: 'nutrition_serving_size_g',
                header: () => <span>Serving Size (g)</span>,
                cell: info => info.getValue() ?? '',
                size: 80,
            }),
            columnHelper.accessor(row => nutVal(row, 'calories'), {
                id: 'nutrition_calories',
                header: () => <span>Calories</span>,
                cell: info => info.getValue() ?? '—',
                size: 80,
            }),
            columnHelper.accessor(row => nutVal(row, 'total_fat_g'), {
                id: 'nutrition_total_fat_g',
                header: () => <span>Total Fat (g)</span>,
                cell: info => info.getValue() ?? '—',
                size: 80,
            }),
            columnHelper.accessor(row => nutVal(row, 'saturated_fat_g'), {
                id: 'nutrition_saturated_fat_g',
                header: () => <span>Sat. Fat (g)</span>,
                cell: info => info.getValue() ?? '—',
                size: 80,
            }),
            columnHelper.accessor(row => nutVal(row, 'trans_fat_g'), {
                id: 'nutrition_trans_fat_g',
                header: () => <span>Trans Fat (g)</span>,
                cell: info => info.getValue() ?? '—',
                size: 80,
            }),
            columnHelper.accessor(row => nutVal(row, 'cholesterol_mg'), {
                id: 'nutrition_cholesterol_mg',
                header: () => <span>Cholest. (mg)</span>,
                cell: info => info.getValue() ?? '—',
                size: 80,
            }),
            columnHelper.accessor(row => nutVal(row, 'sodium_mg'), {
                id: 'nutrition_sodium_mg',
                header: () => <span>Sodium (mg)</span>,
                cell: info => info.getValue() ?? '—',
                size: 80,
            }),
            columnHelper.accessor(row => nutVal(row, 'total_carbs_g'), {
                id: 'nutrition_total_carbs_g',
                header: () => <span>Total Carbs (g)</span>,
                cell: info => info.getValue() ?? '—',
                size: 80,
            }),
            columnHelper.accessor(row => nutVal(row, 'fiber_g'), {
                id: 'nutrition_fiber_g',
                header: () => <span>Fiber (g)</span>,
                cell: info => info.getValue() ?? '—',
                size: 80,
            }),
            columnHelper.accessor(row => nutVal(row, 'total_sugar_g'), {
                id: 'nutrition_total_sugar_g',
                header: () => <span>Total Sugar (g)</span>,
                cell: info => info.getValue() ?? '—',
                size: 80,
            }),
            columnHelper.accessor(row => nutVal(row, 'added_sugar_g'), {
                id: 'nutrition_added_sugar_g',
                header: () => <span>Added Sugar (g)</span>,
                cell: info => info.getValue() ?? '—',
                size: 80,
            }),
            columnHelper.accessor(row => nutVal(row, 'protein_g'), {
                id: 'nutrition_protein_g',
                header: () => <span>Protein (g)</span>,
                cell: info => info.getValue() ?? '—',
                size: 80,
            }),
            columnHelper.accessor(row => nutVal(row, 'vitamin_d_mcg'), {
                id: 'nutrition_vitamin_d_mcg',
                header: () => <span>Vitamin D (mcg)</span>,
                cell: info => info.getValue() ?? '—',
                size: 80,
            }),
            columnHelper.accessor(row => nutVal(row, 'calcium_mg'), {
                id: 'nutrition_calcium_mg',
                header: () => <span>Calcium (mg)</span>,
                cell: info => info.getValue() ?? '—',
                size: 80,
            }),
            columnHelper.accessor(row => nutVal(row, 'iron_mg'), {
                id: 'nutrition_iron_mg',
                header: () => <span>Iron (mg)</span>,
                cell: info => info.getValue() ?? '—',
                size: 80,
            }),
            columnHelper.accessor(row => nutVal(row, 'potassium_mg'), {
                id: 'nutrition_potassium_mg',
                header: () => <span>Potassium (mg)</span>,
                cell: info => info.getValue() ?? '—',
                size: 80,
            }),
        ]
    }),
    columnHelper.group({
        id: "price_info",
        header: () => <span>Price Info</span>,
        columns: [
            columnHelper.accessor(row => priceVal(row), {
                id: 'price',
                header: () => <span>Total Price</span>,
                cell: info => {
                    const value = info.getValue();
                    return typeof value === 'number' ? value.toFixed(2) : '—';
                },
                size: 90,
            }),
            columnHelper.accessor(row => pricePerServingVal(row), {
                id: 'price_per_serving',
                header: () => <span>Price / serving</span>,
                cell: info => {
                    const value = info.getValue();
                    return typeof value === 'number' ? value.toFixed(2) : '—';
                },
                size: 95,
            }),
        ]
    }),
    columnHelper.accessor(row => row.item?.notes ?? null, {
        id: 'notes',
        header: () => <span>Notes</span>,
        cell: info => info.getValue()
            ? <TruncatedCell>{info.getValue()}</TruncatedCell>
            : null,
        size: 180,
    }),
]

interface DailyLogTableProps {
    viewMode: ViewMode;
    rangeStart: Date;
    rangeEnd: Date;
    selectedWeekKey: string | null;
    setSelectedWeekKey: (key: string | null) => void;
    selectedDateKey: string | null;
    setSelectedDateKey: (key: string | null) => void;
    selectedItemId: number | null;
    setSelectedItemId: (id: number | null) => void;
}

// Declare the DailyLog table itself
const DailyLogTable: React.FC<DailyLogTableProps> = ({
    viewMode, rangeStart, rangeEnd,
    selectedWeekKey, setSelectedWeekKey,
    selectedDateKey, setSelectedDateKey,
    selectedItemId, setSelectedItemId,
}) => {
    const { dailyLogItems, recipes, preferences, updatePreferences } = useData();
    const [sorting, setSorting] = React.useState<SortingState>([]);
    // Day view: expand all by default (each day is the primary unit).
    // Week/month view: collapsed by default so the user sees the summary first.
    const [expanded, setExpanded] = React.useState<ExpandedState>(() => (viewMode === 'day' ? true : {}));
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [preferencesReady, setPreferencesReady] = React.useState(false);
    const preferencesLoadedRef = useRef(false);
    const visibilitySaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const columnsPreferencesKey = DAILYLOG_COLUMNS_PREFERENCES_KEY;

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

    useEffect(() => {
        setExpanded(() => viewMode === 'day' ? true : {});
    }, [viewMode]);

    const displayRows = useMemo(
        () => buildDisplayRows(dailyLogItems, viewMode, rangeStart, rangeEnd, recipes),
        [dailyLogItems, viewMode, rangeStart, rangeEnd, recipes],
    );

    useEffect(() => {
        if (viewMode === 'day') return;

        const expansionPath = selectedItemId != null
            ? findExpansionPath(displayRows, row => row.type === 'item' && row.item?.id === selectedItemId)
            : selectedDateKey
                ? findExpansionPath(displayRows, row => row.type === 'date' && row.date === selectedDateKey)
                : null;

        if (!expansionPath || expansionPath.length === 0) return;

        setExpanded(prev => {
            if (prev === true) return prev;

            const next = { ...prev };
            let changed = false;

            for (const rowKey of expansionPath) {
                if (!next[rowKey]) {
                    next[rowKey] = true;
                    changed = true;
                }
            }

            return changed ? next : prev;
        });
    }, [displayRows, selectedDateKey, selectedItemId, viewMode]);

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: displayRows,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getSubRows: row => row.subRows,
        onSortingChange: setSorting,
        onExpandedChange: setExpanded,
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
        state: { sorting, expanded, columnVisibility },
        getRowId: row => row.rowKey,
    });

    const visibleColCount = table.getVisibleLeafColumns().length;

    return (
        <Box sx={{ visibility: preferencesReady ? 'visible' : 'hidden' }}>
            {/* Hide table until preferences are loaded to avoid column flicker. */}
            {/* Column visibility picker toolbar */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1, py: 0.75 }}>
                <ColumnVisibilityPicker table={table} storageKey={columnsPreferencesKey} />
            </Box>

            <TableContainer
                component={Paper}
                sx={{
                    overflowX: 'auto',
                    borderRadius: 2,
                    boxShadow: 2,
                }}
            >
                <Table size="small" sx={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}>
                    {/* Fixed column widths keep grouped headers and data cells aligned. */}
                    <colgroup>
                        {table.getVisibleLeafColumns().map(col => (
                            <col key={col.id} style={{ width: col.getSize() }} />
                        ))}
                    </colgroup>
                    {/* Multi-row/group header rendering from TanStack header groups. */}
                    <TableHead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id} sx={{ height: '2.5rem' }}>
                                {headerGroup.headers.map(header =>
                                    // TanStack emits placeholder headers to keep colSpan math aligned
                                    // when a parent group spans children that render on deeper header rows.
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
                                        // Real header cells render grouped labels/leaf labels and handle sorting.
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
                                            {/* Keep header text + sort indicator centered even when wrapped. */}
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    <Box component="span" sx={{ ml: 1 }}>
                                                        {{asc: '🔼', desc: '🔽'}[header.column.getIsSorted() as string] ?? null}
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                    )
                                )}
                            </TableRow>
                        ))}
                    </TableHead>

                    {/* Body: either an empty-state row or hierarchical week/date/item rows. */}
                    <TableBody>
                        {displayRows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={visibleColCount} sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                                    No entries logged for this period.
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map(row => {
                                const dr = row.original;
                                const isSelected = dr.item?.id === selectedItemId;
                                const isDateSelected = dr.type === 'date' && dr.date === selectedDateKey;
                                const isWeekSelected = dr.type === 'week' && dr.weekKey === selectedWeekKey;
                                const isChildExpanded = dr.type !== 'item' && row.getIsExpanded();

                                return (
                                    <TableRow
                                        key={row.id}
                                        hover={dr.type === 'item'}
                                        onClick={() => {
                                            if (dr.type === 'item') {
                                                setSelectedItemId(isSelected ? null : (dr.item?.id ?? null));
                                            } else if (dr.type === 'date') {
                                                setSelectedDateKey(isDateSelected ? null : (dr.date ?? null));
                                            } else if (dr.type === 'week') {
                                                setSelectedWeekKey(isWeekSelected ? null : (dr.weekKey ?? null));
                                            }
                                        }}
                                        sx={theme => {
                                            if (dr.type === 'week') return {
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                height: '2.5rem',
                                                backgroundColor: isWeekSelected
                                                    ? `${theme.palette.table.rowSelectedBg} !important`
                                                    : theme.palette.table.rowUnselectedBg.dark,
                                                color: isWeekSelected ? theme.palette.common.white : 'inherit',
                                            };
                                            if (dr.type === 'date') return {
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                height: '2.5rem',
                                                backgroundColor: isDateSelected
                                                    ? `${theme.palette.table.rowSelectedBg} !important`
                                                    : theme.palette.table.rowUnselectedBg.medium,
                                                color: isDateSelected ? theme.palette.common.white : 'inherit',
                                            };
                                            // item row
                                            return {
                                                cursor: 'pointer',
                                                height: '2.5rem',
                                                backgroundColor: isSelected
                                                    ? `${theme.palette.table.rowSelectedBg} !important`
                                                    : theme.palette.table.rowUnselectedBg.light,
                                                color: isSelected ? theme.palette.common.white : 'inherit',
                                            };
                                        }}
                                    >
                                        {row.getVisibleCells().map(cell => (
                                            <TableCell
                                                key={cell.id}
                                                sx={theme => ({
                                                    borderRight: `1px solid ${theme.palette.table.rowBorder}`,
                                                    borderBottom: `1px solid ${theme.palette.table.rowBorder}`,
                                                    fontSize: 14,
                                                    padding: '2px',
                                                    height: '2.5rem',
                                                    maxHeight: '2.5rem',
                                                    textAlign: cell.column.id === 'label' ? 'left' : 'center',
                                                    whiteSpace: 'normal',
                                                    fontWeight: isChildExpanded ? 600 : 'inherit',
                                                    color: (isSelected || isDateSelected || isWeekSelected) ? theme.palette.common.white : 'inherit',
                                                })}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

export default DailyLogTable;