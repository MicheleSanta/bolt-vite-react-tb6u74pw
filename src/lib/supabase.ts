import { createClient, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
const adminName = import.meta.env.VITE_ADMIN_NAME;
const retryAttempts = parseInt(import.meta.env.VITE_RETRY_ATTEMPTS || '5', 10);
const retryInterval = parseInt(import.meta.env.VITE_RETRY_INTERVAL || '2000', 10);
const connectionTimeout = parseInt(import.meta.env.VITE_CONNECTION_TIMEOUT || '30000', 10);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided');
}

// Create Supabase client with enhanced connection settings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    retryAttempts: retryAttempts,
    retryInterval: retryInterval
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'service-paghe-app@1.0.1'
    },
    fetch: (url, options) => {
      // Enhanced fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), connectionTimeout);
      
      const fetchPromise = fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      fetchPromise.finally(() => clearTimeout(timeoutId));
      return fetchPromise;
    }
  }
});

// Add connection monitoring
let isConnected = true;
let connectionListeners: Array<(connected: boolean) => void> = [];

export const addConnectionListener = (listener: (connected: boolean) => void) => {
  connectionListeners.push(listener);
  listener(isConnected); // Immediately notify with current state
};

export const removeConnectionListener = (listener: (connected: boolean) => void) => {
  connectionListeners = connectionListeners.filter(l => l !== listener);
};

const notifyConnectionChange = (connected: boolean) => {
  if (isConnected !== connected) {
    isConnected = connected;
    connectionListeners.forEach(listener => listener(connected));
  }
};

// Add heartbeat ping to keep connection alive
let heartbeatInterval: number | null = null;
let retryCount = 0;
const MAX_RETRIES = retryAttempts;
const INITIAL_RETRY_DELAY = retryInterval;

export const startHeartbeat = () => {
  // Clear any existing heartbeat
  stopHeartbeat();
  
  // Set up heartbeat every 15 seconds
  heartbeatInterval = window.setInterval(async () => {
    try {
      // Simple ping to keep the connection alive
      const { error } = await supabase.from('versione').select('id').limit(1);
      if (error) {
        console.warn('Supabase heartbeat error:', error);
        notifyConnectionChange(false);
        retryHeartbeat();
      } else {
        // Reset retry count on successful ping
        retryCount = 0;
        notifyConnectionChange(true);
      }
    } catch (err) {
      console.error('Error in Supabase heartbeat:', err);
      notifyConnectionChange(false);
      retryHeartbeat();
    }
  }, 15000); // 15s interval
  
  // Clean up on window unload
  window.addEventListener('beforeunload', stopHeartbeat);
};

export const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  window.removeEventListener('beforeunload', stopHeartbeat);
};

const retryHeartbeat = () => {
  if (retryCount < MAX_RETRIES) {
    retryCount++;
    console.log(`Retry attempt ${retryCount}/${MAX_RETRIES} for Supabase connection...`);
    
    // Exponential backoff for retries
    const delay = INITIAL_RETRY_DELAY * Math.pow(1.5, retryCount - 1);
    
    setTimeout(() => {
      // Attempt to refresh the connection
      refreshConnection().then(success => {
        if (success) {
          console.log('Connection successfully refreshed');
          retryCount = 0;
          notifyConnectionChange(true);
        } else {
          console.warn('Connection refresh failed');
          notifyConnectionChange(false);
        }
      });
    }, delay);
  } else {
    console.error('Max retry attempts reached. Please check your network connection.');
    // Reset retry count to allow future reconnection attempts when heartbeat runs again
    retryCount = 0;
  }
};

