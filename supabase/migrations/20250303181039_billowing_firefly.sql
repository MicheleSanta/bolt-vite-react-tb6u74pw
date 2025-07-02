-- Add user_id column to rendicontazione table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rendicontazione' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE rendicontazione ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Update existing records to set user_id based on nome_tecnico matching users_custom nome
UPDATE rendicontazione r
SET user_id = uc.id
FROM users_custom uc
WHERE r.nome_tecnico = uc.nome
AND r.user_id IS NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own rendicontazioni" ON rendicontazione;
DROP POLICY IF EXISTS "Users can insert their own rendicontazioni" ON rendicontazione;
DROP POLICY IF EXISTS "Users can update their own rendicontazioni" ON rendicontazione;
DROP POLICY IF EXISTS "Users can delete their own rendicontazioni" ON rendicontazione;

-- Create new policies
CREATE POLICY "Users can read their own rendicontazioni"
  ON rendicontazione
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    (SELECT role FROM users_custom WHERE id = auth.uid()) IN ('admin', 'employee')
  );

CREATE POLICY "Users can insert their own rendicontazioni"
  ON rendicontazione
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR 
    (SELECT role FROM users_custom WHERE id = auth.uid()) IN ('admin', 'employee')
  );

CREATE POLICY "Users can update their own rendicontazioni"
  ON rendicontazione
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    (SELECT role FROM users_custom WHERE id = auth.uid()) IN ('admin', 'employee')
  );

CREATE POLICY "Users can delete their own rendicontazioni"
  ON rendicontazione
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    (SELECT role FROM users_custom WHERE id = auth.uid()) IN ('admin', 'employee')
  );