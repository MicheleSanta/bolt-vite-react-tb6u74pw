-- Drop existing triggers and functions first
DROP TRIGGER IF EXISTS set_diritto_buono_trigger ON buoni_pasto;
DROP TRIGGER IF EXISTS update_buoni_pasto_modified ON buoni_pasto;
DROP FUNCTION IF EXISTS set_diritto_buono();
DROP FUNCTION IF EXISTS update_buoni_pasto_modified();

-- Drop existing table if it exists
DROP TABLE IF EXISTS buoni_pasto;

-- Create buoni_pasto table with proper foreign key reference
CREATE TABLE IF NOT EXISTS buoni_pasto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_presenza tipo_presenza NOT NULL,
  diritto_buono boolean NOT NULL,
  note text CHECK (char_length(note) <= 200),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  modified_at timestamptz,
  modified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
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