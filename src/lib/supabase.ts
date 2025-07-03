import { createClient, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
const adminName = import.meta.env.VITE_ADMIN_NAME;
const retryAttempts = parseInt(import.meta.env.VITE_RETRY_ATTEMPTS || '5', 10);
const retryInterval = parseInt(import.meta.env.VITE_RETRY_INTERVAL || '2000', 10);
const connectionTimeout = parseInt(import.meta.env.VITE_CONNECTION_TIMEOUT || '30000', 10);
const heartbeatInterval = parseInt(import.meta.env.VITE_HEARTBEAT_INTERVAL || '15000', 10);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL and Anon Key must be provided in environment variables');
}

// Create Supabase client with enhanced connection settings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'service-paghe-app@1.0.1'
    }
  }
});

// Connection state management
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

// Connection heartbeat and retry logic
let heartbeatTimer: number | null = null;
let retryCount = 0;
let retryTimer: number | null = null;

export const startHeartbeat = () => {
  stopHeartbeat(); // Clear any existing timers
  
  // Set up heartbeat
  heartbeatTimer = window.setInterval(async () => {
    try {
      // Simple lightweight query to test connection
      const { error } = await supabase
        .from('versione')
        .select('id', { head: true })
        .limit(1);
      
      if (error) {
        console.warn('Supabase connection check failed:', error.message);
        notifyConnectionChange(false);
        scheduleRetry();
      } else {
        notifyConnectionChange(true);
        retryCount = 0; // Reset retry counter on success
      }
    } catch (err) {
      console.error('Error in Supabase heartbeat:', err);
      notifyConnectionChange(false);
      scheduleRetry();
    }
  }, heartbeatInterval);
  
  // Clean up on window unload
  window.addEventListener('beforeunload', stopHeartbeat);
  
  console.log(`Supabase connection heartbeat started (${heartbeatInterval}ms interval)`);
};

export const stopHeartbeat = () => {
  if (heartbeatTimer !== null) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  
  if (retryTimer !== null) {
    window.clearTimeout(retryTimer);
    retryTimer = null;
  }
  
  window.removeEventListener('beforeunload', stopHeartbeat);
};

const scheduleRetry = () => {
  if (retryTimer !== null) {
    window.clearTimeout(retryTimer);
  }
  
  if (retryCount < retryAttempts) {
    retryCount++;
    
    // Exponential backoff with jitter
    const baseDelay = retryInterval * Math.pow(1.5, retryCount - 1);
    const jitter = Math.random() * 0.3 * baseDelay;
    const delay = Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds
    
    console.log(`Scheduling connection retry ${retryCount}/${retryAttempts} in ${Math.round(delay)}ms`);
    
    retryTimer = window.setTimeout(async () => {
      await refreshConnection();
      retryTimer = null;
    }, delay);
  } else {
    console.error('Maximum retry attempts reached. Connection recovery failed.');
    // Reset retry count after a longer delay to allow future retry attempts
    retryTimer = window.setTimeout(() => {
      retryCount = 0;
      retryTimer = null;
    }, 60000); // Wait 1 minute before resetting retry counter
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
      .select('id', { head: true })
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