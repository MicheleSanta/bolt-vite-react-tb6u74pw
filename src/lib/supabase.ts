import { createClient, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
const adminName = import.meta.env.VITE_ADMIN_NAME;
const retryAttempts = parseInt(import.meta.env.VITE_RETRY_ATTEMPTS || '5', 10);
const retryInterval = parseInt(import.meta.env.VITE_RETRY_INTERVAL || '2000', 10);
const connectionTimeout = parseInt(import.meta.env.VITE_CONNECTION_TIMEOUT || '30000', 10);

// Declare supabase instance variable at top level
let supabaseInstance: any;

// Declare supabase instance variable at top level
let supabaseInstance: any;
};

// Function to validate URL
const isValidUrl = (string: string): boolean => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

// Check if environment variables are properly configured
if (!supabaseUrl || !supabaseAnonKey || 
    supabaseUrl.includes('your_supabase_project_url_here') || 
    supabaseAnonKey.includes('your_supabase_anon_key_here') ||
    !isValidUrl(supabaseUrl)) {
  
  console.error('❌ Supabase configuration error:');
  console.error('Please update your .env file with valid Supabase credentials:');
  console.error('VITE_SUPABASE_URL=https://your-project-ref.supabase.co');
  console.error('VITE_SUPABASE_ANON_KEY=your-actual-anon-key');
  console.error('You can find these values in your Supabase project settings under "API Settings"');
  
  // Create a mock client that will prevent further errors
  const mockClient = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: new Error('Supabase not configured') }),
      getUser: () => Promise.resolve({ data: { user: null }, error: new Error('Supabase not configured') }),
      signUp: () => Promise.resolve({ data: { user: null }, error: new Error('Supabase not configured') }),
      signInWithPassword: () => Promise.resolve({ data: { user: null }, error: new Error('Supabase not configured') }),
      signOut: () => Promise.resolve({ error: new Error('Supabase not configured') }),
      refreshSession: () => Promise.resolve({ data: { session: null }, error: new Error('Supabase not configured') }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => ({ 
        eq: () => ({ 
          single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
          maybeSingle: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
          limit: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
        }),
        limit: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        abortSignal: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
      }),
      insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      update: () => ({ 
        eq: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
      }),
      upsert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
    })
  } as any;
  
  supabaseInstance = mockClient;
} else {
  // Shorter heartbeat interval to detect connection issues faster (10 seconds)
  const heartbeatInterval = 10000;
  
  // Create Supabase client with enhanced connection settings
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      // Add retry configuration for token refresh
      retryAttempts: retryAttempts,
      retryInterval: retryInterval
    },
    global: {
      headers: {
        'X-Client-Info': 'service-paghe-app@1.0.1'
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });
}

// Export the supabase instance unconditionally
export const supabase = supabaseInstance;

// Export the supabase instance unconditionally
export const supabase = supabaseInstance;

// Connection state management
let isConnected = true;
let connectionListeners: Array<(connected: boolean) => void> = [];
let lastSuccessfulConnection = Date.now();

export const addConnectionListener = (listener: (connected: boolean) => void) => {
  connectionListeners.push(listener);
  listener(isConnected); // Immediately notify with current state
};

export const removeConnectionListener = (listener: (connected: boolean) => void) => {
  connectionListeners = connectionListeners.filter(l => l !== listener);
};

const notifyConnectionChange = (connected: boolean) => {
  if (isConnected !== connected) {
    console.log(`Connection state changed: ${connected ? 'CONNECTED' : 'DISCONNECTED'}`);
    isConnected = connected;
    
    if (connected) {
      lastSuccessfulConnection = Date.now();
      retryCount = 0; // Reset retry counter on success
    }
    
    connectionListeners.forEach(listener => listener(connected));
  }
};

// Connection heartbeat and retry logic
let heartbeatTimer: number | undefined = undefined;
let retryCount = 0;
let retryTimer: number | undefined = undefined;
let lastHeartbeatTime = 0;

