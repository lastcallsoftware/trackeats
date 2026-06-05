import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableSortLabel from '@mui/material/TableSortLabel';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import MuiPagination from '@mui/material/Pagination';
import { MdDeleteForever, MdRefresh } from 'react-icons/md';
import DataPageLayout from './DataPageLayout';
import USDAFoodsTable from './USDAFoodsTable';
import { NutritionLabel } from './NutritionLabel';
import { INutrition } from '@/contexts/DataProvider';

// ── Types ────────────────────────────────────────────────────────────────────

type UserRecord = {
    id: number;
    username: string;
    status: string;               // 'pending' | 'confirmed' | 'cancelled' | 'banned'
    created_at: string | null;
    confirmation_email_sent_at: string | null;
    oauth_provider: string | null; // 'google' | 'facebook' | 'apple' | null
    seed_requested: boolean;
    seeded_at: string | null;
};

type SortField = 'id' | 'username' | 'status' | 'login_method' | 'created_at';
type SortDir   = 'asc' | 'desc';

type FdcSearchFood = {
    fdcId: number;
    description: string;
    dataType: string;
    brandOwner?: string;
    brandName?: string;
    packageWeight?: string;
    modifiedDate?: string;
};

type FdcSearchResponse = {
    totalHits: number;
    currentPage: number;
    totalPages: number;
    foods: FdcSearchFood[];
};

type FdcDataTypeFilter = 'both' | 'Branded' | 'Foundation';

type FdcImportItem = {
    fdc_id: number;
    food_id: number;
    name: string;
    action: 'created' | 'updated';
};

type FdcImportResponse = {
    imported_count: number;
    created_count: number;
    updated_count: number;
    failures: Array<{ fdc_id: number; error: string }>;
    items: FdcImportItem[];
};

type FdcPreviewResponse = {
    count: number;
    items: Array<{
        fdcId: number;
        dataType?: string;
        description?: string;
        calorieSource?: string;
        nutritionStatus?: string;
        mapped?: {
            nutrition?: INutrition;
        };
    }>;
};

type FdcPreviewItem = FdcPreviewResponse['items'][number];

