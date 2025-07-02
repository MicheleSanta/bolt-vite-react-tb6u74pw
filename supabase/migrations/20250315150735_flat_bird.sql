-- Remove unique constraint if it exists
ALTER TABLE rendicontazione_trasferte 
DROP CONSTRAINT IF EXISTS rendicontazione_trasferte_rendicontazione_id_unique;

-- Add data_trasferta column if it doesn't exist
ALTER TABLE rendicontazione_trasferte 
ADD COLUMN IF NOT EXISTS data_trasferta DATE;

-- Create function to update parent rendicontazione
CREATE OR REPLACE FUNCTION update_parent_rendicontazione()
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
DROP TRIGGER IF EXISTS update_parent_rendicontazione_trigger ON rendicontazione_trasferte;
CREATE TRIGGER update_parent_rendicontazione_trigger
  AFTER INSERT OR DELETE OR UPDATE ON rendicontazione_trasferte
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_rendicontazione();