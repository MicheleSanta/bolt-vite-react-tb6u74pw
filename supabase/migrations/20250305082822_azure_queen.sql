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

  -- Validate password length
  IF length(p_new_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters long';
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
    data_modifica = now(),
    modificato_da = auth.uid()
  WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_reset_password(UUID, TEXT) TO authenticated;