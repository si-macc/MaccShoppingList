import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext'
import { OfflineProvider } from './contexts/OfflineContext'
import { LoadedListProvider } from './contexts/LoadedListContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <OfflineProvider>
        <LoadedListProvider>
          <App />
        </LoadedListProvider>
      </OfflineProvider>
    </ThemeProvider>
  </StrictMode>,
)
