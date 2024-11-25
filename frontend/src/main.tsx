import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {BrowserRouter } from 'react-router-dom'
import Nav from './components/Nav'
import { IngredientProvider } from "./components/IngredientProvider"
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <IngredientProvider>
        <Nav/>
      </IngredientProvider>
    </BrowserRouter>
  </StrictMode>,
)
