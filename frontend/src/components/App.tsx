import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import { useData } from '@/utils/useData';
import { Routes, Route, Link as RouterLink, useNavigate } from 'react-router-dom';
import trackEatsIcon from '../assets/trackeats-logo.svg';
import HomePage from './HomePage';
import AboutPage from './AboutPage';
import React, { Suspense, lazy } from 'react';
const FoodsPage = lazy(() => import('./FoodsPage'));
const RecipesPage = lazy(() => import('./RecipesPage'));
const DailyLogPage = lazy(() => import('./DailyLogPage'));
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import Footer from './Footer';
import axios from "axios";
import ConfirmUserPage from './ConfirmUserPage';
import RequestResetPasswordPage from './RequestResetPasswordPage';
import ResetPasswordPage from './ResetPasswordPage';
import ChangePasswordPage from './ChangePasswordPage';
import FoodForm from './FoodForm';
import RecipeForm from './RecipeForm';
import Header from './Header';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SettingsIcon from '@mui/icons-material/Settings';
import { AUTH_CHANGED_EVENT } from '@/utils/constants';

//console.log("process.env.NODE_ENV:", process.env.NODE_ENV)
console.log("import.meta.env.MODE:", import.meta.env.MODE)
console.log("import.meta.env.DEV:", import.meta.env.DEV)
console.log("import.meta.env.PROD:", import.meta.env.PROD)

const backendBaseUrl: string = import.meta.env.VITE_BACKEND_BASE_URL
if (!backendBaseUrl || !backendBaseUrl.trim()) {
    throw new Error("VITE_BACKEND_BASE_URL not set")
}
console.log("import.meta.env.VITE_BACKEND_BASE_URL:", backendBaseUrl.trim())
axios.defaults.baseURL = backendBaseUrl
axios.defaults.timeout = 4000

const portfolioUrl = import.meta.env.VITE_PORTFOLIO_URL
if (!portfolioUrl || !portfolioUrl.trim()) {
    throw new Error("VITE_PORTFOLIO_URL not set")
}
console.log("import.meta.env.VITE_PORTFOLIO_URL:", portfolioUrl.trim())

const buttonSx = {
    fontSize: '1.1rem',
    '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' }
}

