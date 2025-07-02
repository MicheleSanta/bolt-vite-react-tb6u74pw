/*
  # Add travel expenses tracking

  1. New Tables
    - `rendicontazione_trasferte`
      - `id` (uuid, primary key)
      - `rendicontazione_id` (integer, foreign key)
      - `importo_unitario` (numeric, default 0)
      - `numero_trasferte` (integer, default 0)
      - `importo_totale` (numeric, default 0)
      - `note` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `rendicontazione_trasferte` table
    - Add policies for authenticated users
*/

-- Create the travel expenses table
CREATE TABLE IF NOT EXISTS rendicontazione_trasferte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rendicontazione_id integer REFERENCES rendicontazione(id) ON DELETE CASCADE,
  importo_unitario numeric DEFAULT 0 CHECK (importo_unitario >= 0),
  numero_trasferte integer DEFAULT 0 CHECK (numero_trasferte >= 0),
  importo_totale numeric DEFAULT 0 CHECK (importo_totale >= 0),
  note text,
  created_at timestamptz DEFAULT now(),
  
  -- Add a unique constraint to ensure one record per rendicontazione
  UNIQUE(rendicontazione_id)
);

-- Enable RLS
ALTER TABLE rendicontazione_trasferte ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own travel expenses" 
  ON rendicontazione_trasferte
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM rendicontazione r
      WHERE r.id = rendicontazione_id
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
      WHERE r.id = rendicontazione_id
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
      WHERE r.id = rendicontazione_id
      AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rendicontazione r
      WHERE r.id = rendicontazione_id
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
      WHERE r.id = rendicontazione_id
      AND r.user_id = auth.uid()
    )
  );

-- Create a function to automatically calculate the total amount
CREATE OR REPLACE FUNCTION calculate_travel_expense_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.importo_totale := NEW.importo_unitario * NEW.numero_trasferte;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the total amount before insert or update
CREATE TRIGGER update_travel_expense_total
  BEFORE INSERT OR UPDATE OF importo_unitario, numero_trasferte
  ON rendicontazione_trasferte
  FOR EACH ROW
  EXECUTE FUNCTION calculate_travel_expense_total();