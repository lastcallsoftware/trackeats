import { useState, useRef, useEffect } from 'react';
import { Table } from '@tanstack/react-table';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';

interface ColumnVisibilityPickerProps<T> {
    table: Table<T>;
    storageKey: string;
    /** Map from column id to a friendly display name (optional override) */
    labelOverrides?: Record<string, string>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ColumnVisibilityPicker<T = any>({
    table,
    storageKey,
    labelOverrides = {},
}: ColumnVisibilityPickerProps<T>) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Persist visibility to sessionStorage whenever it changes
    const handleToggle = (columnId: string, checked: boolean) => {
        table.getColumn(columnId)?.toggleVisibility(checked);
        // Read updated state after toggling and persist
        setTimeout(() => {
            const visibility = table.getState().columnVisibility;
            sessionStorage.setItem(storageKey, JSON.stringify(visibility));
        }, 0);
    };

    const handleShowAll = () => {
        table.toggleAllColumnsVisible(true);
        sessionStorage.setItem(storageKey, JSON.stringify({}));
    };

    // Get only leaf (data) columns, not group headers
    const leafColumns = table.getAllLeafColumns().filter(col => col.id !== '_select');

    // Group columns by their parent group header label
    const grouped: { groupLabel: string; columns: typeof leafColumns }[] = [];
    const seen = new Set<string>();

    for (const col of leafColumns) {
        const groupId = col.parent?.id ?? '__ungrouped__';
        if (!seen.has(groupId)) {
            seen.add(groupId);
            const groupLabel =
                groupId === '__ungrouped__'
                    ? 'Other'
                    : (col.parent?.columnDef.header as string | undefined) ??
                      groupId;
            grouped.push({ groupLabel, columns: [] });
        }
        grouped[grouped.length - 1].columns.push(col);
    }

    const visibleCount = leafColumns.filter(c => c.getIsVisible()).length;

    return (
        <Box ref={containerRef} sx={{ position: 'relative', display: 'inline-block' }}>
            <Button
                variant="outlined"
                size="small"
                startIcon={<ViewColumnIcon />}
                onClick={() => setOpen(v => !v)}
                sx={{
                    textTransform: 'none',
                    fontSize: 13,
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                }}
            >
                Columns&nbsp;
                <Typography
                    component="span"
                    sx={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'primary.main',
                        bgcolor: 'primary.50',
                        borderRadius: 1,
                        px: 0.6,
                    }}
                >
                    {visibleCount}/{leafColumns.length}
                </Typography>
            </Button>

            {open && (
                <Paper
                    elevation={8}
                    sx={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        mt: 0.5,
                        zIndex: 1300,
                        minWidth: 220,
                        maxWidth: 300,
                        maxHeight: 480,
                        overflowY: 'auto',
                        p: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Visible Columns
                        </Typography>
                        <Button
                            size="small"
                            sx={{ fontSize: 11, textTransform: 'none', py: 0, minWidth: 0 }}
                            onClick={handleShowAll}
                        >
                            Show all
                        </Button>
                    </Box>
                    <Divider sx={{ mb: 1 }} />

                    {grouped.map(({ groupLabel, columns }) => (
                        <Box key={groupLabel} sx={{ mb: 1 }}>
                            {grouped.length > 1 && (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        display: 'block',
                                        fontWeight: 600,
                                        color: 'primary.main',
                                        mb: 0.25,
                                        pl: 0.5,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.4,
                                        fontSize: 10,
                                    }}
                                >
                                    {typeof groupLabel === 'string' ? groupLabel : String(groupLabel)}
                                </Typography>
                            )}
                            {columns.map(col => {
                                const rawHeader = col.columnDef.header;
                                const label =
                                    labelOverrides[col.id] ??
                                    (typeof rawHeader === 'string'
                                        ? rawHeader
                                        : col.id);
                                return (
                                    <FormControlLabel
                                        key={col.id}
                                        control={
                                            <Checkbox
                                                size="small"
                                                checked={col.getIsVisible()}
                                                onChange={e => handleToggle(col.id, e.target.checked)}
                                                sx={{ py: 0.25, px: 0.75 }}
                                            />
                                        }
                                        label={
                                            <Typography variant="body2" sx={{ fontSize: 13 }}>
                                                {label}
                                            </Typography>
                                        }
                                        sx={{ display: 'flex', m: 0, width: '100%' }}
                                    />
                                );
                            })}
                        </Box>
                    ))}
                </Paper>
            )}
        </Box>
    );
}

export default ColumnVisibilityPicker;