/*
  # Create Meal Vouchers Management System

  1. New Tables
    - `buoni_pasto`
      - `id` (uuid, primary key)
      - `data` (date, not null)
      - `user_id` (uuid, references auth.users)
      - `tipo_presenza` (text, not null)
      - `diritto_buono` (boolean, not null)
      - `note` (text)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references auth.users)
      - `modified_at` (timestamptz)
      - `modified_by` (uuid, references auth.users)

  2. Enums
    - Create enum for tipo_presenza

  3. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create enum for tipo_presenza
CREATE TYPE tipo_presenza AS ENUM (
  'presenza_sede',
  'trasferta',
  'smart_working',
  'assenza'
);

-- Create buoni_pasto table
CREATE TABLE IF NOT EXISTS buoni_pasto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  tipo_presenza tipo_presenza NOT NULL,
  diritto_buono boolean NOT NULL,
  note text CHECK (char_length(note) <= 200),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  modified_at timestamptz,
  modified_by uuid REFERENCES auth.users(id),
  
  -- Add constraint to ensure one record per user per day
  CONSTRAINT buoni_pasto_user_data_unique UNIQUE (user_id, data)
);

-- Enable RLS
ALTER TABLE buoni_pasto ENABLE ROW LEVEL SECURITY;

-- Create function to automatically set diritto_buono based on tipo_presenza
CREATE OR REPLACE FUNCTION set_diritto_buono()
RETURNS TRIGGER AS $$
BEGIN
  NEW.diritto_buono := CASE 
    WHEN NEW.tipo_presenza IN ('presenza_sede', 'trasferta') THEN true
    ELSE false
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set diritto_buono
CREATE TRIGGER set_diritto_buono_trigger
  BEFORE INSERT OR UPDATE OF tipo_presenza ON buoni_pasto
  FOR EACH ROW
  EXECUTE FUNCTION set_diritto_buono();

-- Create function to update modified_at and modified_by
CREATE OR REPLACE FUNCTION update_buoni_pasto_modified()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modified_at := now();
  NEW.modified_by := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update modified fields
CREATE TRIGGER update_buoni_pasto_modified
  BEFORE UPDATE ON buoni_pasto
  FOR EACH ROW
  EXECUTE FUNCTION update_buoni_pasto_modified();

-- Create policies for authenticated users
CREATE POLICY "Users can view their own meal vouchers"
  ON buoni_pasto
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users_custom
    WHERE id = auth.uid()
    AND role = 'admin'
  ));

CREATE POLICY "Only admins can insert meal vouchers"
  ON buoni_pasto
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users_custom
    WHERE id = auth.uid()
    AND role = 'admin'
  ));

CREATE POLICY "Only admins can update meal vouchers"
  ON buoni_pasto
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users_custom
    WHERE id = auth.uid()
    AND role = 'admin'
  ));

CREATE POLICY "Only admins can delete meal vouchers"
  ON buoni_pasto
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users_custom
    WHERE id = auth.uid()
    AND role = 'admin'
  ));