import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { createAdminUser } from './lib/supabase.ts'
import { AuthProvider } from './context/AuthContext.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'

// Initialize auth state before rendering
async function initializeApp() {
  try {
    // Try to create the admin user on application startup
    await createAdminUser();
    
    // Initialize the root with proper error boundaries
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ErrorBoundary>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (error) {
    console.error('Failed to initialize app:', error);
    
    // Still render the app even if initialization fails
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ErrorBoundary>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ErrorBoundary>
      </StrictMode>,
    );
  }
}

// Start the app
initializeApp().catch(console.error);