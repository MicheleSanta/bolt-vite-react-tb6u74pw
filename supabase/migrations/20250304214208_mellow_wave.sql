-- Drop existing RLS policies for rendicontazione
DROP POLICY IF EXISTS "Users can read their own rendicontazioni" ON rendicontazione;
DROP POLICY IF EXISTS "Users can insert their own rendicontazioni" ON rendicontazione;
DROP POLICY IF EXISTS "Users can update their own rendicontazioni" ON rendicontazione;
DROP POLICY IF EXISTS "Users can delete their own rendicontazioni" ON rendicontazione;
DROP POLICY IF EXISTS "Authenticated users can read all rendicontazioni" ON rendicontazione;
DROP POLICY IF EXISTS "Only authenticated users can insert rendicontazioni" ON rendicontazione;
DROP POLICY IF EXISTS "Only authenticated users can update rendicontazioni" ON rendicontazione;
DROP POLICY IF EXISTS "Only authenticated users can delete rendicontazioni" ON rendicontazione;

-- Create new RLS policies for rendicontazione
CREATE POLICY "Enable read access for all authenticated users"
  ON rendicontazione
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for all authenticated users"
  ON rendicontazione
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update access for all authenticated users"
  ON rendicontazione
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Enable delete access for all authenticated users"
  ON rendicontazione
  FOR DELETE
  TO authenticated
  USING (true);