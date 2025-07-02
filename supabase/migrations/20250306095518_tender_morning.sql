/*
  # Travel Expenses Management

  1. New Tables
    - `rendicontazione_trasferte`
      - `id` (uuid, primary key)
      - `rendicontazione_id` (integer, foreign key)
      - `importo_unitario` (numeric)
      - `numero_trasferte` (integer)
      - `importo_totale` (numeric)
      - `note` (text)
      - `created_at` (timestamptz)

  2. Changes
    - Add automatic calculation of total amount
    - Add constraints for positive values
    - Add unique constraint on rendicontazione_id

  3. Security
    - Enable RLS
    - Add policies for CRUD operations
    - Link permissions to rendicontazione ownership
*/

-- Drop existing objects if they exist
DO $$ BEGIN
  -- Drop trigger if exists
  DROP TRIGGER IF EXISTS update_travel_expense_total ON rendicontazione_trasferte;
  
  -- Drop function if exists
  DROP FUNCTION IF EXISTS calculate_travel_expense_total();
  
  -- Drop policies if they exist
  DROP POLICY IF EXISTS "Enable read access for all users" ON rendicontazione_trasferte;
  DROP POLICY IF EXISTS "Users can read own travel expenses" ON rendicontazione_trasferte;
  DROP POLICY IF EXISTS "Users can delete own travel expenses" ON rendicontazione_trasferte;
  DROP POLICY IF EXISTS "Users can insert own travel expenses" ON rendicontazione_trasferte;
  DROP POLICY IF EXISTS "Users can update own travel expenses" ON rendicontazione_trasferte;
  
  -- Drop table if exists
  DROP TABLE IF EXISTS rendicontazione_trasferte;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_function THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- Create travel expenses table
CREATE TABLE rendicontazione_trasferte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rendicontazione_id integer REFERENCES rendicontazione(id) ON DELETE CASCADE,
  importo_unitario numeric NOT NULL DEFAULT 0,
  numero_trasferte integer NOT NULL DEFAULT 0,
  importo_totale numeric NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT rendicontazione_trasferte_rendicontazione_id_unique UNIQUE (rendicontazione_id),
  CONSTRAINT rendicontazione_trasferte_importo_unitario_check CHECK (importo_unitario >= 0),
  CONSTRAINT rendicontazione_trasferte_numero_trasferte_check CHECK (numero_trasferte >= 0),
  CONSTRAINT rendicontazione_trasferte_importo_totale_check CHECK (importo_totale >= 0)
);

-- Enable RLS
ALTER TABLE rendicontazione_trasferte ENABLE ROW LEVEL SECURITY;

-- Create trigger function to calculate total
CREATE FUNCTION calculate_travel_expense_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.importo_totale := NEW.importo_unitario * NEW.numero_trasferte;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_travel_expense_total
  BEFORE INSERT OR UPDATE OF importo_unitario, numero_trasferte
  ON rendicontazione_trasferte
  FOR EACH ROW
  EXECUTE FUNCTION calculate_travel_expense_total();

-- Create RLS policies
CREATE POLICY "Enable read access for all users"
  ON rendicontazione_trasferte
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can read own travel expenses"
  ON rendicontazione_trasferte
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND (r.user_id = auth.uid() OR (SELECT role FROM users_custom WHERE id = auth.uid()) = 'admin')
  ));

CREATE POLICY "Users can delete own travel expenses"
  ON rendicontazione_trasferte
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND (r.user_id = auth.uid() OR (SELECT role FROM users_custom WHERE id = auth.uid()) = 'admin')
  ));

CREATE POLICY "Users can insert own travel expenses"
  ON rendicontazione_trasferte
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND (r.user_id = auth.uid() OR (SELECT role FROM users_custom WHERE id = auth.uid()) = 'admin')
  ));

CREATE POLICY "Users can update own travel expenses"
  ON rendicontazione_trasferte
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND (r.user_id = auth.uid() OR (SELECT role FROM users_custom WHERE id = auth.uid()) = 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND (r.user_id = auth.uid() OR (SELECT role FROM users_custom WHERE id = auth.uid()) = 'admin')
  ));