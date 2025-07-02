-- Add validation fields to users_custom table
ALTER TABLE users_custom 
ADD COLUMN IF NOT EXISTS validato BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS data_validazione TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS validato_da UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS motivo_rifiuto TEXT,
ADD COLUMN IF NOT EXISTS tecnico_id INTEGER REFERENCES tecnico(id);

-- Create function to validate user
CREATE OR REPLACE FUNCTION validate_user(
  user_id UUID,
  role TEXT,
  tecnico_id INTEGER DEFAULT NULL,
  note TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin_user BOOLEAN;
BEGIN
  -- Check if the executing user is an admin
  SELECT EXISTS (
    SELECT 1 FROM users_custom 
    WHERE id = auth.uid() 
    AND role = 'admin'
    AND attivo = true
  ) INTO is_admin_user;

  IF NOT is_admin_user THEN
    RAISE EXCEPTION 'Only administrators can validate users';
  END IF;

  -- Update user validation status
  UPDATE users_custom
  SET 
    validato = true,
    data_validazione = now(),
    validato_da = auth.uid(),
    role = role,
    tecnico_id = tecnico_id,
    note = COALESCE(note, users_custom.note),
    attivo = true
  WHERE id = user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reject user
CREATE OR REPLACE FUNCTION reject_user(
  user_id UUID,
  motivo TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin_user BOOLEAN;
BEGIN
  -- Check if the executing user is an admin
  SELECT EXISTS (
    SELECT 1 FROM users_custom 
    WHERE id = auth.uid() 
    AND role = 'admin'
    AND attivo = true
  ) INTO is_admin_user;

  IF NOT is_admin_user THEN
    RAISE EXCEPTION 'Only administrators can reject users';
  END IF;

  -- Update user validation status
  UPDATE users_custom
  SET 
    validato = false,
    data_validazione = now(),
    validato_da = auth.uid(),
    motivo_rifiuto = motivo,
    attivo = false
  WHERE id = user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_user(UUID, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_user(UUID, TEXT) TO authenticated;