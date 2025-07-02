/*
  # Add TipoServizio Management
  
  1. New Tables
    - `tipo_servizio`
      - `id` (serial, primary key)
      - `codice_servizio` (text, unique)
      - `descrizione` (text)
      - `attivo` (boolean)
      - `data_creazione` (timestamptz)
      - `data_modifica` (timestamptz)
  
  2. Changes
    - Add `tipo_servizio_id` to `rendicontazione` table
    - Add foreign key constraint
    - Add default values and validation
  
  3. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create tipo_servizio table
CREATE TABLE IF NOT EXISTS tipo_servizio (
  id SERIAL PRIMARY KEY,
  codice_servizio TEXT NOT NULL UNIQUE,
  descrizione TEXT NOT NULL,
  attivo BOOLEAN NOT NULL DEFAULT true,
  data_creazione TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_modifica TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE tipo_servizio ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access for all users"
  ON tipo_servizio
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow insert for authenticated users"
  ON tipo_servizio
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
  ON tipo_servizio
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow delete for authenticated users"
  ON tipo_servizio
  FOR DELETE
  TO authenticated
  USING (true);

-- Add tipo_servizio_id to rendicontazione table
ALTER TABLE rendicontazione 
ADD COLUMN IF NOT EXISTS tipo_servizio_id INTEGER REFERENCES tipo_servizio(id);

-- Create trigger function for data_modifica
CREATE OR REPLACE FUNCTION update_tipo_servizio_data_modifica()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_modifica = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_tipo_servizio_data_modifica
  BEFORE UPDATE ON tipo_servizio
  FOR EACH ROW
  EXECUTE FUNCTION update_tipo_servizio_data_modifica();

-- Insert default services
INSERT INTO tipo_servizio (codice_servizio, descrizione) VALUES
  ('SP', 'Service Paghe'),
  ('CU', 'Certificazione Unica'),
  ('CA', 'Conto Annuale'),
  ('IN', 'INAIL'),
  ('AS', 'Altri Servizi')
ON CONFLICT (codice_servizio) DO UPDATE
SET 
  descrizione = EXCLUDED.descrizione,
  data_modifica = now();