export const startHeartbeat = () => {
  stopHeartbeat(); // Clear any existing timers
  lastHeartbeatTime = Date.now();
  
  // Set up heartbeat
  heartbeatTimer = window.setInterval(async () => {
    try {
      // Track heartbeat attempt time
      lastHeartbeatTime = Date.now();
      
      // Use a simple query with timeout to test connection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout
      
      const { error } = await supabase
        .from('versione')
        .select('id', { head: true, count: 'exact' })
        .limit(1)
        .abortSignal(controller.signal);
      
      clearTimeout(timeoutId);
      
      if (error) {
        console.warn(`Heartbeat failed: ${error.message}`);
        notifyConnectionChange(false);
        scheduleRetry();
      } else {
        // Connection is working
        notifyConnectionChange(true);
      }
    } catch (err: any) {
      // Handle timeout or other errors
      if (err.name === 'AbortError') {
        console.warn('Heartbeat timed out after 5 seconds');
      } else {
        console.error('Heartbeat error:', err);
      }
      
      notifyConnectionChange(false);
      scheduleRetry();
    }
  }, heartbeatInterval);
  
  // Add a backup timer to check if heartbeats are actually running
  // This catches cases where setInterval might be throttled in background tabs
  window.setInterval(() => {
    const timeSinceLastHeartbeat = Date.now() - lastHeartbeatTime;
    if (timeSinceLastHeartbeat > heartbeatInterval * 2) {
      console.warn(`Heartbeat appears stalled (${Math.round(timeSinceLastHeartbeat/1000)}s since last check)`);
      
      // Force a new heartbeat
      if (heartbeatTimer) {
        window.clearInterval(heartbeatTimer);
      }
      startHeartbeat();
    }
  }, heartbeatInterval * 2);
  
  // Clean up on window unload
  window.addEventListener('beforeunload', stopHeartbeat);
  
  // Setup visibility change handler to immediately check connection when tab becomes visible
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  console.log(`Supabase connection heartbeat started (${heartbeatInterval}ms interval)`);
};

export const stopHeartbeat = () => {
  if (heartbeatTimer !== undefined) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
  }
  
  if (retryTimer !== undefined) {
    window.clearTimeout(retryTimer);
    retryTimer = undefined;
  }
  
  window.removeEventListener('beforeunload', stopHeartbeat);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
};

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    console.log('Tab became visible, checking connection immediately');
    // Force an immediate connection check when the tab becomes visible
    checkConnection();
  }
};

const checkConnection = async () => {
  try {
    const { error } = await supabase
      .from('versione')
      .select('id', { head: true })
      .limit(1);
    
    if (error) {
      notifyConnectionChange(false);
      scheduleRetry();
    } else {
      notifyConnectionChange(true);
    }
  } catch (err) {
    console.error('Connection check failed:', err);
    notifyConnectionChange(false);
    scheduleRetry();
  }
};

const scheduleRetry = () => {
  if (retryTimer !== undefined) {
    window.clearTimeout(retryTimer);
  }
  
  // Maximum of retryAttempts retries with exponential backoff
  if (retryCount < retryAttempts) {
    retryCount++;
    
    // Calculate delay with exponential backoff and jitter
    const baseDelay = retryInterval * Math.pow(1.5, retryCount - 1);
    const jitter = Math.random() * 0.3 * baseDelay;
    const delay = Math.min(Math.round(baseDelay + jitter), 30000); // Cap at 30 seconds
    
    console.log(`Scheduling connection retry ${retryCount}/${retryAttempts} in ${delay}ms`);
    
    retryTimer = window.setTimeout(async () => {
      try {
        await refreshConnection();
      } catch (err) {
        console.error('Connection retry failed:', err);
      }
      retryTimer = undefined;
    }, delay);
  } else {
    console.error(`Maximum retry attempts (${retryAttempts}) reached.`);
    
    // Schedule a final retry after a longer delay
    const finalRetryDelay = 60000; // 1 minute
    console.log(`Scheduling final recovery attempt in ${finalRetryDelay/1000}s`);
    
    retryTimer = window.setTimeout(async () => {
      try {
        // Attempt a full reconnection
        retryCount = 0;
        await forceReconnect();
      } catch (err) {
        console.error('Final reconnection attempt failed:', err);
      }
      retryTimer = undefined;
    }, finalRetryDelay);
  }
};

export const refreshConnection = async (): Promise<boolean> => {
  try {
    console.log('Attempting to refresh Supabase connection...');
    
    // Try to refresh auth session first
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn('Auth refresh failed:', error.message);
      } else if (data.session) {
        console.log('Auth session refreshed successfully');
      }
    } catch (authError) {
      console.warn('Auth refresh exception:', authError);
    }
    
    // Test connection with simple query
    const { data, error } = await supabase
      .from('versione')
      .select('id', { head: true, count: 'exact' })
      .limit(1);
    
    if (error) {
      console.warn('Connection refresh failed:', error.message);
      notifyConnectionChange(false);
      return false;
    }
    
    console.log('Connection refreshed successfully');
    notifyConnectionChange(true);
    return true;
  } catch (err) {
    console.error('Error during connection refresh:', err);
    notifyConnectionChange(false);
    return false;
  }
};

