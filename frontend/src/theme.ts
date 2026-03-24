import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#00897b',
        },
        background: {
            default: '#f5f7fb',
            paper: '#ffffff',
        },
    },
    shape: {
        borderRadius: 10,
    },
    typography: {
        fontFamily: 'Karla Variable, Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
    },
    components: {
        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    border: '1px solid rgba(25, 118, 210, 0.08)',
                },
            },
        },
    },
});

export default theme;
