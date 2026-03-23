import Box from '@mui/material/Box';
import logo from '../assets/trackeats-1280x873.png';

function Header() {
    return (
        <Box
            component="img"
            className="logo"
            src={logo}
            alt="TrackEats logo"
            sx={{ height: 'auto', maxWidth: '100%' }}
        />
    );
}

export default Header;
