import { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Header from './Header';
import Homepage from './Home';
import About from './About';
import Ingredients from './Ingredients';
import Meals from './Meals';
import DailyLog from './DailyLog';
import Login from './Login';
import Footer from './Footer';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getToken() {
    const tokenString = sessionStorage.getItem("access_token");
    if (tokenString == null || tokenString == undefined) {
        return null;
    }
    return JSON.parse(tokenString);
}

function Nav() {
    const [user, setUser] = useState({username: "", isAuthenticated: false});

    function login(username: string, token: string|null): undefined {
        sessionStorage.setItem("access_token", JSON.stringify(token))
        setUser({username: username, isAuthenticated: true})
    }
    
    function logout() {
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
                                 <Link to="/about" className="nav-item">About</Link>
                { isLoggedIn() ? <Link to="#" className="nav-item" onClick={logout}>Log Out</Link> : 
                                 <Link to="/login" className="nav-item">Log In</Link>}
            </nav>

            <Routes>
                <Route path="/" element={<Homepage />} />
                <Route path="/ingredients" element={<Ingredients />} />
                <Route path="/meals" element={<Meals />} />
                <Route path="/dailylog" element={<DailyLog />} />
                <Route path="/about" element={<About />} />
                <Route path="/login" element={<Login loginFunction={login}/>} />
            </Routes>
            <Footer />
        </>
    );
}

export default Nav;
