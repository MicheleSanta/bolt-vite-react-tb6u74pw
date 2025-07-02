import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, checkSession } from '../lib/supabase';
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

  const checkSessionValidity = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        console.warn('Session not found or invalid. Logging out.');
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setUserRole(null);
      }
      return !!session;
    } catch (err) {
      console.error('Error checking session validity:', err);
      return false;
    }
  };

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
              const { data: customUser, error: roleError } = await supabase
                .from('users_custom')
                .select('role, validato, attivo')
                .eq('id', session.user.id)
                .single();
              
              if (roleError) throw roleError;
              
              if (!customUser.attivo) {
                throw new Error('Account disattivato');
              }
              
              if (!customUser.validato) {
                throw new Error('Account in attesa di validazione');
              }
              
              setUserRole(customUser?.role || 'user');
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

    // Set up session check interval (every 5 minutes)
    const sessionCheckInterval = setInterval(checkSessionValidity, 5 * 60 * 1000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      
      if (session?.user) {
        try {
          const { data: customUser, error: roleError } = await supabase
            .from('users_custom')
            .select('role, validato, attivo')
            .eq('id', session.user.id)
            .single();
          
          if (roleError) throw roleError;
          
          if (!customUser.attivo) {
            throw new Error('Account disattivato');
          }
          
          if (!customUser.validato) {
            throw new Error('Account in attesa di validazione');
          }
          
          setUserRole(customUser?.role || 'user');
        } catch (err) {
          handleError(err);
          setUserRole(null);
          await signOut();
        }
      } else {
        setUserRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearInterval(sessionCheckInterval);
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