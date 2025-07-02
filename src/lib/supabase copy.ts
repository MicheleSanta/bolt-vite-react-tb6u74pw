import { createClient, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    // Add retry configuration for token refresh
    retryAttempts: 3,
    retryInterval: 2000 // 2 seconds between retries
  }
});

// Function to check session with retry logic
export const checkSession = async (): Promise<Session | null> => {
  let retries = 3;
  while (retries > 0) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        if (error.message.includes('refresh_token_not_found') && retries > 1) {
          retries--;
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
          continue;
        }
        throw error;
      }
      return session;
    } catch (error) {
      console.error('Error checking session:', error);
      retries--;
      if (retries === 0) {
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
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
      return null;
    }

    // Get user's custom data including role and validation status
    const { data: customUser, error: customError } = await supabase
      .from('users_custom')
      .select('*')
      .eq('id', user.id)
      .single();
      
    if (customError) {
      if (customError.code === 'PGRST116') {
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