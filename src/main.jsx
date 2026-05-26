import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import Tabelle from './Tabelle'
import Admin from './Admin'

createRoot(document.getElementById('root')).render(
  <BrowserRouter basename="/raw-battle">
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/tabelle" element={<Tabelle />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  </BrowserRouter>
)