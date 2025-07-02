-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS validate_user(UUID, TEXT, INTEGER, TEXT);
DROP FUNCTION IF EXISTS reject_user(UUID, TEXT);

-- Create function to validate user with consistent parameter names
CREATE OR REPLACE FUNCTION validate_user(
  p_user_id UUID,
  p_role TEXT,
  p_tecnico_id INTEGER DEFAULT NULL,
  p_note TEXT DEFAULT NULL
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
    RAISE EXCEPTION 'Only administrators can validate users';
  END IF;

  -- Update user validation status
  UPDATE users_custom
  SET 
    validato = true,
    data_validazione = now(),
    validato_da = auth.uid(),
    role = p_role,
    tecnico_id = p_tecnico_id,
    note = COALESCE(p_note, users_custom.note),
    attivo = true,
    motivo_rifiuto = NULL -- Clear any previous rejection reason
  WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reject user
CREATE OR REPLACE FUNCTION reject_user(
  p_user_id UUID,
  p_motivo TEXT
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
    RAISE EXCEPTION 'Only administrators can reject users';
  END IF;

  -- Update user validation status
  UPDATE users_custom
  SET 
    validato = false,
    data_validazione = now(),
    validato_da = auth.uid(),
    motivo_rifiuto = p_motivo,
    attivo = false
  WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_user(UUID, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_user(UUID, TEXT) TO authenticated;