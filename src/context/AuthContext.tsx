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
  const [connectionLost, setConnectionLost] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Function to fetch user role with debouncing to avoid excessive requests
  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const now = Date.now();
      // Only fetch if we haven't fetched in the last 5 seconds
      if (now - lastFetchTime < 5000) {
        return userRole;
      }
      
      setLastFetchTime(now);
      
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
  }, [lastFetchTime, userRole]);

  // Handle connection status changes
  useEffect(() => {
    const handleConnectionChange = (connected: boolean) => {
      setConnectionLost(!connected);
      
      if (connected && session && user) {
        // If reconnection successful, verify session is still valid
        checkSession().catch(() => {
          console.warn('Session invalid after reconnection');
          signOut();
        });
      }
    };

    addConnectionListener(handleConnectionChange);
    return () => removeConnectionListener(handleConnectionChange);
  }, [session, user]);

  // Check session validity periodically
  useEffect(() => {
    let sessionCheckTimer: number | undefined;
    
    const checkSessionPeriodically = () => {
      sessionCheckTimer = window.setTimeout(async () => {
        if (!connectionLost && session) {
          try {
            const validSession = await checkSession();
            if (!validSession) {
              console.warn('Session check failed, signing out');
              await signOut();
            }
          } catch (err) {
            console.error('Error checking session:', err);
          }
        }
        checkSessionPeriodically();
      }, 60000); // Check every minute
    };
    
    checkSessionPeriodically();
    
    return () => {
      if (sessionCheckTimer) {
        clearTimeout(sessionCheckTimer);
      }
    };
  }, [connectionLost, session]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
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
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
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
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setUserRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
        isLoading,
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