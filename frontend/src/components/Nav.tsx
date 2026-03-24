import { useState } from 'react';
import { Routes, Route, Link as RouterLink, useNavigate } from 'react-router-dom';
import trackEatsIcon from '../assets/trackeats-icon-32x32.png';
import HomePage from './HomePage';
import AboutPage from './AboutPage';
import FoodsPage from './FoodsPage';
import RecipesPage from './RecipesPage';
import DailyLogPage from './DailyLogPage';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import Footer from './Footer';
import axios from "axios";
import ConfirmUser from './ConfirmUser';
import FoodForm from './FoodForm';
import RecipeForm from './RecipeForm';
import Header from './Header';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

console.log("process.env.NODE_ENV:", process.env.NODE_ENV)
console.log("import.meta.env.MODE:", import.meta.env.MODE)

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

function Nav() {
    const [isAuthenticated, setAuthenticated] = useState(sessionStorage.getItem("access_token") != null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const navigate = useNavigate();

    const storeToken = (token: string): undefined => {
        sessionStorage.setItem("access_token", JSON.stringify(token))
        setAuthenticated(true)
    }

    const removeToken = () => {
        sessionStorage.removeItem("access_token")
        setAuthenticated(false)
        navigate("/")
    }

    const handleAboutOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
    const handleAboutClose = () => setAnchorEl(null);

    const handleAboutItem = (path: string) => {
        handleAboutClose();
        if (path.startsWith('http') || path.endsWith('.html')) {
            window.open(path, '_blank');
        } else {
            navigate(path);
        }
    };

    return (
        <>
            <Header />
            <AppBar
                position="static"
                color="transparent"
                elevation={0}
                sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: 2 }}
            >
                <Toolbar sx={{ py: 1, maxWidth: 900, width: '100%', mx: 'auto' }}>
                    {/* Logo icon + app name — links home */}
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
                            sx={{ width: 28, height: 28, borderRadius: 1 }}
                        />
                        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 700 }}>TrackEats</span>
                    </Button>

                    {/* Main nav links */}
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

                    {/* About dropdown */}
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

                    {/* Spacer pushes Log In / Log Out to the right */}
                    <Box sx={{ flexGrow: 1 }} />

                    {isAuthenticated
                        ? <Button color="primary" sx={buttonSx} onClick={removeToken}>Log Out</Button>
                        : <Button component={RouterLink} to="/login" color="primary" sx={buttonSx}>Log In</Button>
                    }
                </Toolbar>
            </AppBar>

            <Box sx={{ px: { xs: 1, sm: 2 } }}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/foods" element={<FoodsPage />} />
                    <Route path="/recipes" element={<RecipesPage />} />
                    <Route path="/dailylog" element={<DailyLogPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/login" element={<LoginPage storeTokenFunction={storeToken}/>} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/confirm" element={<ConfirmUser/>} />
                    <Route path="/foodForm" element={<FoodForm />} />
                    <Route path="/recipeForm" element={<RecipeForm />} />
                </Routes>
            </Box>
            <Footer />
        </>
    );
}

export default Nav;