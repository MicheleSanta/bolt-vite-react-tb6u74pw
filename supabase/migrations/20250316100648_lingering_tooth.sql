/*
  # Fix Travel Expenses Management

  1. Changes
    - Drop triggers and functions in correct order
    - Add missing columns
    - Update triggers and functions
    - Fix data synchronization
*/

-- Drop triggers first
DROP TRIGGER IF EXISTS update_travel_expense_total ON rendicontazione_trasferte;
DROP TRIGGER IF EXISTS update_rendicontazione_trasferta_trigger ON rendicontazione_trasferte CASCADE;
DROP TRIGGER IF EXISTS update_parent_rendicontazione_trigger ON rendicontazione_trasferte CASCADE;

-- Then drop functions
DROP FUNCTION IF EXISTS calculate_travel_expense_total();
DROP FUNCTION IF EXISTS update_rendicontazione_trasferta() CASCADE;
DROP FUNCTION IF EXISTS update_parent_rendicontazione() CASCADE;

-- Create function to calculate travel expense total
CREATE OR REPLACE FUNCTION calculate_travel_expense_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.importo_totale := NEW.importo_unitario * NEW.numero_trasferte;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update parent rendicontazione
CREATE OR REPLACE FUNCTION update_parent_rendicontazione()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the parent rendicontazione
  IF TG_OP = 'DELETE' THEN
    UPDATE rendicontazione
    SET 
      flag_trasferta = EXISTS (
        SELECT 1 FROM rendicontazione_trasferte 
        WHERE rendicontazione_id = OLD.rendicontazione_id
      ),
      totale_trasferta = COALESCE((
        SELECT SUM(importo_totale)
        FROM rendicontazione_trasferte
        WHERE rendicontazione_id = OLD.rendicontazione_id
      ), 0),
      numero_trasferte = COALESCE((
        SELECT SUM(numero_trasferte)
        FROM rendicontazione_trasferte
        WHERE rendicontazione_id = OLD.rendicontazione_id
      ), 0)
    WHERE id = OLD.rendicontazione_id;
    RETURN OLD;
  ELSE
    UPDATE rendicontazione
    SET 
      flag_trasferta = true,
      totale_trasferta = COALESCE((
        SELECT SUM(importo_totale)
        FROM rendicontazione_trasferte
        WHERE rendicontazione_id = NEW.rendicontazione_id
      ), 0),
      numero_trasferte = COALESCE((
        SELECT SUM(numero_trasferte)
        FROM rendicontazione_trasferte
        WHERE rendicontazione_id = NEW.rendicontazione_id
      ), 0)
    WHERE id = NEW.rendicontazione_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic total calculation
CREATE TRIGGER update_travel_expense_total
  BEFORE INSERT OR UPDATE OF importo_unitario, numero_trasferte
  ON rendicontazione_trasferte
  FOR EACH ROW
  EXECUTE FUNCTION calculate_travel_expense_total();

-- Create trigger to update parent rendicontazione
CREATE TRIGGER update_parent_rendicontazione_trigger
  AFTER INSERT OR DELETE OR UPDATE ON rendicontazione_trasferte
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_rendicontazione();

-- Add data_trasferta column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rendicontazione_trasferte' AND column_name = 'data_trasferta'
  ) THEN
    ALTER TABLE rendicontazione_trasferte ADD COLUMN data_trasferta DATE;
  END IF;
END $$;

-- Add flag_trasferta, totale_trasferta and numero_trasferte to rendicontazione if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rendicontazione' AND column_name = 'flag_trasferta'
  ) THEN
    ALTER TABLE rendicontazione ADD COLUMN flag_trasferta BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rendicontazione' AND column_name = 'totale_trasferta'
  ) THEN
    ALTER TABLE rendicontazione ADD COLUMN totale_trasferta NUMERIC DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rendicontazione' AND column_name = 'numero_trasferte'
  ) THEN
    ALTER TABLE rendicontazione ADD COLUMN numero_trasferte INTEGER DEFAULT 0;
  END IF;
END $$;

-- Update existing rendicontazioni with correct totals
UPDATE rendicontazione r
SET
  flag_trasferta = EXISTS (
    SELECT 1 FROM rendicontazione_trasferte t
    WHERE t.rendicontazione_id = r.id
  ),
  totale_trasferta = COALESCE((
    SELECT SUM(t.importo_totale)
    FROM rendicontazione_trasferte t
    WHERE t.rendicontazione_id = r.id
  ), 0),
  numero_trasferte = COALESCE((
    SELECT SUM(t.numero_trasferte)
    FROM rendicontazione_trasferte t
    WHERE t.rendicontazione_id = r.id
  ), 0);