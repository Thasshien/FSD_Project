import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {BrowserRouter} from 'react-router-dom'
import Store_Context_Provider from './context/Store_Context.jsx'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Store_Context_Provider>
      <App />
    </Store_Context_Provider>
  </BrowserRouter>,
)
 