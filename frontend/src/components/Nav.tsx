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

// Set the URL of the backend web service.
//
// I've tried a million things to define this as an environment variable, but 
// NOTHING works.  I've defined it in the docker-compose.yml, I've defined it in
// the Dockerfile, I've exported it from the command line in both the build and 
// runtime environments, I put it in a .env file, and I tried using a library 
// (dotenv) whose *entire purpose* is to define environment variables.  Nada.
//
// The problem is that a React app is pre-compiled and bundled into one file and
// served up to the browser when the user access the web address, so there isn't
// much opportunity to get environment variables at runtime -- though I still 
// don't really understsand why an .env file wouldn't work if it was part of the
// build's public files.
//
// Whatever.  We can at least differentiate between production and non-production 
// builds using the NODE_ENV environment variable (which is set according to how 
// the app is executed), and choose a value that way.  That still won't work 
// when we run the app in a Docker container locally because that's considered
// a production build, so in that case we'll have to 

console.log("process.env.NODE_ENV:", process.env.NODE_ENV)
console.log("import.meta.env.PROD:", import.meta.env.PROD)
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
