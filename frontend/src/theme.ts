type Shade = { light: string, medium: string, dark: string, darker: string };

type TablePalette = {
    headerBg: string;
    headerColor: string;
    headerBorder: string;
    rowUnselectedBg: Shade;
    rowSelectedBg: string;
    rowBorder: string;
}

declare module '@mui/material/styles' {
    interface Palette {
        table: TablePalette;
        tableAlt: TablePalette;
    }
    interface PaletteOptions {
        table?: Partial<TablePalette>;
        tableAlt?: Partial<TablePalette>;
    }
}
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
        table: {
            headerBg: '#29b6f6',
            headerColor: '#000',
            headerBorder: 'black',
            rowUnselectedBg: {
                light: 'white',
                medium: '#b3e5fc',
                dark: '#81d4fa',
                darker: '#29b6f6',
            },
            rowSelectedBg: '#03a9f4',
            rowBorder: 'black',
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
