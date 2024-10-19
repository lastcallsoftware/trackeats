import { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Header from './Header';
import Homepage from './Home';
import About from './About';
import Ingredients from './Ingredients';
import Meals from './Meals';
import DailyLog from './DailyLog';
import Login from './Login';
import Register from './Register';
import Footer from './Footer';
import axios from "axios";

// An unused function actually causes the build to FAIL!
// So -- for now! -- comment this out.
//function getToken() {
//    const tokenString = sessionStorage.getItem("access_token");
//    if (tokenString == null || tokenString == undefined) {
//        return null;
//    }
//    return JSON.parse(tokenString);
//}

// I FINALLY figured out how to pass config values to the front end app.
// We use .env files, and in them we define key-value pairs.  A couple rules:
// - We don't have much control over the filenames used.  The only available
//   names are .env (loaded in all cases), .env.<mode>, where <mode> is the
//   execution mode (typically, development or production).  Vite's default
//   mode is "production" but can be overriden 
//   .env.production.
// The values MUST start with the prefix "VITE_".
// For consistency I also made .env files for the backend and database, but
// unlike those modules, the config values for the frontend are read at build
// time ONLY.  That's because the front-end build gloms up all its files into 
// one package for delivery to the browser.  There ARE no .env files to read 
// at runtime, and even if there were, the frontend app wouldn't be able to see
// them, because it's executing on the browser, not the server.

console.log("process.env.NODE_ENV:", process.env.NODE_ENV)
//console.log("import.meta.env.PROD:", import.meta.env.PROD)
console.log("import.meta.env.MODE:", import.meta.env.MODE)
console.log("import.meta.env.VITE_BACKEND_BASE_URL:", import.meta.env.VITE_BACKEND_BASE_URL)
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_BASE_URL
axios.defaults.timeout = 4000

function Nav() {
    const [user, setUser] = useState({username: "", isAuthenticated: false});

    function storeToken(username: string, token: string|null): undefined {
        sessionStorage.setItem("access_token", JSON.stringify(token))
        setUser({username: username, isAuthenticated: true})
    }
    
    function removeToken() {
        sessionStorage.removeItem("access_token")
        setUser({username: "", isAuthenticated: false})
    }
    
    function isLoggedIn() {
        return user.isAuthenticated;
    }

    return (
        <>
            <Header />
            <nav id="navbar" className="navbar">
                                 <Link to="/" className="nav-item">Home</Link>
                { isLoggedIn() ? <Link to="/ingredients" className="nav-item">Ingredients</Link> : ""}
                { isLoggedIn() ? <Link to="/meals" className="nav-item">Meals</Link> : ""}
                { isLoggedIn() ? <Link to="/dailylog" className="nav-item">Daily Log</Link> : ""}
                { isLoggedIn() ? <Link to="#" className="nav-item" onClick={removeToken}>Log Out</Link>
                               : <Link to="/login" className="nav-item">Log In</Link>}
                                 <Link to="/register" className="nav-item">Register</Link>
                                 <Link to="/about" className="nav-item">About</Link>
                                 </nav>

            <Routes>
                <Route path="/" element={<Homepage />} />
                <Route path="/ingredients" element={<Ingredients />} />
                <Route path="/meals" element={<Meals />} />
                <Route path="/dailylog" element={<DailyLog />} />
                <Route path="/about" element={<About />} />
                <Route path="/login" element={<Login storeTokenFunction={storeToken}/>} />
                <Route path="/register" element={<Register storeTokenFunction={storeToken}/>} />
            </Routes>
            <Footer />
        </>
    );
}

export default Nav;
