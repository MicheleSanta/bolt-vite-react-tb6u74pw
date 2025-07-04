import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { createAdminUser, startHeartbeat } from './lib/supabase.ts'
import { AuthProvider } from './context/AuthContext.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'

// Add an event handler for online/offline events
window.addEventListener('online', () => {
  console.log('Browser reports online status');
});

window.addEventListener('offline', () => {
  console.log('Browser reports offline status');
});

// Initialize auth state before rendering
async function initializeApp() {
  try {
    // Try to create the admin user on application startup
    await createAdminUser();
    
    // Start the heartbeat to keep the connection alive
    startHeartbeat();
    
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