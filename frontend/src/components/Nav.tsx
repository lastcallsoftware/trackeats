import { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Header from './Header';
import Homepage from './Home';
import AboutPage from './AboutPage';
import IngredientsPage from './IngredientsPage';
import MealsPage from './MealsPage';
import DailyLogPage from './DailyLogPage';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import Footer from './Footer';
import axios from "axios";
import ConfirmUser from './ConfirmUser';
import IngredientForm from './IngredientForm';

// An unused function actually causes the build to FAIL!  Bizarre.
// So -- for now! -- comment this out.
//function getToken() {
//    const tokenString = sessionStorage.getItem("access_token");
//    if (tokenString == null || tokenString == undefined) {
//        return null;
//    }
//    return JSON.parse(tokenString);
//}

// The only way I have found to pass config values to a Vite/React app is to use
// .env files.  For a lengthy discussion about config management for this
//  project, see the main project's README file.
console.log("process.env.NODE_ENV:", process.env.NODE_ENV)
console.log("import.meta.env.MODE:", import.meta.env.MODE)
console.log("import.meta.env.VITE_BACKEND_BASE_URL:", import.meta.env.VITE_BACKEND_BASE_URL)
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_BASE_URL
axios.defaults.timeout = 4000

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

    return (
        <>
            <Header />
            <nav id="navbar" className="navbar">
                               {/*<Link to="/" className="nav-item">Home</Link>*/}
                { isAuthenticated ? <Link to="/ingredients" className="nav-item">Ingredients</Link> : ""}
                { isAuthenticated ? <Link to="/meals" className="nav-item">Meals</Link> : ""}
                { isAuthenticated ? <Link to="/dailylog" className="nav-item">Daily Log</Link> : ""}
                { isAuthenticated ? <Link to="/login" className="nav-item" onClick={removeToken}>Log Out</Link>
                               : <Link to="/login" className="nav-item">Log In</Link>}
                                 <Link to="/register" className="nav-item">Register</Link>
                                 <Link to="/about" className="nav-item">About</Link>
            </nav>

            <Routes>
                <Route path="/" element={<Homepage />} />
                <Route path="/ingredients" element={<IngredientsPage />} />
                <Route path="/meals" element={<MealsPage />} />
                <Route path="/dailylog" element={<DailyLogPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/login" element={<LoginPage storeTokenFunction={storeToken}/>} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/confirm" element={<ConfirmUser/>} />
                <Route path="/ingredientForm" element={<IngredientForm />} />
            </Routes>
            <Footer />
        </>
    );
}

export default Nav;
