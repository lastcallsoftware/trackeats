import React, { useMemo } from 'react';
import {
    VisibilityState,
    ExpandedState,
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getExpandedRowModel,
    getSortedRowModel,
    Row,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
import { IDailyLogItem, INutrition } from '../contexts/DataProvider';
import { useData } from '@/utils/useData';
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
import { Theme } from '@mui/material/styles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = 'day' | 'week' | 'month';

interface DailyLogTableProps {
    viewMode: ViewMode;
    rangeStart: Date;
    rangeEnd: Date;
    selectedDateKey: string | null;
    setSelectedDateKey: (key: string | null) => void;
    selectedItemId: number | null;
    setSelectedItemId: (id: number | null) => void;
}

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
    nutrition?: INutrition;       // totalled nutrition for this date/week
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

function formatWeekLabel(sundayIso: string): string {
    const [y, m, d] = sundayIso.split('-').map(Number);
    const sunday = new Date(y, m - 1, d);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    const fmt = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `Week of ${fmt(sunday)} – ${fmt(saturday)}`;
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

function weekSundayIso(isoDate: string): string {
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - date.getDay());
    return toISODate(date);
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

        const itemSubRows: DisplayRow[] = dateItems.map(item => {
            dateNutrition = addNutrition(dateNutrition, item.nutrition);
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
                return {
                    type: 'week' as const,
                    rowKey: `week-${sundayIso}`,
                    label: formatWeekLabel(sundayIso),
                    nutrition: weekNutrition,
                    subRows: children,
                };
            });
    }

    return dateRows;
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const columnHelper = createColumnHelper<DisplayRow>();
const DAILY_LOG_VISIBILITY_STORAGE = 'daily_log_visibility_storage';

// Helper: pull a nutrition value from whichever field is populated
function nutVal(row: DisplayRow, key: keyof INutrition): number | null {
    const n = row.item?.nutrition ?? row.nutrition;
    if (!n) return null;
    const v = n[key];
    return typeof v === 'number' ? v : null;
}

const columns = [
    // Expand/collapse + label column
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
    columnHelper.accessor(row => nutVal(row, 'calories'), {
        id: 'calories',
        header: () => <span>Calories</span>,
        cell: info => info.getValue() ?? '—',
        size: 80,
    }),
    columnHelper.accessor(row => nutVal(row, 'total_fat_g'), {
        id: 'total_fat_g',
        header: () => <span>Fat (g)</span>,
        cell: info => info.getValue() ?? '—',
        size: 70,
    }),
    columnHelper.accessor(row => nutVal(row, 'saturated_fat_g'), {
        id: 'saturated_fat_g',
        header: () => <span>Sat. Fat (g)</span>,
        cell: info => info.getValue() ?? '—',
        size: 85,
    }),
    columnHelper.accessor(row => nutVal(row, 'cholesterol_mg'), {
        id: 'cholesterol_mg',
        header: () => <span>Chol. (mg)</span>,
        cell: info => info.getValue() ?? '—',
        size: 80,
    }),
    columnHelper.accessor(row => nutVal(row, 'sodium_mg'), {
        id: 'sodium_mg',
        header: () => <span>Sodium (mg)</span>,
        cell: info => info.getValue() ?? '—',
        size: 90,
    }),
    columnHelper.accessor(row => nutVal(row, 'total_carbs_g'), {
        id: 'total_carbs_g',
        header: () => <span>Carbs (g)</span>,
        cell: info => info.getValue() ?? '—',
        size: 80,
    }),
    columnHelper.accessor(row => nutVal(row, 'fiber_g'), {
        id: 'fiber_g',
        header: () => <span>Fiber (g)</span>,
        cell: info => info.getValue() ?? '—',
        size: 70,
    }),
    columnHelper.accessor(row => nutVal(row, 'total_sugar_g'), {
        id: 'total_sugar_g',
        header: () => <span>Sugar (g)</span>,
        cell: info => info.getValue() ?? '—',
        size: 75,
    }),
    columnHelper.accessor(row => nutVal(row, 'protein_g'), {
        id: 'protein_g',
        header: () => <span>Protein (g)</span>,
        cell: info => info.getValue() ?? '—',
        size: 80,
    }),
    columnHelper.accessor(row => nutVal(row, 'vitamin_d_mcg'), {
        id: 'vitamin_d_mcg',
        header: () => <span>Vit. D (mcg)</span>,
        cell: info => info.getValue() ?? '—',
        size: 85,
    }),
    columnHelper.accessor(row => nutVal(row, 'calcium_mg'), {
        id: 'calcium_mg',
        header: () => <span>Calcium (mg)</span>,
        cell: info => info.getValue() ?? '—',
        size: 90,
    }),
    columnHelper.accessor(row => nutVal(row, 'iron_mg'), {
        id: 'iron_mg',
        header: () => <span>Iron (mg)</span>,
        cell: info => info.getValue() ?? '—',
        size: 75,
    }),
    columnHelper.accessor(row => nutVal(row, 'potassium_mg'), {
        id: 'potassium_mg',
        header: () => <span>Potassium (mg)</span>,
        cell: info => info.getValue() ?? '—',
        size: 100,
    }),
    columnHelper.accessor(row => row.item?.notes ?? null, {
        id: 'notes',
        header: () => <span>Notes</span>,
        cell: info => info.getValue()
            ? <TruncatedCell>{info.getValue()}</TruncatedCell>
            : null,
        size: 180,
    }),
];

// ---------------------------------------------------------------------------
// DailyLogTable
// ---------------------------------------------------------------------------

const DailyLogTable: React.FC<DailyLogTableProps> = ({
    viewMode, rangeStart, rangeEnd,
    selectedDateKey, setSelectedDateKey,
    selectedItemId, setSelectedItemId,
}) => {
    "use no memo"; // React Compiler: useReactTable() returns non-memoizable functions

    const { dailyLogItems, recipes } = useData();
    const [sorting, setSorting] = React.useState<SortingState>([]);
    // Day view: expand all by default (each day is the primary unit).
    // Week/month view: collapsed by default so the user sees the summary first.
    const [expanded, setExpanded] = React.useState<ExpandedState>(() => (viewMode === 'day' ? true : {}));

    React.useEffect(() => {
        setExpanded(() => viewMode === 'day' ? true : {});
    }, [viewMode]);

    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() => {
        const saved = sessionStorage.getItem(DAILY_LOG_VISIBILITY_STORAGE);
        const defaults: VisibilityState = {
            saturated_fat_g: false,
            cholesterol_mg:  false,
            vitamin_d_mcg:   false,
            calcium_mg:      false,
            iron_mg:         false,
            potassium_mg:    false,
        };
        return saved ? JSON.parse(saved) : defaults;
    });

    const displayRows = useMemo(
        () => buildDisplayRows(dailyLogItems, viewMode, rangeStart, rangeEnd, recipes),
        [dailyLogItems, viewMode, rangeStart, rangeEnd, recipes],
    );

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
                const next = typeof updater === 'function' ? updater(prev) : updater;
                sessionStorage.setItem(DAILY_LOG_VISIBILITY_STORAGE, JSON.stringify(next));
                return next;
            });
        },
        state: { sorting, expanded, columnVisibility },
        getRowId: row => row.rowKey,
    });

    // ---------------------------------------------------------------------------
    // Styles
    // ---------------------------------------------------------------------------

    const headerSx = (theme: Theme) => ({
        userSelect: 'none' as const,
        fontWeight: 'bold',
        fontSize: 13,
        color: theme.palette.table.headerColor,
        background: theme.palette.table.headerBg,
        borderRight: `1px solid ${theme.palette.table.headerBorder}`,
        borderBottom: `1px solid ${theme.palette.table.headerBorder}`,
        p: '4px 6px',
        textAlign: 'center' as const,
        whiteSpace: 'nowrap' as const,
        cursor: 'pointer',
    });

    const cellSx = (theme: Theme) => ({
        fontSize: 13,
        borderRight: `1px solid ${theme.palette.table.rowBorder}`,
        borderBottom: `1px solid ${theme.palette.table.rowBorder}`,
        padding: '2px 4px',
        height: '2.2rem',
        textAlign: 'center' as const,
    });

    const rowSx = (row: Row<DisplayRow>, isSelected: boolean, isDateSelected: boolean) => (theme: Theme) => {
        const dr = row.original;
        if (dr.type === 'week') return {
            backgroundColor: theme.palette.table.headerBg,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
        };
        if (dr.type === 'date') return {
            backgroundColor: isDateSelected
                ? `${theme.palette.table.rowSelectedBg} !important`
                : theme.palette.grey[100],
            fontWeight: 600,
            cursor: 'pointer',
        };
        // item row
        return {
            cursor: 'pointer',
            ...(isSelected
                ? { backgroundColor: `${theme.palette.table.rowSelectedBg} !important` }
                : row.parentId != null  // item is visible only when its parent is expanded
                    ? { backgroundColor: `${theme.palette.primary.main}0A` } // ~4% opacity tint via hex alpha
                    : {}
            ),
        };
    };

    const visibleColCount = table.getVisibleLeafColumns().length;

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1, py: 0.75 }}>
                <ColumnVisibilityPicker table={table} storageKey={DAILY_LOG_VISIBILITY_STORAGE} />
            </Box>

            <TableContainer component={Paper} sx={{ overflowX: 'auto', borderRadius: 2, boxShadow: 2 }}>
                <Table size="small" sx={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <colgroup>
                        {table.getVisibleLeafColumns().map(col => (
                            <col key={col.id} style={{ width: col.getSize() }} />
                        ))}
                    </colgroup>

                    <TableHead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <TableCell
                                        key={header.id}
                                        colSpan={header.colSpan}
                                        sx={headerSx}
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                        {({ asc: ' 🔼', desc: ' 🔽' } as Record<string, string>)[header.column.getIsSorted() as string] ?? null}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableHead>

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
                                            }
                                            // week rows: +/- button handles expansion only
                                        }}
                                        sx={rowSx(row, isSelected, isDateSelected)}
                                    >
                                        {row.getVisibleCells().map(cell => (
                                            <TableCell
                                                key={cell.id}
                                                sx={theme => ({
                                                    ...cellSx(theme),
                                                    // Left-align the label column; centre everything else
                                                    textAlign: cell.column.id === 'label' ? 'left' : 'center',
                                                    fontWeight: isChildExpanded ? 600 : 'inherit',
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
};

export default DailyLogTable;