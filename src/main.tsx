import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { OfflineProvider } from './contexts/OfflineContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OfflineProvider>
      <App />
    </OfflineProvider>
import { ThemeProvider } from './contexts/ThemeContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
