/*
  # Add Trip Date to Travel Expenses

  1. Changes
    - Add `data_trasferta` column to `rendicontazione_trasferte` table
    - Remove unique constraint to allow multiple trips per report
    - Add trigger to update parent rendicontazione
*/

-- Remove unique constraint if it exists
ALTER TABLE rendicontazione_trasferte 
DROP CONSTRAINT IF EXISTS rendicontazione_trasferte_rendicontazione_id_unique;

-- Add data_trasferta column
ALTER TABLE rendicontazione_trasferte 
ADD COLUMN IF NOT EXISTS data_trasferta DATE;

-- Add flag_trasferta and totale_trasferta to rendicontazione if they don't exist
ALTER TABLE rendicontazione
ADD COLUMN IF NOT EXISTS flag_trasferta BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS totale_trasferta NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS numero_trasferte INTEGER DEFAULT 0;

-- Create function to update parent rendicontazione
CREATE OR REPLACE FUNCTION update_rendicontazione_trasferta()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the parent rendicontazione
  UPDATE rendicontazione
  SET 
    flag_trasferta = EXISTS (
      SELECT 1 FROM rendicontazione_trasferte 
      WHERE rendicontazione_id = NEW.rendicontazione_id
    ),
    totale_trasferta = (
      SELECT COALESCE(SUM(importo_totale), 0)
      FROM rendicontazione_trasferte
      WHERE rendicontazione_id = NEW.rendicontazione_id
    ),
    numero_trasferte = (
      SELECT COALESCE(SUM(numero_trasferte), 0)
      FROM rendicontazione_trasferte
      WHERE rendicontazione_id = NEW.rendicontazione_id
    )
  WHERE id = NEW.rendicontazione_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update parent rendicontazione
CREATE TRIGGER update_rendicontazione_trasferta_trigger
  AFTER INSERT OR DELETE OR UPDATE ON rendicontazione_trasferte
  FOR EACH ROW
  EXECUTE FUNCTION update_rendicontazione_trasferta();