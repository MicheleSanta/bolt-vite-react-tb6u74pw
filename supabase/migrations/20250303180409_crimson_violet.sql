-- Add user_id column to rendicontazione table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rendicontazione' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE rendicontazione ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Update policies to restrict access based on user_id
DROP POLICY IF EXISTS "Authenticated users can read all rendicontazioni" ON rendicontazione;
DROP POLICY IF EXISTS "Only authenticated users can insert rendicontazioni" ON rendicontazione;
DROP POLICY IF EXISTS "Only authenticated users can update rendicontazioni" ON rendicontazione;
DROP POLICY IF EXISTS "Only authenticated users can delete rendicontazioni" ON rendicontazione;

-- Create new policies
CREATE POLICY "Users can read their own rendicontazioni"
  ON rendicontazione
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    (SELECT role FROM users_custom WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Users can insert their own rendicontazioni"
  ON rendicontazione
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR 
    (SELECT role FROM users_custom WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Users can update their own rendicontazioni"
  ON rendicontazione
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    (SELECT role FROM users_custom WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Users can delete their own rendicontazioni"
  ON rendicontazione
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    (SELECT role FROM users_custom WHERE id = auth.uid()) = 'admin'
  );