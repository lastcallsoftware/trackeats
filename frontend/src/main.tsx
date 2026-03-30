import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { DataProvider } from "./contexts/DataProvider"
import { SnackbarProvider } from './contexts/SnackbarProvider'
import App from './components/App'
import theme from './theme'
import './index.css'

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<BrowserRouter>
				<SnackbarProvider>
					<DataProvider>
						<App />
					</DataProvider>
				</SnackbarProvider>
			</BrowserRouter>
		</ThemeProvider>
	</StrictMode>,
)
