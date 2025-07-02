import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, checkSession, refreshConnection, addConnectionListener, removeConnectionListener } from '../lib/supabase';
import { useErrorHandler } from '../hooks/useErrorHandler';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: string | null;
  isLoading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  clearError: () => void;
  connectionLost: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userRole: null,
  isLoading: true,
  error: null,
  signOut: async () => {},
  clearError: () => {},
  connectionLost: false
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { error, setError, handleError, clearError } = useErrorHandler();
  const [authInitialized, setAuthInitialized] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);

  const checkSessionValidity = async () => {
    try {
      const validSession = await checkSession();
      if (!validSession) {
        console.warn('Session not found or invalid. Logging out.');
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setUserRole(null);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error checking session validity:', err);
      return false;
    }
  };

  // Function to fetch user role
  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data: customUser, error: roleError } = await supabase
        .from('users_custom')
        .select('role, validato, attivo')
        .eq('id', userId)
        .single();
      
      if (roleError) throw roleError;
      
      if (!customUser.attivo) {
        throw new Error('Account disattivato');
      }
      
      if (!customUser.validato) {
        throw new Error('Account in attesa di validazione');
      }
      
      return customUser.role || 'user';
    } catch (err) {
      throw err;
    }
  }, []);

  // Connection listener
  useEffect(() => {
    const handleConnectionChange = (connected: boolean) => {
      setConnectionLost(!connected);
      if (!connected) {
        setError("La connessione al database è stata persa. Tentativo di riconnessione in corso...");
      } else if (connected && connectionLost) {
        clearError();
        // If reconnection was successful, verify our session
        checkSessionValidity().then(valid => {
          if (valid && user) {
            // If we have a valid session, refresh the user role
            fetchUserRole(user.id)
              .then(role => setUserRole(role))
              .catch(console.error);
          }
        });
      }
    };

    addConnectionListener(handleConnectionChange);
    return () => removeConnectionListener(handleConnectionChange);
  }, [connectionLost, user]);

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          handleError(error);
        } else {
          setSession(session);
          setUser(session?.user || null);
          
          if (session?.user) {
            try {
              const role = await fetchUserRole(session.user.id);
              setUserRole(role);
            } catch (err) {
              handleError(err);
              setUserRole(null);
              await signOut();
            }
          }
        }
        setIsLoading(false);
        setAuthInitialized(true);
      } catch (err) {
        console.error('Error initializing auth:', err);
        setIsLoading(false);
        setAuthInitialized(true);
      }
    };

    initAuth();

    // Set up session check interval (every 30 seconds)
    const sessionCheckInterval = setInterval(() => {
      if (!connectionLost) {
        checkSessionValidity().catch(console.error);
      }
    }, 30 * 1000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      
      if (session?.user) {
        try {
          const role = await fetchUserRole(session.user.id);
          setUserRole(role);
        } catch (err) {
          handleError(err);
          setUserRole(null);
          await signOut();
        }
      } else {
        setUserRole(null);
      }
    });

    // Setup connection monitoring with auto-retry (every minute)
    const connectionMonitor = setInterval(() => {
      if (connectionLost) {
        console.log("Attempting to restore database connection...");
        refreshConnection().catch(console.error);
      }
    }, 60 * 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(sessionCheckInterval);
      clearInterval(connectionMonitor);
    };
  }, [authInitialized, connectionLost]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setUserRole(null);
      clearError();
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        session, 
        user, 
        userRole,
        isLoading: isLoading || !authInitialized,
        error,
        signOut,
        clearError,
        connectionLost
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};