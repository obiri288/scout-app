import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { UserProvider } from './contexts/UserContext'
import { EcosystemProvider } from './contexts/EcosystemContext'
import { ToastProvider } from './contexts/ToastContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import WaitlistGuard from './components/WaitlistGuard'
import { NetworkGuard } from './components/NetworkGuard'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <UserProvider>
              <EcosystemProvider>
                <NetworkGuard>
                  <WaitlistGuard>
                    <App />
                  </WaitlistGuard>
                </NetworkGuard>
              </EcosystemProvider>
            </UserProvider>
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
