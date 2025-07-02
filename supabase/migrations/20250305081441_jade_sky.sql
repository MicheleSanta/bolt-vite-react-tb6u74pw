-- Create function to update user data
CREATE OR REPLACE FUNCTION admin_update_user(
  p_user_id UUID,
  p_role TEXT,
  p_nome TEXT DEFAULT NULL,
  p_telefono TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_attivo BOOLEAN DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin_user BOOLEAN;
  v_current_role TEXT;
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

  -- Get current user role
  SELECT role INTO v_current_role
  FROM users_custom
  WHERE id = p_user_id;

  -- Prevent changing admin role if it's the last admin
  IF v_current_role = 'admin' AND p_role != 'admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM users_custom
      WHERE role = 'admin'
      AND id != p_user_id
      AND attivo = true
    ) THEN
      RAISE EXCEPTION 'Cannot change role of the last active administrator';
    END IF;
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

  -- Update email if provided
  IF p_email IS NOT NULL THEN
    UPDATE auth.users
    SET email = p_email
    WHERE id = p_user_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to delete user with validation
CREATE OR REPLACE FUNCTION admin_delete_user(
  p_user_id UUID,
  p_confirmation TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin_user BOOLEAN;
  v_user_role TEXT;
  v_user_email TEXT;
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

  -- Get user details
  SELECT role, email INTO v_user_role, v_user_email
  FROM users_custom
  WHERE id = p_user_id;

  -- Prevent deletion of admin users
  IF v_user_role = 'admin' THEN
    RAISE EXCEPTION 'Cannot delete administrator accounts';
  END IF;

  -- Verify confirmation if provided
  IF p_confirmation IS NOT NULL AND p_confirmation != v_user_email THEN
    RAISE EXCEPTION 'Confirmation email does not match';
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

-- Create function to get user audit log
CREATE OR REPLACE FUNCTION get_user_audit_log(
  p_user_id UUID
)
RETURNS TABLE (
  action_type TEXT,
  action_date TIMESTAMPTZ,
  performed_by TEXT,
  details TEXT
) AS $$
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
    RAISE EXCEPTION 'Only administrators can view audit logs';
  END IF;

  RETURN QUERY
  SELECT 
    'Validation'::TEXT as action_type,
    data_validazione as action_date,
    (SELECT email FROM users_custom WHERE id = validato_da) as performed_by,
    'User validated'::TEXT as details
  FROM users_custom
  WHERE id = p_user_id AND data_validazione IS NOT NULL
  UNION ALL
  SELECT 
    'Status Change'::TEXT,
    updated_at,
    (SELECT email FROM users_custom WHERE id = auth.uid()),
    'Status changed to ' || CASE WHEN attivo THEN 'active' ELSE 'inactive' END
  FROM users_custom
  WHERE id = p_user_id
  ORDER BY action_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_update_user(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_audit_log(UUID) TO authenticated;