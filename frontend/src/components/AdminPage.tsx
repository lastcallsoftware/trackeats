import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
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
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MuiPagination from '@mui/material/Pagination';
import { MdDeleteForever, MdRefresh } from 'react-icons/md';
import DataPageLayout from './DataPageLayout';

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
};

type FdcSearchResponse = {
    totalHits: number;
    currentPage: number;
    totalPages: number;
    foods: FdcSearchFood[];
};

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

const PROTECTED = new Set(['admin', 'guest', 'testuser']);

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
    const [fdcPageNumber, setFdcPageNumber] = useState(1);
    const [fdcTotalHits, setFdcTotalHits] = useState(0);
    const [fdcTotalPages, setFdcTotalPages] = useState(0);
    const [fdcResults, setFdcResults] = useState<FdcSearchFood[]>([]);
    const [fdcSelectedIds, setFdcSelectedIds] = useState<Set<number>>(new Set());
    const [fdcLoading, setFdcLoading] = useState(false);
    const [fdcImporting, setFdcImporting] = useState(false);
    const [fdcError, setFdcError] = useState<string | null>(null);
    const [fdcImportResult, setFdcImportResult] = useState<FdcImportResponse | null>(null);

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
                },
            });
            setFdcResults(res.data.foods ?? []);
            setFdcTotalHits(res.data.totalHits ?? 0);
            setFdcTotalPages(res.data.totalPages ?? 0);
            setFdcPageNumber(res.data.currentPage ?? pageNumber);
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err)
                ? (err.response?.data?.msg ?? err.message)
                : String(err);
            setFdcError(msg);
        } finally {
            setFdcLoading(false);
        }
    }, [fdcPageSize, fdcQuery]);

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
                                const isProtected = PROTECTED.has(user.username);
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
                                            <Tooltip title={isProtected ? 'This account cannot be deleted' : `Delete ${user.username}`}>
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        disabled={isProtected}
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

                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, mb: 2 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow sx={{ '& th': { backgroundColor: 'grey.50' } }}>
                                <TableCell sx={{ fontWeight: 700, width: 90 }}>Select</TableCell>
                                <TableCell sx={{ fontWeight: 700, width: 140 }}>FDC ID</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                                <TableCell sx={{ fontWeight: 700, width: 140 }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Brand</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {fdcResults.map((food) => (
                                <TableRow key={food.fdcId} hover>
                                    <TableCell>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    size="small"
                                                    checked={fdcSelectedIds.has(food.fdcId)}
                                                    onChange={() => toggleFdcSelected(food.fdcId)}
                                                />
                                            }
                                            label=""
                                        />
                                    </TableCell>
                                    <TableCell>{food.fdcId}</TableCell>
                                    <TableCell>{food.description || '—'}</TableCell>
                                    <TableCell>{food.dataType || '—'}</TableCell>
                                    <TableCell>{food.brandOwner || '—'}</TableCell>
                                </TableRow>
                            ))}
                            {!fdcLoading && fdcResults.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                        No USDA results yet. Run a search to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

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
