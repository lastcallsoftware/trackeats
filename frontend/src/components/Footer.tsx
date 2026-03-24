import logo from '../assets/lcs-logo-brown-text-outline.svg';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';

const FooterRoot = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(2),
    padding: theme.spacing(2, 1),
}));

const FooterLogo = styled('img')({
    height: 60,
    width: 'auto',
});

function Footer() {
    return (
        <FooterRoot>
            <Box sx={{ backgroundColor: theme => theme.palette.tableAlt.headerBorder, borderRadius: 2, p: '6px 10px', display: 'inline-flex' }}>
                <FooterLogo src={logo} alt="LCS Logo" />
            </Box>
            <Typography variant="body2">Copyright: © 2024 Last Call Software.  All rights reserved.</Typography>
        </FooterRoot>
    );
}

export default Footer;
