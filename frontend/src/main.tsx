import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { DataProvider } from "./contexts/DataProvider"
import { SnackbarProvider } from './contexts/SnackbarProvider'
import App from './components/App'
import theme from './theme'
import './index.css'

// VITE_GOOGLE_CLIENT_ID must be set in your .env file.
// Leave it empty to disable Google sign-in during development.
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<BrowserRouter>
				<SnackbarProvider>
					<DataProvider>
						{googleClientId ? (
							<GoogleOAuthProvider clientId={googleClientId}>
								<App />
							</GoogleOAuthProvider>
						) : (
							<App />
						)}
					</DataProvider>
				</SnackbarProvider>
			</BrowserRouter>
		</ThemeProvider>
	</StrictMode>,
)
