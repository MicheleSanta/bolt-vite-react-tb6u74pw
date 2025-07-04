/*
  # Add User Session Maintenance Functions
  
  1. New Functions
    - `update_user_last_access` - Updates the last access timestamp for the current user
  
  2. Changes
    - Add RPC function for tracking last user access
    - This helps with session monitoring and maintenance
*/

-- Create a function to update the last access timestamp for a user
CREATE OR REPLACE FUNCTION update_user_last_access()
RETURNS boolean AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the current user's ID
  v_user_id := auth.uid();
  
  -- Update the ultimo_accesso timestamp in users_custom
  UPDATE users_custom
  SET ultimo_accesso = now()
  WHERE id = v_user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_last_access() TO authenticated;