// Force a complete reconnection by reloading key components
const forceReconnect = async (): Promise<boolean> => {
  try {
    console.log('Forcing full reconnection...');
    
    // Clear any auth state issues that might be present
    const currentSession = await supabase.auth.getSession();
    
    if (currentSession.data.session) {
      // If we have a session, try to refresh it
      await supabase.auth.refreshSession();
    } else {
      // If no session, we might need to re-authenticate
      // This is handled by the auth system
      console.log('No active session found during reconnection');
    }
    
    // Test the connection
    const { error } = await supabase
      .from('versione')
      .select('id', { head: true })
      .limit(1);
    
    if (error) {
      console.warn('Force reconnection failed:', error.message);
      notifyConnectionChange(false);
      return false;
    }
    
    console.log('Force reconnection succeeded');
    notifyConnectionChange(true);
    return true;
  } catch (err) {
    console.error('Error during force reconnection:', err);
    notifyConnectionChange(false);
    return false;
  }
};

// Function to ensure admin users exist
export const createAdminUser = async () => {
  if (!adminEmail || !adminPassword || !adminName) {
    console.warn('Admin credentials not configured in environment variables');
    return;
  }

  try {
    console.log('Checking admin user configuration...');
    
    // First check if user exists in users_custom
    const { data: existingCustomUser, error: customUserError } = await supabase
      .from('users_custom')
      .select('*')
      .eq('email', adminEmail)
      .maybeSingle();

    if (customUserError) {
      console.error(`Error checking for admin user:`, customUserError);
      return;
    }

    if (existingCustomUser) {
      // User exists in custom table, ensure they have admin privileges
      if (!existingCustomUser.validato || !existingCustomUser.attivo || existingCustomUser.role !== 'admin') {
        await supabase
          .from('users_custom')
          .update({
            role: 'admin',
            nome: adminName,
            attivo: true,
            validato: true,
            data_validazione: new Date().toISOString()
          })
          .eq('id', existingCustomUser.id);
        
        console.log('Admin user privileges updated');
      }
      return;
    }

    // Try to sign in first to check if auth user exists
    console.log('Creating admin user...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });

    if (signInError) {
      if (signInError.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: adminEmail,
          password: adminPassword,
          options: {
            data: {
              role: 'admin',
              nome: adminName
            }
          }
        });

        if (signUpError) {
          console.error(`Error creating admin user:`, signUpError);
          return;
        }

        if (signUpData?.user) {
          await supabase.from('users_custom').insert([{
            id: signUpData.user.id,
            email: adminEmail,
            role: 'admin',
            nome: adminName,
            attivo: true,
            validato: true,
            data_validazione: new Date().toISOString()
          }]);
          
          console.log('Admin user created successfully');
        }
      } else {
        console.error('Error signing in admin:', signInError);
      }
    } else if (signInData?.user) {
      await supabase.from('users_custom').upsert([{
        id: signInData.user.id,
        email: adminEmail,
        role: 'admin',
        nome: adminName,
        attivo: true,
        validato: true,
        data_validazione: new Date().toISOString()
      }], {
        onConflict: 'id'
      });
      
      console.log('Admin user updated successfully');
    }

    // Always sign out after processing
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Error in admin user creation process:', error);
  }
};

// Function to check session with retry logic
export const checkSession = async (): Promise<Session | null> => {
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn(`Session check failed (attempt ${attempts + 1}/${maxAttempts}):`, error.message);
        attempts++;
        
        if (attempts < maxAttempts) {
          // Wait before retry with exponential backoff
          const delay = retryInterval * Math.pow(1.5, attempts);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('Unexpected error checking session:', error);
      attempts++;
      
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, retryInterval));
        continue;
      }
      
      return null;
    }
  }
  
  return null;
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
      
    if (customError) {
      // Create default user_custom record if it doesn't exist
      if (customError.code === 'PGRST116') {
        console.warn(`No custom user found for ID ${user.id}. Creating default record.`);
        
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
      } else {
        console.error('Error getting custom user:', customError);
        return {
          ...user,
          role: 'user',
          attivo: true,
          validato: false
        };
      }
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