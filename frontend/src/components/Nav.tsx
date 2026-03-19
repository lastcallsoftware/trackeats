import { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Header from './Header';
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

// An unused function actually causes the build to FAIL!  Bizarre.
// So -- for now! -- comment this out.
//function getToken() {
//    const tokenString = sessionStorage.getItem("access_token");
//    if (tokenString == null || tokenString == undefined) {
//        return null;
//    }
//    return JSON.parse(tokenString);
//}

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

function Nav() {
    const [isAuthenticated, setAuthenticated] = useState(sessionStorage.getItem("access_token") != null);

    const storeToken = (token: string): undefined => {
        sessionStorage.setItem("access_token", JSON.stringify(token))
        setAuthenticated(true)
    }

    const removeToken = () => {
        sessionStorage.removeItem("access_token")
        setAuthenticated(false)
    }

    const handleAboutMeClick = () => {
        window.location.href = portfolioUrl;
        return null;
    }

    return (
        <>
            <Header />
            <nav id="navbar" className="navbar">
                <Link to="/" className="nav-item">Home</Link>
                {/*<Link to="/" className="nav-item">Home</Link>*/}
                { isAuthenticated ? <Link to="/foods" className="nav-item">Foods</Link> : ""}
                { isAuthenticated ? <Link to="/recipes" className="nav-item">Recipes</Link> : ""}
                {/*}
                { isAuthenticated ? <Link to="/dailylog" className="nav-item">Daily Log</Link> : ""}
                 */}
                <Link to="/about" className="nav-item">About TrackEats</Link>
                <Link to="/aboutme2" className="nav-item" onClick={handleAboutMeClick}>About Me</Link>
                { isAuthenticated ? <Link to="/login" className="nav-item" onClick={removeToken}>Log Out</Link>
                               : <Link to="/login" className="nav-item">Log In</Link>}
                { !isAuthenticated ? <Link to="/register" className="nav-item">Register</Link>
                                : ""}
            </nav>

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
            <Footer />
        </>
    );
}

export default Nav;
