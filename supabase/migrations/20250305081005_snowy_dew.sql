-- Create function to reset user password
CREATE OR REPLACE FUNCTION admin_reset_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin_user BOOLEAN;
BEGIN
  -- Check if the executing user is an admin
  SELECT EXISTS (
    SELECT 1 FROM users_custom 
    WHERE id = auth.uid() 
    AND users_custom.role = 'admin'
    AND attivo = true
  ) INTO v_is_admin_user;

  IF NOT v_is_admin_user THEN
    RAISE EXCEPTION 'Only administrators can reset passwords';
  END IF;

  -- Update user password
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf'))
  WHERE id = p_user_id;

  -- Add a note about password reset
  UPDATE users_custom
  SET 
    note = CASE 
      WHEN note IS NULL OR note = '' THEN 'Password reset by admin on ' || now()::text
      ELSE note || E'\nPassword reset by admin on ' || now()::text
    END,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to toggle user active status
CREATE OR REPLACE FUNCTION admin_toggle_user_status(
  p_user_id UUID,
  p_attivo BOOLEAN,
  p_note TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin_user BOOLEAN;
  v_user_role TEXT;
BEGIN
  -- Check if the executing user is an admin
  SELECT EXISTS (
    SELECT 1 FROM users_custom 
    WHERE id = auth.uid() 
    AND users_custom.role = 'admin'
    AND attivo = true
  ) INTO v_is_admin_user;

  IF NOT v_is_admin_user THEN
    RAISE EXCEPTION 'Only administrators can change user status';
  END IF;

  -- Get the role of the target user
  SELECT role INTO v_user_role
  FROM users_custom
  WHERE id = p_user_id;

  -- Prevent deactivation of admin users
  IF v_user_role = 'admin' AND NOT p_attivo THEN
    RAISE EXCEPTION 'Cannot deactivate administrator accounts';
  END IF;

  -- Update user status
  UPDATE users_custom
  SET 
    attivo = p_attivo,
    note = CASE 
      WHEN p_note IS NOT NULL THEN 
        CASE 
          WHEN note IS NULL OR note = '' THEN p_note
          ELSE note || E'\n' || p_note
        END
      ELSE note
    END,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_reset_password(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_toggle_user_status(UUID, BOOLEAN, TEXT) TO authenticated;