function calorieSourceLabel(source: string | null): string {
    switch (source) {
        case 'label':
            return 'Calories source: label nutrients';
        case 'direct_energy':
            return 'Calories source: USDA direct energy nutrient';
        case 'atwater_energy':
            return 'Calories source: USDA Atwater energy nutrient';
        case 'estimated_from_macros':
            return 'Calories source: estimated from protein/carbs/fat';
        case 'missing':
            return 'Calories source: unavailable';
        default:
            return 'Calories source: unavailable';
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(raw: string | null): string {
    if (!raw) return '—';
    const d = new Date(raw);
    return isNaN(d.getTime()) ? raw : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function loginMethod(user: UserRecord): string {
    if (user.oauth_provider) {
        return user.oauth_provider.charAt(0).toUpperCase() + user.oauth_provider.slice(1);
    }
    return 'Email';
}

function statusColor(status: string): 'success' | 'warning' | 'error' | 'default' {
    switch (status) {
        case 'confirmed':  return 'success';
        case 'pending':    return 'warning';
        case 'cancelled':  return 'error';
        case 'banned':     return 'error';
        default:           return 'default';
    }
}

// ── Component ─────────────────────────────────────────────────────────────────

function AdminPage() {
    const [users, setUsers]           = useState<UserRecord[]>([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState<string | null>(null);
    const [sortField, setSortField]   = useState<SortField>('username');
    const [sortDir, setSortDir]       = useState<SortDir>('asc');
    const [targetUser, setTargetUser] = useState<UserRecord | null>(null);
    const [deleting, setDeleting]     = useState(false);
    const [flashMsg, setFlashMsg]     = useState<string | null>(null);
    const [fdcQuery, setFdcQuery] = useState('');
    const [fdcPageSize, setFdcPageSize] = useState(25);
    const [fdcDataType, setFdcDataType] = useState<FdcDataTypeFilter>('both');
    const [fdcPageNumber, setFdcPageNumber] = useState(1);
    const [fdcTotalHits, setFdcTotalHits] = useState(0);
    const [fdcTotalPages, setFdcTotalPages] = useState(0);
    const [fdcResults, setFdcResults] = useState<FdcSearchFood[]>([]);
    const [fdcSelectedIds, setFdcSelectedIds] = useState<Set<number>>(new Set());
    const [fdcPreviewRowId, setFdcPreviewRowId] = useState<number | null>(null);
    const [fdcPreviewItems, setFdcPreviewItems] = useState<Record<number, FdcPreviewItem>>({});
    const [fdcPreviewLoading, setFdcPreviewLoading] = useState(false);
    const [fdcLoading, setFdcLoading] = useState(false);
    const [fdcImporting, setFdcImporting] = useState(false);
    const [fdcError, setFdcError] = useState<string | null>(null);
    const [fdcImportResult, setFdcImportResult] = useState<FdcImportResponse | null>(null);
    const fdcPreviewRequestSeq = useRef(0);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get<UserRecord[]>('/api/user');
            setUsers(res.data);
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err)
                ? (err.response?.data?.msg ?? err.message)
                : String(err);
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const fetchFdcPreviews = useCallback(async (foods: FdcSearchFood[]) => {
        const fdcIds = foods.map((food) => food.fdcId);
        if (fdcIds.length === 0) {
            setFdcPreviewItems({});
            setFdcPreviewLoading(false);
            return;
        }

        const requestSeq = ++fdcPreviewRequestSeq.current;
        setFdcPreviewLoading(true);
        setFdcPreviewItems({});

        try {
            const res = await axios.post<FdcPreviewResponse>('/api/import/fdc/preview', {
                fdc_ids: fdcIds,
            });
            if (requestSeq !== fdcPreviewRequestSeq.current) {
                return;
            }

            const nextItems: Record<number, FdcPreviewItem> = {};
            for (const item of res.data.items ?? []) {
                nextItems[item.fdcId] = item;
            }
            setFdcPreviewItems(nextItems);
        } catch {
            if (requestSeq === fdcPreviewRequestSeq.current) {
                setFdcPreviewItems({});
            }
        } finally {
            if (requestSeq === fdcPreviewRequestSeq.current) {
                setFdcPreviewLoading(false);
            }
        }
    }, []);

    const runFdcSearch = useCallback(async (pageNumber: number) => {
        const query = fdcQuery.trim();
        if (!query) {
            setFdcError('Search query is required.');
            return;
        }
        setFdcLoading(true);
        setFdcError(null);
        try {
            const res = await axios.get<FdcSearchResponse>('/api/import/fdc/search', {
                params: {
                    query,
                    pageNumber,
                    pageSize: fdcPageSize,
                    dataType: fdcDataType,
                },
            });
            const foods = res.data.foods ?? [];
            setFdcResults(foods);
            setFdcTotalHits(res.data.totalHits ?? 0);
            setFdcTotalPages(res.data.totalPages ?? 0);
            setFdcPageNumber(res.data.currentPage ?? pageNumber);
            setFdcPreviewRowId(null);
            setFdcPreviewLoading(false);
            void fetchFdcPreviews(foods);
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err)
                ? (err.response?.data?.msg ?? err.message)
                : String(err);
            setFdcError(msg);
            setFdcPreviewLoading(false);
        } finally {
            setFdcLoading(false);
        }
    }, [fdcDataType, fdcPageSize, fdcQuery]);

    const toggleFdcSelected = (fdcId: number) => {
        setFdcSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(fdcId)) {
                next.delete(fdcId);
            } else {
                next.add(fdcId);
            }
            return next;
        });
    };

    const runFdcImport = async () => {
        const selected = Array.from(fdcSelectedIds);
        if (selected.length === 0) {
            setFdcError('Select at least one USDA food to import.');
            return;
        }

        setFdcImporting(true);
        setFdcError(null);
        try {
            const res = await axios.post<FdcImportResponse>('/api/import/fdc/import', {
                fdc_ids: selected,
            });
            setFdcImportResult(res.data);
            if ((res.data.failures?.length ?? 0) === 0) {
                setFdcSelectedIds(new Set());
            }
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err)
                ? (err.response?.data?.msg ?? err.message)
                : String(err);
            setFdcError(msg);
        } finally {
            setFdcImporting(false);
        }
    };

    const selectFdcPreviewRow = useCallback((fdcId: number) => {
        setFdcPreviewRowId(fdcId);
    }, []);

    // ── Sorting ──────────────────────────────────────────────────────────────

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const sorted = [...users].sort((a, b) => {
        let av: string, bv: string;
        switch (sortField) {
            case 'id':           av = String(a.id);          bv = String(b.id);          break;
            case 'username':     av = a.username ?? '';       bv = b.username ?? '';      break;
            case 'status':       av = a.status ?? '';         bv = b.status ?? '';        break;
            case 'login_method': av = loginMethod(a);        bv = loginMethod(b);        break;
            case 'created_at':   av = a.created_at ?? '';    bv = b.created_at ?? '';    break;
            default:             av = '';                     bv = '';
        }
        const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
    });

    // ── Delete flow ───────────────────────────────────────────────────────────

    const handleDeleteClick = (user: UserRecord) => setTargetUser(user);
    const handleDeleteCancel = () => setTargetUser(null);

    const handleDeleteConfirm = async () => {
        if (!targetUser) return;
        setDeleting(true);
        try {
            await axios.delete(`/api/user/${targetUser.username}`);
            setUsers(prev => prev.filter(u => u.id !== targetUser.id));
            setFlashMsg(`Account "${targetUser.username}" has been deleted.`);
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err)
                ? (err.response?.data?.msg ?? err.message)
                : String(err);
            setError(msg);
        } finally {
            setDeleting(false);
            setTargetUser(null);
        }
    };

    // ── Column header helper ──────────────────────────────────────────────────

    const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
        <TableCell sortDirection={sortField === field ? sortDir : false} sx={{ fontWeight: 700 }}>
            <TableSortLabel
                active={sortField === field}
                direction={sortField === field ? sortDir : 'asc'}
                onClick={() => handleSort(field)}
            >
                {label}
            </TableSortLabel>
        </TableCell>
    );

    // ── Render ────────────────────────────────────────────────────────────────

    const controlBarLeft = (
        <Typography variant="body2" color="text.secondary">
            {users.length} {users.length === 1 ? 'user' : 'users'}
        </Typography>
    );

    const controlBarRight = (
        <Tooltip title="Refresh">
            <IconButton onClick={fetchUsers} disabled={loading} size="small">
                <MdRefresh size={22} />
            </IconButton>
        </Tooltip>
    );

    const selectedFdcPreview = fdcPreviewRowId ? fdcPreviewItems[fdcPreviewRowId] ?? null : null;
    const selectedFdcNutrition = selectedFdcPreview?.mapped?.nutrition ?? null;
    const selectedFdcCalorieSource = selectedFdcPreview?.calorieSource ?? null;
    const selectedFdcNutritionStatus = selectedFdcPreview?.nutritionStatus ?? null;
    const selectedFdcPreviewPending = Boolean(fdcPreviewRowId) && fdcPreviewLoading && !selectedFdcPreview;
    const selectedFdcPreviewUnavailable = Boolean(fdcPreviewRowId)
        && !selectedFdcPreviewPending
        && !selectedFdcPreview;
    const selectedFdcPreviewMissingCore = Boolean(fdcPreviewRowId)
        && !selectedFdcPreviewPending
        && selectedFdcNutritionStatus === 'missing_core';

    const mainContent = (
        <>
            {flashMsg && (
                <Alert severity="success" onClose={() => setFlashMsg(null)} sx={{ mb: 2 }}>
                    {flashMsg}
                </Alert>
            )}
            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow sx={{ '& th': { backgroundColor: 'grey.50' } }}>
                                <SortHeader field="id"           label="ID" />
                                <SortHeader field="username"     label="Username" />
                                <SortHeader field="status"       label="Status" />
                                <SortHeader field="login_method" label="Login Method" />
                                <SortHeader field="created_at"   label="Created" />
                                <TableCell sx={{ fontWeight: 700 }}>Confirmed</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Seeded</TableCell>
                                <TableCell sx={{ fontWeight: 700, width: 60 }} align="center">Delete</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sorted.map(user => {
                                return (
                                    <TableRow
                                        key={user.id}
                                        hover
                                        sx={{ '&:last-child td': { border: 0 } }}
                                    >
                                        <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{user.id}</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>{user.username}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={user.status}
                                                color={statusColor(user.status)}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>{loginMethod(user)}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(user.created_at)}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(user.confirmation_email_sent_at)}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{user.seeded_at ? formatDate(user.seeded_at) : '—'}</TableCell>
                                        <TableCell align="center">
                                            <Tooltip title={`Delete ${user.username}`}>
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDeleteClick(user)}
                                                        aria-label={`Delete ${user.username}`}
                                                    >
                                                        <MdDeleteForever size={20} />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {sorted.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                        No users found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Confirm delete dialog */}
            <Dialog
                open={Boolean(targetUser)}
                onClose={handleDeleteCancel}
                aria-labelledby="admin-delete-dialog-title"
            >
                <DialogTitle id="admin-delete-dialog-title">Delete user account?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This will permanently delete the account <strong>{targetUser?.username}</strong> and
                        all data associated with it (foods, recipes, daily log entries). This cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteCancel} color="primary" disabled={deleting}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error" disabled={deleting} autoFocus>
                        {deleting ? 'Deleting…' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Divider sx={{ my: 3 }} />

            <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>USDA Food Import</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Search USDA FoodData Central (Branded + Foundation), select foods, and import them into the shared TrackEats catalog.
                </Typography>

                {fdcError && (
                    <Alert severity="error" onClose={() => setFdcError(null)} sx={{ mb: 2 }}>
                        {fdcError}
                    </Alert>
                )}

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
                    <TextField
                        label="Search query"
                        value={fdcQuery}
                        onChange={(e) => {
                            setFdcQuery(e.target.value)
                            setFdcPageNumber(1)
                        }}
                        size="small"
                        fullWidth
                    />
                    <TextField
                        label="Page size"
                        type="number"
                        value={fdcPageSize}
                        onChange={(e) => {
                            setFdcPageSize(Math.max(1, Math.min(200, Number(e.target.value) || 25)))
                            setFdcPageNumber(1)
                        }}
                        size="small"
                        sx={{ width: { xs: '100%', md: 140 } }}
                    />
                    <TextField
                        label="Data type"
                        select
                        value={fdcDataType}
                        onChange={(e) => {
                            setFdcDataType(e.target.value as FdcDataTypeFilter)
                            setFdcPageNumber(1)
                        }}
                        size="small"
                        sx={{ width: { xs: '100%', md: 180 } }}
                    >
                        <MenuItem value="both">Branded + Foundation</MenuItem>
                        <MenuItem value="Branded">Branded only</MenuItem>
                        <MenuItem value="Foundation">Foundation only</MenuItem>
                    </TextField>
                    <Button
                        variant="contained"
                        onClick={() => runFdcSearch(1)}
                        disabled={fdcLoading || fdcImporting}
                    >
                        {fdcLoading ? 'Searching...' : 'Search'}
                    </Button>
                </Stack>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 1 }} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                        {fdcTotalHits} hits
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    {fdcTotalHits > 0 && (
                        <MuiPagination
                            count={Math.max(1, fdcTotalPages)}
                            page={Math.max(1, fdcPageNumber)}
                            onChange={(_, p) => { void runFdcSearch(p) }}
                            size="small"
                            disabled={fdcLoading || fdcImporting}
                        />
                    )}
                </Stack>

                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', lg: 'row' },
                        alignItems: 'flex-start',
                        gap: 2,
                    }}
                >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <USDAFoodsTable
                            foods={fdcResults}
                            selectedIds={fdcSelectedIds}
                            onToggleSelected={toggleFdcSelected}
                            selectedRowId={fdcPreviewRowId}
                            onSelectRow={selectFdcPreviewRow}
                            loading={fdcLoading}
                        />
                    </Box>
                    <Box
                        sx={{
                            width: { xs: '100%', lg: 'auto' },
                            display: 'flex',
                            justifyContent: { xs: 'center', lg: 'flex-start' },
                            flexShrink: 0,
                        }}
                    >
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'center', lg: 'flex-start' }, gap: 0.75 }}>
                            {selectedFdcPreviewPending ? (
                                <Box
                                    sx={{
                                        width: 280,
                                        minHeight: 360,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '2px solid',
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                        bgcolor: 'background.paper',
                                    }}
                                >
                                    <Stack spacing={1} alignItems="center">
                                        <CircularProgress size={28} />
                                        <Typography variant="body2" color="text.secondary">
                                            Loading nutrition preview...
                                        </Typography>
                                    </Stack>
                                </Box>
                            ) : selectedFdcPreviewUnavailable ? (
                                <Box
                                    sx={{
                                        width: 280,
                                        minHeight: 360,
                                        p: 2,
                                        border: '2px solid',
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                        bgcolor: 'background.paper',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        Nutrition Preview Unavailable
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        USDA did not return preview data for this record. Try searching again.
                                    </Typography>
                                </Box>
                            ) : selectedFdcPreviewMissingCore ? (
                                <Box
                                    sx={{
                                        width: 280,
                                        minHeight: 360,
                                        p: 2,
                                        border: '2px solid',
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                        bgcolor: 'background.paper',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        Nutrition Data N/A
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        USDA did not provide the core nutrition fields for this record.
                                    </Typography>
                                </Box>
                            ) : (
                                <NutritionLabel nutrition={selectedFdcNutrition} />
                            )}
                            <Typography variant="caption" color="text.secondary" sx={{ px: { xs: 1, lg: 0 } }}>
                                {selectedFdcPreviewPending
                                    ? 'Loading calorie source...'
                                    : (selectedFdcPreviewUnavailable
                                        ? 'Calories source: unavailable (record missing from USDA preview response)'
                                        : (selectedFdcPreviewMissingCore
                                            ? 'Calories source: N/A (missing in USDA record)'
                                            : calorieSourceLabel(selectedFdcCalorieSource)))}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', md: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        {fdcSelectedIds.size} selected
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={runFdcImport}
                        disabled={fdcImporting || fdcSelectedIds.size === 0}
                    >
                        {fdcImporting ? 'Importing...' : 'Import Selected'}
                    </Button>
                </Stack>

                {fdcImportResult && (
                    <Alert severity={fdcImportResult.failures.length > 0 ? 'warning' : 'success'} sx={{ mt: 2 }}>
                        Imported {fdcImportResult.imported_count}. Created: {fdcImportResult.created_count}. Updated: {fdcImportResult.updated_count}.
                        {fdcImportResult.failures.length > 0 && ` Failures: ${fdcImportResult.failures.length}.`}
                    </Alert>
                )}
            </Box>
        </>
    );

    return (
        <DataPageLayout
            title="Admin"
            subtitle="Manage user accounts and USDA imports"
            controlBarLeft={controlBarLeft}
            controlBarRight={controlBarRight}
            main={mainContent}
        />
    );
}

export default AdminPage;
