import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// @ts-ignore - Font package without types
import '@fontsource/vt323'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
