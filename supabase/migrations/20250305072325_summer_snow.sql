-- Create version table
CREATE TABLE IF NOT EXISTS versione (
  id SERIAL PRIMARY KEY,
  versione TEXT NOT NULL,
  data_rilascio DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE versione ENABLE ROW LEVEL SECURITY;

-- Create policies for public access to read versions
CREATE POLICY "Allow public read access on versione"
  ON versione
  FOR SELECT
  TO public
  USING (true);

-- Create policies for admin access to manage versions
CREATE POLICY "Allow admin insert access on versione"
  ON versione
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Allow admin update access on versione"
  ON versione
  FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Allow admin delete access on versione"
  ON versione
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Insert initial version
INSERT INTO versione (versione, data_rilascio, note)
VALUES ('1.0.0', CURRENT_DATE, 'Versione iniziale del software')
ON CONFLICT DO NOTHING;