// Function to ensure admin users exist and are properly configured
export const createAdminUser = async () => {
  try {
    if (!adminEmail || !adminPassword || !adminName) {
      console.error('Admin credentials not configured');
      return;
    }

    const adminUsers = [
      {
        email: adminEmail,
        password: adminPassword,
        name: adminName
      }
    ];

    for (const admin of adminUsers) {
      try {
        // First check if user exists in users_custom
        const { data: existingCustomUser, error: customUserError } = await supabase
          .from('users_custom')
          .select('*')
          .eq('email', admin.email)
          .single();

        if (customUserError && customUserError.code !== 'PGRST116') {
          console.error(`Error checking custom user for ${admin.email}:`, customUserError);
          continue;
        }

        if (existingCustomUser) {
          // User exists in custom table, ensure they have admin privileges
          if (!existingCustomUser.validato || !existingCustomUser.attivo || existingCustomUser.role !== 'admin') {
            await supabase
              .from('users_custom')
              .update({
                role: 'admin',
                nome: admin.name,
                attivo: true,
                validato: true,
                data_validazione: new Date().toISOString()
              })
              .eq('id', existingCustomUser.id);
          }
          continue;
        }

        // Try to sign in first to check if auth user exists
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: admin.email,
          password: admin.password
        });

        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: admin.email,
              password: admin.password,
              options: {
                data: {
                  role: 'admin',
                  nome: admin.name
                }
              }
            });

            if (signUpError && signUpError.status !== 422) {
              console.error(`Error creating admin user ${admin.email}:`, signUpError);
              continue;
            }

            if (signUpData?.user) {
              await supabase.from('users_custom').insert([{
                id: signUpData.user.id,
                email: admin.email,
                role: 'admin',
                nome: admin.name,
                attivo: true,
                validato: true,
                data_validazione: new Date().toISOString()
              }]);
            }
          }
        } else if (signInData?.user) {
          await supabase.from('users_custom').upsert([{
            id: signInData.user.id,
            email: admin.email,
            role: 'admin',
            nome: admin.name,
            attivo: true,
            validato: true,
            data_validazione: new Date().toISOString()
          }], {
            onConflict: 'id'
          });
        }

        // Always sign out after processing
        await supabase.auth.signOut();
      } catch (err) {
        console.error(`Error processing admin user ${admin.email}:`, err);
      }
    }
  } catch (error) {
    console.error('Error in admin user creation process:', error);
  }
};

// Function to check session with retry logic and better error handling
export const checkSession = async (): Promise<Session | null> => {
  let retries = retryAttempts;
  while (retries > 0) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn(`Session check error (${retries} retries left):`, error.message);
        
        if (error.message.includes('Failed to fetch') || 
            error.message.includes('NetworkError') || 
            error.message.includes('Network request failed')) {
          console.warn('Network error detected, waiting before retry');
          notifyConnectionChange(false);
        } else if (error.message.includes('refresh_token_not_found') && retries > 1) {
          console.warn('Refresh token not found, trying refresh auth...');
          await supabase.auth.refreshSession();
        }
        
        retries--;
        if (retries === 0) {
          console.error('All session check retries failed');
          return null;
        }
        
        // Wait before retry with exponential backoff
        const delay = retryInterval * Math.pow(1.5, retryAttempts - retries);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      notifyConnectionChange(true);
      return session;
    } catch (error) {
      console.error('Unexpected error checking session:', error);
      retries--;
      notifyConnectionChange(false);
      if (retries === 0) {
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }
  return null;
};

// Function to refresh the Supabase connection
export const refreshConnection = async (): Promise<boolean> => {
  try {
    // Perform a lightweight query to test connection
    const { error } = await supabase.from('versione').select('id').limit(1);
    
    if (error) {
      console.warn('Connection test failed, attempting to refresh session...');
      
      // Attempt to refresh the session
      const { error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        if (refreshError.message.includes('JWT') || 
            refreshError.message.includes('token') || 
            refreshError.message.includes('auth')) {
          // Auth-related errors, try to get a new session
          const currentSession = await checkSession();
          return !!currentSession;
        }
        
        console.error('Failed to refresh session:', refreshError);
        return false;
      }
      
      // Verify the connection is working after refresh
      const { error: verifyError } = await supabase.from('versione').select('id').limit(1);
      return !verifyError;
    }
    
    return true;
  } catch (err) {
    console.error('Error refreshing connection:', err);
    return false;
  }
};

// Function to get current user with role
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting user:', userError);
      return null;
    }
    
    if (!user) {
      console.warn('No user found in session.');
      return null;
    }

    // Get user's custom data including role and validation status
    const { data: customUser, error: customError } = await supabase
      .from('users_custom')
      .select('*')
      .eq('id', user.id)
      .single();
      
    if (customError?.code === 'PGRST116') {
      console.warn(`No custom user found for ID ${user.id}. Creating a default record.`);
      // Create default user_custom record if it doesn't exist
      const { data: newCustomUser, error: createError } = await supabase
        .from('users_custom')
        .insert([{
          id: user.id,
          email: user.email,
          role: user.user_metadata?.role || 'user',
          attivo: true,
          validato: false
        }])
        .select()
        .single();
        
      if (createError) {
        console.error('Error creating custom user:', createError);
        return {
          ...user,
          role: 'user',
          attivo: true,
          validato: false
        };
      }
      
      return {
        ...user,
        ...newCustomUser
      };
    }
    
    if (customError) {
      console.error('Error getting custom user:', customError);
      return {
        ...user,
        role: 'user',
        attivo: true,
        validato: false
      };
    }
    
    return {
      ...user,
      ...customUser
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};