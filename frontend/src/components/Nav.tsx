import { Routes, Route, Link } from 'react-router-dom';
import logo from '../assets/react.svg';
import Homepage from './HomePage';
import About from './About';
import Foods from './Foods';
import Dishes from './Dishes';
import DailyLog from './DailyLog';
import LoginPage from './LoginPage';

function Nav() {
    return (
        <>
            <nav id="navbar" className="navbar">
                <img src={logo} alt="TrackEats logo" />
                <Link to="/" className="nav-item">Home</Link>
                <Link to="/foods" className="nav-item">Foods</Link>
                <Link to="/dishes" className="nav-item">Dishes</Link>
                <Link to="/dailylog" className="nav-item">Daily Log</Link>
                <Link to="/about" className="nav-item">About</Link>
                <Link to="/login" className="nav-item">Login</Link>
            </nav>
            <Routes>
                <Route path="/" element={<Homepage />} />
                <Route path="/foods" element={<Foods />} />
                <Route path="/dishes" element={<Dishes />} />
                <Route path="/dailylog" element={<DailyLog />} />
                <Route path="/about" element={<About />} />
                <Route path="/login" element={<LoginPage />} />
            </Routes>
        </>
    );
}

export default Nav;
