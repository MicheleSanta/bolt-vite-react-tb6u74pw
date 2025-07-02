import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, checkSession, refreshConnection } from '../lib/supabase';
import { useErrorHandler } from '../hooks/useErrorHandler';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: string | null;
  isLoading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userRole: null,
  isLoading: true,
  error: null,
  signOut: async () => {},
  clearError: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { error, setError, handleError, clearError } = useErrorHandler();
  const [authInitialized, setAuthInitialized] = useState(false);
  const [connectionActive, setConnectionActive] = useState(true);

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

    // Set up session check interval (every 2 minutes)
    const sessionCheckInterval = setInterval(() => {
      checkSessionValidity().then(valid => {
        if (!valid && authInitialized) {
          // If session is invalid and we've already initialized, try to reconnect
          refreshConnection().then(success => {
            setConnectionActive(success);
            if (!success) {
              // If reconnection failed, clear the user state
              setSession(null);
              setUser(null);
              setUserRole(null);
            }
          });
        } else {
          setConnectionActive(true);
        }
      });
    }, 2 * 60 * 1000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      
      if (session?.user) {
        try {
          const role = await fetchUserRole(session.user.id);
          setUserRole(role);
          setConnectionActive(true);
        } catch (err) {
          handleError(err);
          setUserRole(null);
          await signOut();
        }
      } else {
        setUserRole(null);
      }
    });

    // Setup connection monitoring
    const connectionMonitor = setInterval(() => {
      if (connectionActive === false) {
        console.log("Attempting to restore database connection...");
        refreshConnection().then(success => {
          setConnectionActive(success);
          if (success && user) {
            // If connection is restored and we have a user, refresh the role
            fetchUserRole(user.id)
              .then(role => setUserRole(role))
              .catch(console.error);
          }
        });
      }
    }, 5000); // Check every 5 seconds if connection is lost

    return () => {
      subscription.unsubscribe();
      clearInterval(sessionCheckInterval);
      clearInterval(connectionMonitor);
    };
  }, [authInitialized, connectionActive, user]);

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

  // Display a visible error if connection is lost
  useEffect(() => {
    if (!connectionActive && !isLoading) {
      setError("La connessione al database è stata persa. Tentativo di riconnessione in corso...");
    } else if (connectionActive) {
      clearError();
    }
  }, [connectionActive, isLoading]);

  return (
    <AuthContext.Provider 
      value={{ 
        session, 
        user, 
        userRole,
        isLoading: isLoading || !authInitialized,
        error,
        signOut,
        clearError
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