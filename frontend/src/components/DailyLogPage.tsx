import { useState, useEffect, useMemo } from 'react';
import { MdAddCircleOutline, MdRemoveCircleOutline, MdEdit, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TitleCard from './TitleCard';
import DailyLogTable from './DailyLogTable';
import NutritionLabel from './NutritionLabel';
import { useData, DailyLogItem } from '@/utils/useData';
import { IDailyLogItem, INutrition } from '../contexts/DataProvider';

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function toISODate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
    const result = new Date(d);
    result.setDate(d.getDate() - d.getDay());
    return result;
}

function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function formatDateRange(start: Date, end: Date, mode: ViewMode): string {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    if (mode === 'day') return start.toLocaleDateString('en-US', opts);
    if (mode === 'week') {
        const s = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const e = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `${s} – ${e}`;
    }
    return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

type ViewMode = 'day' | 'week' | 'month';

// ---------------------------------------------------------------------------
// DailyLogPage
// ---------------------------------------------------------------------------

function DailyLogPage() {
    const { recipes, dailyLogItems, getDailyLogItems, addDailyLogItem, updateDailyLogItem, deleteDailyLogItem } = useData();

    // -- View mode & date range --
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());

    const { rangeStart, rangeEnd } = useMemo(() => {
        let start: Date;
        let end: Date;
        if (viewMode === 'day') {
            start = new Date(anchorDate);
            end   = new Date(anchorDate);
        } else if (viewMode === 'week') {
            start = startOfWeek(anchorDate);
            end   = new Date(start);
            end.setDate(start.getDate() + 6);
        } else {
            start = startOfMonth(anchorDate);
            end   = endOfMonth(anchorDate);
        }
        return { rangeStart: start, rangeEnd: end };
    }, [viewMode, anchorDate]);

    useEffect(() => {
        getDailyLogItems(toISODate(rangeStart), toISODate(rangeEnd));
    }, [rangeStart, rangeEnd, getDailyLogItems]);

    const navigatePeriod = (direction: -1 | 1) => {
        const next = new Date(anchorDate);
        if (viewMode === 'day') next.setDate(anchorDate.getDate() + direction);
        else if (viewMode === 'week') next.setDate(anchorDate.getDate() + direction * 7);
        else next.setMonth(anchorDate.getMonth() + direction);
        setAnchorDate(next);
    };

    const goToToday = () => setAnchorDate(new Date());

    // -- Two-level selection --
    // selectedDateKey: ISO date string of the selected date row, e.g. "2026-04-02"
    // selectedItemId:  id of the selected leaf item row
    // Selecting a date clears the item selection; selecting an item clears the date selection.
    const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

    const handleSelectDate = (dateKey: string | null) => {
        setSelectedDateKey(dateKey);
        setSelectedItemId(null);
    };

    const handleSelectItem = (itemId: number | null) => {
        setSelectedItemId(itemId);
        setSelectedDateKey(null);
    };

    // Derive what to show in the nutrition panel:
    // - If an item is selected, show that item's nutrition
    // - If a date is selected, show the summed nutrition for that date
    // - Otherwise show nothing
    const selectedItem = dailyLogItems.find(i => i.id === selectedItemId) ?? null;

    const selectedDateNutrition: INutrition | null = useMemo(() => {
        if (!selectedDateKey) return null;
        const dateItems = dailyLogItems.filter(i => i.date === selectedDateKey && i.nutrition);
        if (dateItems.length === 0) return null;
        return dateItems.reduce((acc, i) => {
            const n = i.nutrition!;
            return {
                serving_size_description: '',
                serving_size_oz:  acc.serving_size_oz  + (n.serving_size_oz  ?? 0),
                serving_size_g:   acc.serving_size_g   + (n.serving_size_g   ?? 0),
                calories:         acc.calories         + (n.calories         ?? 0),
                total_fat_g:      acc.total_fat_g      + (n.total_fat_g      ?? 0),
                saturated_fat_g:  acc.saturated_fat_g  + (n.saturated_fat_g  ?? 0),
                trans_fat_g:      acc.trans_fat_g      + (n.trans_fat_g      ?? 0),
                cholesterol_mg:   acc.cholesterol_mg   + (n.cholesterol_mg   ?? 0),
                sodium_mg:        acc.sodium_mg        + (n.sodium_mg        ?? 0),
                total_carbs_g:    acc.total_carbs_g    + (n.total_carbs_g    ?? 0),
                fiber_g:          acc.fiber_g          + (n.fiber_g          ?? 0),
                total_sugar_g:    acc.total_sugar_g    + (n.total_sugar_g    ?? 0),
                added_sugar_g:    acc.added_sugar_g    + (n.added_sugar_g    ?? 0),
                protein_g:        acc.protein_g        + (n.protein_g        ?? 0),
                vitamin_d_mcg:    acc.vitamin_d_mcg    + (n.vitamin_d_mcg    ?? 0),
                calcium_mg:       acc.calcium_mg       + (n.calcium_mg       ?? 0),
                iron_mg:          acc.iron_mg          + (n.iron_mg          ?? 0),
                potassium_mg:     acc.potassium_mg     + (n.potassium_mg     ?? 0),
            };
        }, {
            serving_size_description: '',
            serving_size_oz: 0, serving_size_g: 0, calories: 0,
            total_fat_g: 0, saturated_fat_g: 0, trans_fat_g: 0,
            cholesterol_mg: 0, sodium_mg: 0, total_carbs_g: 0,
            fiber_g: 0, total_sugar_g: 0, added_sugar_g: 0,
            protein_g: 0, vitamin_d_mcg: 0, calcium_mg: 0,
            iron_mg: 0, potassium_mg: 0,
        } as INutrition);
    }, [selectedDateKey, dailyLogItems]);

    const panelNutrition = selectedItem?.nutrition ?? selectedDateNutrition;
    const panelLabel = selectedItem
        ? recipes.find(r => r.id === selectedItem.recipe_id)?.name ?? 'Selected Entry'
        : selectedDateKey
            ? `Total for ${selectedDateKey}`
            : null;

    // -- Add form --
    const [showAddForm, setShowAddForm] = useState(false);
    const [addForm, setAddForm] = useState<IDailyLogItem>(() => ({
        ...new DailyLogItem(),
        date: toISODate(anchorDate),
    }));

    const handleAdd = async () => {
        const newItem = await addDailyLogItem(addForm);
        if (!newItem) return;

        setAnchorDate(new Date(`${newItem.date}T00:00:00`));
        setSelectedDateKey(newItem.date);
        setSelectedItemId(newItem.id ?? null);
        setShowAddForm(false);
        setAddForm({ ...new DailyLogItem(), date: toISODate(anchorDate) });
    };

    const toggleAddForm = () => {
        setAddForm(prev => ({
            ...prev,
            date: selectedDateKey ?? toISODate(anchorDate),
        }));
        setShowAddForm(true);
        setShowEditForm(false);
    };

    // -- Edit form -- (item selection only)
    const [showEditForm, setShowEditForm] = useState(false);
    const [editForm, setEditForm] = useState<IDailyLogItem | null>(null);

    const handleEditOpen = () => {
        if (!selectedItem) return;
        setEditForm({ ...selectedItem });
        setShowEditForm(true);
    };

    const handleEditSave = async () => {
        if (!editForm) return;
        await updateDailyLogItem(editForm);
        setShowEditForm(false);
        setEditForm(null);
        setSelectedItemId(null);
    };

    const handleDelete = async () => {
        if (!selectedItemId) return;
        const confirmed = confirm('Delete this entry? This cannot be undone.');
        if (confirmed) {
            await deleteDailyLogItem(selectedItemId);
            setSelectedItemId(null);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #e3f2fd 0%, #fce4ec 100%)',
                py: { xs: 3, sm: 5 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            <TitleCard title="Daily Log" subtitle="Track your daily nutritional intake" />

            <Paper
                elevation={4}
                sx={{
                    background: '#fff',
                    borderRadius: 2.25,
                    boxShadow: '0 4px 24px 0 rgba(25, 118, 210, 0.10)',
                    px: { xs: 2, sm: 5 },
                    py: { xs: 2, sm: 3 },
                    width: { xs: '98%', md: '90%' },
                    maxWidth: 1600,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* ── Toolbar ── */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <Stack direction="row" spacing={0}>
                        {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
                            <Button
                                key={mode}
                                variant={viewMode === mode ? 'contained' : 'outlined'}
                                size="small"
                                onClick={() => setViewMode(mode)}
                                sx={{
                                    textTransform: 'capitalize',
                                    borderRadius: 0,
                                    '&:first-of-type': { borderRadius: '4px 0 0 4px' },
                                    '&:last-of-type':  { borderRadius: '0 4px 4px 0' },
                                }}
                            >
                                {mode}
                            </Button>
                        ))}
                    </Stack>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => navigatePeriod(-1)}><MdChevronLeft size={22} /></IconButton>
                        <Typography variant="body1" sx={{ minWidth: 200, textAlign: 'center', fontWeight: 500 }}>
                            {formatDateRange(rangeStart, rangeEnd, viewMode)}
                        </Typography>
                        <IconButton size="small" onClick={() => navigatePeriod(1)}><MdChevronRight size={22} /></IconButton>
                    </Box>
                    <Button size="small" variant="outlined" onClick={goToToday} sx={{ textTransform: 'none' }}>
                        Today
                    </Button>
                </Box>

                {/* ── Main content: table + nutrition panel ── */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, boxShadow: '0 2px 12px 0 rgba(0,0,0,0.07)' }}>
                            <DailyLogTable
                                viewMode={viewMode}
                                rangeStart={rangeStart}
                                rangeEnd={rangeEnd}
                                selectedDateKey={selectedDateKey}
                                setSelectedDateKey={handleSelectDate}
                                selectedItemId={selectedItemId}
                                setSelectedItemId={handleSelectItem}
                            />
                        </Box>
                        {/* ── CRUD buttons ── */}
                        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<MdAddCircleOutline />}
                                onClick={toggleAddForm}
                                disabled={showAddForm}
                            >
                                Add
                            </Button>
                            <Button
                                variant="contained"
                                color="warning"
                                startIcon={<MdEdit />}
                                disabled={!selectedItemId}
                                onClick={handleEditOpen}
                            >
                                Edit
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                startIcon={<MdRemoveCircleOutline />}
                                disabled={!selectedItemId}
                                onClick={handleDelete}
                            >
                                Delete
                            </Button>
                        </Stack>

                        {/* ── Add form ── */}
                        {showAddForm && (
                            <Paper variant="outlined" sx={{ mt: 2, pt: 1, px: 2, pb: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>Add Entry</Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
                                    <TextField
                                        label="Date"
                                        type="date"
                                        size="small"
                                        value={addForm.date}
                                        onChange={e => setAddForm(prev => ({ ...prev, date: e.target.value }))}
                                        InputLabelProps={{ shrink: true }}
                                        sx={{ minWidth: 150 }}
                                    />
                                    <TextField
                                        select
                                        label="Recipe"
                                        size="small"
                                        value={addForm.recipe_id || ''}
                                        onChange={e => setAddForm(prev => ({ ...prev, recipe_id: Number(e.target.value) }))}
                                        sx={{ minWidth: 220 }}
                                    >
                                        {recipes.map(r => (
                                            <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                                        ))}
                                    </TextField>
                                    <TextField
                                        label="Servings"
                                        type="number"
                                        size="small"
                                        value={addForm.servings}
                                        onChange={e => setAddForm(prev => ({ ...prev, servings: Number(e.target.value) }))}
                                        inputProps={{ min: 0.25, step: 0.25 }}
                                        sx={{ width: 100 }}
                                    />
                                    <TextField
                                        label="Notes"
                                        size="small"
                                        value={addForm.notes ?? ''}
                                        onChange={e => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
                                        sx={{ flex: 1, minWidth: 160 }}
                                    />
                                    <Button variant="contained" color="primary" onClick={handleAdd} disabled={!addForm.recipe_id || !addForm.servings}>
                                        Save
                                    </Button>
                                    <Button variant="outlined" onClick={() => setShowAddForm(false)}>
                                        Cancel
                                    </Button>
                                </Stack>
                            </Paper>
                        )}

                        {/* ── Edit form ── */}
                        {showEditForm && editForm && (
                            <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>Edit Entry</Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
                                    <TextField
                                        label="Servings"
                                        type="number"
                                        size="small"
                                        value={editForm.servings}
                                        onChange={e => setEditForm(prev => prev ? ({ ...prev, servings: Number(e.target.value) }) : prev)}
                                        inputProps={{ min: 0.25, step: 0.25 }}
                                        sx={{ width: 100 }}
                                    />
                                    <TextField
                                        label="Notes"
                                        size="small"
                                        value={editForm.notes ?? ''}
                                        onChange={e => setEditForm(prev => prev ? ({ ...prev, notes: e.target.value }) : prev)}
                                        sx={{ flex: 1, minWidth: 160 }}
                                    />
                                    <Button variant="contained" color="primary" onClick={handleEditSave}>
                                        Save
                                    </Button>
                                    <Button variant="outlined" onClick={() => setShowEditForm(false)}>
                                        Cancel
                                    </Button>
                                </Stack>
                            </Paper>
                        )}
                    </Box>
                    <Box
                        sx={{
                            width: 310,
                            flexShrink: 0,
                            alignSelf: 'flex-start',
                            position: 'sticky',
                            top: 16,
                        }}
                    >
                        {panelLabel && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 1, fontWeight: 500 }}>
                                {panelLabel}
                            </Typography>
                        )}
                        <NutritionLabel nutrition={panelNutrition} />
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
}

export default DailyLogPage;