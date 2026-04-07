import { useState, useRef, isValidElement } from 'react';
import { Table } from '@tanstack/react-table';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import {
    enforceMandatoryColumns,
    getDefaultColumnsPreferences,
    getMandatoryColumnIds,
    toVisibilityState,
} from '@/utils/constants';

interface ColumnVisibilityPickerProps<T> {
    table: Table<T>;
    storageKey: string;
    /** Map from column id to a friendly display name (optional override) */
    labelOverrides?: Record<string, string>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ColumnVisibilityPicker<T = any>(props: ColumnVisibilityPickerProps<T>) {
    const { table, labelOverrides = {} } = props;
    const [open, setOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const anchorRef = useRef<HTMLButtonElement | null>(null);

    const handleToggle = (columnId: string, checked: boolean) => {
        table.getColumn(columnId)?.toggleVisibility(checked);
    };

    const mandatoryColumnIds = new Set(getMandatoryColumnIds(props.storageKey));

    const handleToggleAll = (checked: boolean) => {
        const nextVisibility: Record<string, boolean> = {};
        for (const col of leafColumns) {
            nextVisibility[col.id] = mandatoryColumnIds.has(col.id) ? true : checked;
        }
        table.setColumnVisibility(enforceMandatoryColumns(props.storageKey, nextVisibility));
    };

    const getDefaultVisibility = (): Record<string, boolean> => {
        const defaults = getDefaultColumnsPreferences(props.storageKey);
        if (!defaults) return {};
        return toVisibilityState(defaults.columnVisibility);
    };

    const handleResetToDefaults = () => {
        table.setColumnVisibility(getDefaultVisibility());
    };

    // Get only leaf (data) columns, not group headers
    const leafColumns = table.getAllLeafColumns().filter(col => col.id !== '_select');

    const toReadableLabel = (value: string): string =>
        value
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b\w/g, c => c.toUpperCase());

    const extractHeaderLabel = (header: unknown, fallback: string): string => {
        if (typeof header === 'string' || typeof header === 'number') {
            return String(header);
        }

        if (typeof header === 'function') {
            try {
                const rendered = (header as () => unknown)();
                return extractHeaderLabel(rendered, fallback);
            } catch {
                return toReadableLabel(fallback);
            }
        }

        if (isValidElement(header)) {
            const props = header.props as { children?: unknown };
            const children = props?.children;
            if (typeof children === 'string' || typeof children === 'number') {
                return String(children);
            }
        }

        return toReadableLabel(fallback);
    };

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
                    : extractHeaderLabel(col.parent?.columnDef.header, groupId);
            grouped.push({ groupLabel, columns: [] });
        }
        grouped[grouped.length - 1].columns.push(col);
    }

    const visibleCount = leafColumns.filter(c => c.getIsVisible()).length;
    const allVisible = leafColumns.length > 0 && visibleCount === leafColumns.length;
    const someVisible = visibleCount > 0 && visibleCount < leafColumns.length;

    return (
        <Box sx={{ display: 'inline-block' }}>
            <Button
                ref={(el) => { anchorRef.current = el; setAnchorEl(el); }}
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

            <Popper
                open={open}
                anchorEl={anchorEl}
                placement="bottom-end"
                sx={{ zIndex: 1300 }}
            >
                <ClickAwayListener
                    onClickAway={(event) => {
                        if (anchorEl?.contains(event.target as Node)) {
                            return;
                        }
                        setOpen(false);
                    }}
                >
                    <Paper
                        elevation={8}
                        sx={{
                            mt: 0.5,
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
                                onClick={handleResetToDefaults}
                            >
                                Reset to defaults
                            </Button>
                        </Box>
                        <Divider sx={{ mb: 1 }} />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    size="small"
                                    checked={allVisible}
                                    indeterminate={someVisible}
                                    onChange={e => handleToggleAll(e.target.checked)}
                                    sx={{ py: 0.25, px: 0.75 }}
                                />
                            }
                            label={<Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>Toggle All</Typography>}
                            sx={{ display: 'flex', m: 0, width: '100%', mb: 0.5 }}
                        />
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
                                        extractHeaderLabel(rawHeader, col.id);
                                    const isMandatory = mandatoryColumnIds.has(col.id);
                                    return (
                                        <FormControlLabel
                                            key={col.id}
                                            control={
                                                <Checkbox
                                                    size="small"
                                                    checked={isMandatory ? true : col.getIsVisible()}
                                                    disabled={isMandatory}
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
                </ClickAwayListener>
            </Popper>
        </Box>
    );
}

export default ColumnVisibilityPicker;