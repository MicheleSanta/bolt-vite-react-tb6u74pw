-- Add missing fields to users_custom table
DO $$
BEGIN
  -- Add data_creazione if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users_custom' AND column_name = 'data_creazione'
  ) THEN
    ALTER TABLE users_custom ADD COLUMN data_creazione TIMESTAMPTZ DEFAULT now();
  END IF;

  -- Add data_modifica if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users_custom' AND column_name = 'data_modifica'
  ) THEN
    ALTER TABLE users_custom ADD COLUMN data_modifica TIMESTAMPTZ;
  END IF;

  -- Add modificato_da if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users_custom' AND column_name = 'modificato_da'
  ) THEN
    ALTER TABLE users_custom ADD COLUMN modificato_da UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Create or replace function to check email uniqueness
CREATE OR REPLACE FUNCTION check_email_unique(
  p_email TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 
    FROM users_custom 
    WHERE email = p_email 
    AND (p_user_id IS NULL OR id != p_user_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace function to update user with validation
CREATE OR REPLACE FUNCTION admin_update_user_with_validation(
  p_user_id UUID,
  p_email TEXT,
  p_role TEXT,
  p_nome TEXT,
  p_telefono TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_attivo BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin_user BOOLEAN;
  v_current_role TEXT;
  v_email_exists BOOLEAN;
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

  -- Check email uniqueness
  IF NOT check_email_unique(p_email, p_user_id) THEN
    RAISE EXCEPTION 'Email already exists';
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
    email = p_email,
    role = p_role,
    nome = p_nome,
    telefono = p_telefono,
    note = COALESCE(p_note, note),
    attivo = COALESCE(p_attivo, attivo),
    data_modifica = now(),
    modificato_da = auth.uid()
  WHERE id = p_user_id;

  -- Update email in auth.users if changed
  UPDATE auth.users
  SET email = p_email
  WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_email_unique(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_user_with_validation(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;