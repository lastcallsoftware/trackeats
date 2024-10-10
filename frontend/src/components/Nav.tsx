import { Routes, Route, Link } from 'react-router-dom';
import Header from './Header';
import Homepage from './Home';
import About from './About';
import Foods from './Ingredients';
import Dishes from './Meals';
import DailyLog from './DailyLog';
import Login from './Login';
import Footer from './Footer';

function getToken() {
    const tokenString = sessionStorage.getItem("token");
    if (tokenString == null || tokenString == undefined) {
        return null;
    }
    return JSON.parse(tokenString);
}

function setToken(token: string) {
    sessionStorage.setItem("token", JSON.stringify(token))
}

function isLoggedIn() {
    const creds = getToken();
    return (creds != null)
}

function Nav() {
    return (
        <>
            <Header />
            <nav id="navbar" className="navbar">
                <Link to="/" className="nav-item">Home</Link>
                { isLoggedIn() ? <Link to="/ingredients" className="nav-item">Ingredients</Link>: ""}
                { isLoggedIn() ? <Link to="/meals" className="nav-item">Meals</Link>: ""}
                { isLoggedIn() ? <Link to="/dailylog" className="nav-item">Daily Log</Link>: ""}
                <Link to="/about" className="nav-item">About</Link>
                { isLoggedIn() ? <Link to="/logout" className="nav-item">Log Out</Link> : 
                                 <Link to="/login" className="nav-item">Log In</Link>}
            </nav>

            <Routes>
                <Route path="/" element={<Homepage />} />
                <Route path="/ingredients" element={<Foods />} />
                <Route path="/meals" element={<Dishes />} />
                <Route path="/dailylog" element={<DailyLog />} />
                <Route path="/about" element={<About />} />
                <Route path="/login" element={<Login setToken={setToken} login={true}/>} />
                <Route path="/logout" element={<Login setToken={setToken} login={false}/>} />
            </Routes>
            <Footer />
        </>
    );
}

export default Nav;
