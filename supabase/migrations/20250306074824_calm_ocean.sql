/*
  # Add Travel Expenses Support

  1. New Features
    - Add travel expenses tracking for rendicontazione
    - Automatic calculation of total travel expenses
    - Row level security for travel expenses

  2. Changes
    - Create rendicontazione_trasferte table
    - Add trigger for automatic total calculation
    - Add RLS policies for user access control

  3. Security
    - Enable RLS on new table
    - Add policies to ensure users can only access their own travel expenses
*/

-- Create or replace the function to calculate total
CREATE OR REPLACE FUNCTION calculate_travel_expense_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.importo_totale := NEW.importo_unitario * NEW.numero_trasferte;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing table if it exists
DROP TABLE IF EXISTS rendicontazione_trasferte;

-- Create table
CREATE TABLE rendicontazione_trasferte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rendicontazione_id integer REFERENCES rendicontazione(id) ON DELETE CASCADE,
  importo_unitario numeric DEFAULT 0 CHECK (importo_unitario >= 0),
  numero_trasferte integer DEFAULT 0 CHECK (numero_trasferte >= 0),
  importo_totale numeric DEFAULT 0 CHECK (importo_totale >= 0),
  note text,
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint
ALTER TABLE rendicontazione_trasferte
ADD CONSTRAINT rendicontazione_trasferte_rendicontazione_id_unique 
UNIQUE (rendicontazione_id);

-- Enable RLS
ALTER TABLE rendicontazione_trasferte ENABLE ROW LEVEL SECURITY;

-- Create trigger for automatic total calculation
CREATE TRIGGER update_travel_expense_total
  BEFORE INSERT OR UPDATE OF importo_unitario, numero_trasferte
  ON rendicontazione_trasferte
  FOR EACH ROW
  EXECUTE FUNCTION calculate_travel_expense_total();

-- Create policies
CREATE POLICY "Users can read own travel expenses"
ON rendicontazione_trasferte
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own travel expenses"
ON rendicontazione_trasferte
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own travel expenses"
ON rendicontazione_trasferte
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND r.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own travel expenses"
ON rendicontazione_trasferte
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND r.user_id = auth.uid()
  )
);