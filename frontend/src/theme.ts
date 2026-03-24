// Augment the Palette type to include 'table'

type TablePalette = {
    headerBg: string;
    headerColor: string;
    headerBorder: string;
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
            headerBg: '#66C2E0',
            headerColor: '#000',
            headerBorder: 'black',
            rowSelectedBg: 'lightblue',
            rowBorder: 'black',
        },
        tableAlt: {
            headerBg: '#42A5F5',
            headerColor: '#FFF',
            headerBorder: '#1976D2',
            rowSelectedBg: '#E3F2FD',
            rowBorder: '#EEE',
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