function App() {
    const theme = useTheme();
    const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
    const { deleteAccount, recalculateRecipeNutrition, isLoading, isRecalculatingRecipes, username } = useData();
    const [isAuthenticated, setAuthenticated] = useState(sessionStorage.getItem("access_token") != null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [optionsAnchorEl, setOptionsAnchorEl] = useState<null | HTMLElement>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const syncAuth = () => {
            setAuthenticated(sessionStorage.getItem("access_token") !== null);
        };
        window.addEventListener(AUTH_CHANGED_EVENT, syncAuth);
        return () => window.removeEventListener(AUTH_CHANGED_EVENT, syncAuth);
    }, []);

    const storeToken = (
        token: string,
        username: string,
        authMethod: 'email' | 'google' | 'facebook' | 'apple' = 'email',
    ): undefined => {
        sessionStorage.setItem("access_token", JSON.stringify(token))
        sessionStorage.setItem("username", JSON.stringify(username))
        sessionStorage.setItem("auth_method", authMethod)
        window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
        setAuthenticated(true)
    }

    const removeToken = () => {
        sessionStorage.removeItem("access_token")
        sessionStorage.removeItem("username")
        sessionStorage.removeItem("auth_method")
        window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
        setAuthenticated(false)
        navigate("/")
    }

    const handleAboutOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
    const handleAboutClose = () => setAnchorEl(null);

    const handleOptionsOpen = (e: React.MouseEvent<HTMLElement>) => setOptionsAnchorEl(e.currentTarget);
    const handleOptionsClose = () => setOptionsAnchorEl(null);

    const handleDeleteAccountClick = () => {
        setOptionsAnchorEl(null);
        setConfirmOpen(true);
    };

    const handleDeleteAccountConfirmClose = () => setConfirmOpen(false);

    const handleDeleteAccountConfirmYes = async () => {
        setConfirmOpen(false);
        const deleted = await deleteAccount();
        if (deleted) {
            navigate("/login", { state: { message: "Your account has been deleted." } });
        }
    }

    const handleRecalculateRecipes = async () => {
        handleOptionsClose();
        await recalculateRecipeNutrition(null);
    }

    const authMethod = sessionStorage.getItem("auth_method")
    const authMethodLabel = authMethod === 'google'
        ? 'Google'
        : authMethod === 'facebook'
            ? 'Facebook'
            : authMethod === 'apple'
                ? 'Apple'
                : 'Email';
    const canChangePassword = authMethod !== 'google' && authMethod !== 'facebook' && authMethod !== 'apple'

    const overlayOpen = isLoading || isRecalculatingRecipes
    const overlayMessage = isRecalculatingRecipes ? "Recalculating recipes..." : "Loading data..."

    const handleAboutItem = (path: string) => {
        handleAboutClose();
        if (path.startsWith('http') || path.endsWith('.html')) {
            window.open(path, '_blank');
        } else {
            navigate(path);
        }
    };

    const navMenuItems = (
        <>
            {isAuthenticated && (
                <Button component={RouterLink} to="/foods" color="primary" sx={buttonSx}>
                    Foods
                </Button>
            )}
            {isAuthenticated && (
                <Button component={RouterLink} to="/recipes" color="primary" sx={buttonSx}>
                    Recipes
                </Button>
            )}
            {isAuthenticated && (
                <Button component={RouterLink} to="/dailylog" color="primary" sx={buttonSx}>
                    Daily Log
                </Button>
            )}
            <Button
                color="primary"
                onClick={handleAboutOpen}
                endIcon={<KeyboardArrowDownIcon />}
                sx={buttonSx}
            >
                About
            </Button>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleAboutClose}
            >
                <MenuItem onClick={() => handleAboutItem('/about')}>About TrackEats</MenuItem>
                <MenuItem onClick={() => handleAboutItem(portfolioUrl)}>About Me</MenuItem>
            </Menu>
        </>
    );

    return (
        <>
            <Header />
            <AppBar
                position="static"
                color="transparent"
                elevation={0}
                sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: 2 }}
            >
                <Toolbar sx={{
                    py: 1,
                    maxWidth: 900,
                    width: '100%',
                    mx: 'auto',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    minHeight: 'unset !important',
                }}>
                    {/* --- Responsive menu: ---
                        - Row 1: Logo | nav links (if wide) | spacer | right controls (always)
                        - Row 2: nav links (if narrow)
                    */}
                    {/* Row 1 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        {/* Logo */}
                        <Button
                            component={RouterLink}
                            to="/"
                            color="primary"
                            sx={{ ...buttonSx, fontWeight: 700, mr: 2, gap: 1 }}
                            disableRipple
                        >
                            <Box
                                component="img"
                                src={trackEatsIcon}
                                alt="TrackEats icon"
                                sx={{ width: 48, height: 48, borderRadius: 1 }}
                            />
                            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 700 }}>TrackEats</span>
                        </Button>
                        {/* Nav links (only on wide) */}
                        {!isNarrow && (
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', ml: 1 }}>
                                {navMenuItems}
                            </Box>
                        )}
                        <Box sx={{ flexGrow: 1 }} />
                        {/* Right controls: Log In/Log Out/Options (always) */}
                        {isAuthenticated ? (
                            <>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Button
                                        color="primary"
                                        onClick={handleOptionsOpen}
                                        sx={buttonSx}
                                        aria-label="Options"
                                        endIcon={
                                            <span style={{ display: 'flex', alignItems: 'center', marginTop: '3px' }}>
                                                <SettingsIcon sx={{ fontSize: '36px !important' }} />
                                            </span>
                                        }
                                    />
                                    {username ? (
                                        <Typography
                                            variant="body1"
                                            color="primary"
                                            sx={{
                                                fontWeight: 500,
                                                whiteSpace: 'nowrap',
                                                maxWidth: { xs: 110, sm: 180 },
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {username}
                                        </Typography>
                                    ) : null}
                                </Box>
                                <Menu
                                    anchorEl={optionsAnchorEl}
                                    open={Boolean(optionsAnchorEl)}
                                    onClose={handleOptionsClose}
                                >
                                    <MenuItem disabled>Signed in with: {authMethodLabel}</MenuItem>
                                    <MenuItem onClick={() => { handleOptionsClose(); removeToken(); }}>Log out</MenuItem>
                                    {canChangePassword ? (
                                        <MenuItem onClick={() => { handleOptionsClose(); navigate('/change_password'); }}>Change password</MenuItem>
                                    ) : null}
                                    <MenuItem onClick={handleRecalculateRecipes} disabled={isRecalculatingRecipes}>Recalculate recipes</MenuItem>
                                    <MenuItem onClick={handleDeleteAccountClick}>Delete my account</MenuItem>
                                </Menu>
                                <Dialog
                                    open={confirmOpen}
                                    onClose={handleDeleteAccountConfirmClose}
                                    aria-labelledby="confirm-dialog-title"
                                    aria-describedby="confirm-dialog-description"
                                >
                                    <DialogTitle id="confirm-dialog-title">Are you sure?</DialogTitle>
                                    <DialogContent>
                                        <DialogContentText id="confirm-dialog-description">
                                            This will delete your account and all data associated with it.  This action cannot be undone.
                                        </DialogContentText>
                                    </DialogContent>
                                    <DialogActions>
                                        <Button onClick={handleDeleteAccountConfirmClose} color="primary">No</Button>
                                        <Button onClick={handleDeleteAccountConfirmYes} color="primary" autoFocus>Yes</Button>
                                    </DialogActions>
                                </Dialog>
                            </>
                        ) : (
                            <Button component={RouterLink} to="/login" color="primary" sx={buttonSx}>Log In</Button>
                        )}
                    </Box>
                    {/* Row 2: nav links only on narrow */}
                    {isNarrow && (
                        <Box
                            sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 2,
                                justifyContent: 'flex-start',
                                mt: 1,
                                width: '100%',
                                overflow: 'visible',
                            }}
                        >
                            {navMenuItems}
                        </Box>
                    )}
                </Toolbar>
            </AppBar>

            <Box sx={{ px: { xs: 1, sm: 2 } }}>
                <Suspense fallback={<div>Loading...</div>}>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/home" element={<HomePage />} />
                        <Route path="/foods" element={<FoodsPage />} />
                        <Route path="/recipes" element={<RecipesPage />} />
                        <Route path="/dailylog" element={<DailyLogPage />} />
                        <Route path="/about" element={<AboutPage />} />
                        <Route path="/login" element={<LoginPage storeTokenFunction={storeToken} />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/confirm" element={<ConfirmUserPage />} />
                        <Route path="/reset_password_request" element={<RequestResetPasswordPage />} />
                        <Route path="/reset_password" element={<ResetPasswordPage />} />
                        <Route path="/change_password" element={<ChangePasswordPage />} />
                        <Route path="/food/add" element={<FoodForm />} />
                        <Route path="/food/edit/:id" element={<FoodForm />} />
                        <Route path="/recipe/add" element={<RecipeForm />} />
                        <Route path="/recipe/edit/:id" element={<RecipeForm />} />
                    </Routes>
                </Suspense>
            </Box>
            <Backdrop
                open={overlayOpen}
                sx={(muiTheme) => ({
                    color: '#fff',
                    zIndex: muiTheme.zIndex.modal + 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                })}
            >
                <CircularProgress color="inherit" />
                <Typography variant="body1">{overlayMessage}</Typography>
            </Backdrop>
            <Footer />
        </>
    );
}

export default App;