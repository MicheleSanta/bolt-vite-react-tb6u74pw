/*
  # Add Version Management and Fix RLS Policies

  1. Security
    - Add RLS policies for version table
    - Fix travel expenses policies
  
  2. Changes
    - Enable RLS on version table
    - Add policies for version management
    - Fix travel expenses constraints
*/

-- Enable RLS on version table if not already enabled
ALTER TABLE versione ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on version table
DROP POLICY IF EXISTS "Allow admin delete access on versione" ON versione;
DROP POLICY IF EXISTS "Allow admin insert access on versione" ON versione;
DROP POLICY IF EXISTS "Allow admin update access on versione" ON versione;
DROP POLICY IF EXISTS "Allow public read access on versione" ON versione;

-- Create new policies for version table
CREATE POLICY "Allow public read access on versione"
ON versione
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow admin insert access on versione"
ON versione
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Allow admin update access on versione"
ON versione
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Allow admin delete access on versione"
ON versione
FOR DELETE
TO authenticated
USING (is_admin());

-- Fix travel expenses table
DO $$ 
BEGIN
  -- Drop the unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'rendicontazione_trasferte_rendicontazione_id_key'
  ) THEN
    ALTER TABLE rendicontazione_trasferte 
    DROP CONSTRAINT rendicontazione_trasferte_rendicontazione_id_key;
  END IF;

  -- Add it back if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'rendicontazione_trasferte_rendicontazione_id_key'
  ) THEN
    ALTER TABLE rendicontazione_trasferte
    ADD CONSTRAINT rendicontazione_trasferte_rendicontazione_id_key 
    UNIQUE (rendicontazione_id);
  END IF;
END $$;