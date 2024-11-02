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
import ConfirmUser from './ConfirmUser';

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
    const [user, setUser] = useState({username: "", isAuthenticated: false});

    const storeToken = (username: string, token: string|null): undefined => {
        sessionStorage.setItem("access_token", JSON.stringify(token))
        setUser({username: username, isAuthenticated: true})
    }
    
    const removeToken = () => {
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
                <Route path="/register" element={<Register/>} />
                <Route path="/confirm" element={<ConfirmUser/>} />
            </Routes>
            <Footer />
        </>
    );
}

export default Nav;
