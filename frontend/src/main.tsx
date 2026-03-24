import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {BrowserRouter } from 'react-router-dom'
import { CssBaseline, ThemeProvider } from '@mui/material'
import Nav from './components/Nav'
import { DataProvider } from "./components/DataProvider"
import theme from './theme'


//import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <DataProvider>
          <Nav/>
        </DataProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
