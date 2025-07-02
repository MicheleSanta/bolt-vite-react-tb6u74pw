-- Create function to update user data
CREATE OR REPLACE FUNCTION admin_update_user(
  p_user_id UUID,
  p_role TEXT,
  p_nome TEXT DEFAULT NULL,
  p_telefono TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_attivo BOOLEAN DEFAULT NULL
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
    RAISE EXCEPTION 'Only administrators can modify user data';
  END IF;

  -- Update user data
  UPDATE users_custom
  SET 
    role = p_role,
    nome = COALESCE(p_nome, nome),
    telefono = COALESCE(p_telefono, telefono),
    note = COALESCE(p_note, note),
    attivo = COALESCE(p_attivo, attivo),
    updated_at = now()
  WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to delete user
CREATE OR REPLACE FUNCTION admin_delete_user(
  p_user_id UUID
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
    RAISE EXCEPTION 'Only administrators can delete users';
  END IF;

  -- Get the role of the user to be deleted
  SELECT role INTO v_user_role
  FROM users_custom
  WHERE id = p_user_id;

  -- Prevent deletion of admin users
  IF v_user_role = 'admin' THEN
    RAISE EXCEPTION 'Cannot delete administrator accounts';
  END IF;

  -- Delete the user from users_custom
  DELETE FROM users_custom
  WHERE id = p_user_id;

  -- Delete the user from auth.users
  DELETE FROM auth.users
  WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_update_user(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user(UUID) TO authenticated;