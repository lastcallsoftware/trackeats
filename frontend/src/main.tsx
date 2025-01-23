import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {BrowserRouter } from 'react-router-dom'
import Nav from './components/Nav'
import { DataProvider } from "./components/DataProvider"
import './index.css'
//import 'bootstrap/dist/css/bootstrap.min.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <DataProvider>
        <Nav/>
      </DataProvider>
    </BrowserRouter>
  </StrictMode>,
)
