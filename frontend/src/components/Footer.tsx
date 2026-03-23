import logo from '../assets/lcs-1280x501.png';
import Box from '@mui/material/Box';

function Footer() {
    return (
        <section className="footerContainer">
            <Box
                component="img"
                className="lcsLogo"
                src={logo}
                alt="LCS Logo"
                sx={{ height: '60px', width: 'auto' }}
            />
            <p>Copyright: © 2024 Last Call Software.  All rights reserved.</p>
        </section>
    );
}

export default Footer;
