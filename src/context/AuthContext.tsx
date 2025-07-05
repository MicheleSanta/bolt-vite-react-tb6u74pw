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
  const [sessionCheckTimer, setSessionCheckTimer] = useState<number | undefined>(undefined);

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
      console.log(`Connection status changed: ${connected ? 'Connected' : 'Disconnected'}`);
      setConnectionLost(!connected);
      
      if (connected && session && user) {
        // If reconnection successful, verify session is still valid
        checkSession().catch(() => {
          console.warn('Session invalid after reconnection, signing out');
          signOut();
        });
      }
    };

    addConnectionListener(handleConnectionChange);
    return () => removeConnectionListener(handleConnectionChange);
  }, [session, user]);

  // Check session validity periodically
  useEffect(() => {
    const checkSessionPeriodically = () => {
      // Clear any existing timer
      if (sessionCheckTimer) {
        window.clearTimeout(sessionCheckTimer);
      }
      
      // Set up a new timer
      const timerId = window.setTimeout(async () => {
        if (!connectionLost && session) {
          try {
            const validSession = await checkSession();
            if (!validSession) {
              console.warn('Session check failed, signing out');
              await signOut();
            } else {
              // Update last activity timestamp on successful check
              await supabase.rpc('update_user_last_access').catch(err => {
                console.warn('Failed to update last access time:', err);
              });
            }
          } catch (err) {
            console.error('Error checking session:', err);
          }
        }
        // Schedule the next check
        checkSessionPeriodically();
      }, 60000); // Check every minute
      
      setSessionCheckTimer(timerId);
    };
    
    // Start the periodic checks
    checkSessionPeriodically();
    
    // Cleanup
    return () => {
      if (sessionCheckTimer) {
        window.clearTimeout(sessionCheckTimer);
      }
    };
  }, [connectionLost, session, sessionCheckTimer]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        clearError();
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
              
              // Update last access time
              await supabase.rpc('update_user_last_access').catch(err => {
                console.warn('Failed to update initial last access time:', err);
              });
            } catch (err) {
              console.error('Error fetching user role:', err);
              // Create default user record if it doesn't exist
              try {
                const { data: existsData } = await supabase
                  .from('users_custom')
                  .select('id')
                  .eq('id', session.user.id)
                  .single();
                
                if (!existsData) {
                  await supabase
                    .from('users_custom')
                    .insert([{
                      id: session.user.id,
                      email: session.user.email,
                      role: 'user',
                      attivo: true,
                      validato: true
                    }]);
                  setUserRole('user');
                } else {
                  // If user exists but there was another error
                  handleError(err);
                  setUserRole(null);
                  await signOut();
                }
              } catch (createErr) {
                handleError(createErr);
                setUserRole(null);
                await signOut();
              }
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
      console.log(`Auth state changed: ${event}`);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(session);
        setUser(session?.user || null);
        
        if (session?.user) {
          try {
            try {
              const role = await fetchUserRole(session.user.id);
              setUserRole(role);
            } catch (roleErr) {
              // Create default user record if it doesn't exist
              const { data: existsData } = await supabase
                .from('users_custom')
                .select('id')
                .eq('id', session.user.id)
                .single();
              
              if (!existsData) {
                await supabase
                  .from('users_custom')
                  .insert([{
                    id: session.user.id,
                    email: session.user.email,
                    role: 'user',
                    attivo: true,
                    validato: true
                  }]);
                setUserRole('user');
              } else {
                throw roleErr;
              }
            }
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
  }, [fetchUserRole, handleError]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setTimeout(() => {
        setSession(null);
        setUser(null);
        setUserRole(null);
        clearError();
      }, 100);
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