/*
  # Create Tipologia Ente Table

  1. New Tables
    - `tipologia_ente`
      - `id` (integer, primary key, auto-increment)
      - `descrizione` (text, max 100 chars, not null)
      - `forma_giuridica` (text, max 50 chars, not null)
      - `created_at` (timestamp with time zone, default now())

  2. Constraints
    - Primary key on `id`
    - Unique constraint on combination of `descrizione` and `forma_giuridica`
    - Character length limits on `descrizione` and `forma_giuridica`

  3. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create the tipologia_ente table
CREATE TABLE IF NOT EXISTS tipologia_ente (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  descrizione text NOT NULL CHECK (char_length(descrizione) <= 100),
  forma_giuridica text NOT NULL CHECK (char_length(forma_giuridica) <= 50),
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint on descrizione-forma_giuridica combination
ALTER TABLE tipologia_ente 
  ADD CONSTRAINT tipologia_ente_unique_combo 
  UNIQUE (descrizione, forma_giuridica);

-- Enable Row Level Security
ALTER TABLE tipologia_ente ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read all tipologie enti"
  ON tipologia_ente
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only authenticated users can insert tipologie enti"
  ON tipologia_ente
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Only authenticated users can update tipologie enti"
  ON tipologia_ente
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Only authenticated users can delete tipologie enti"
  ON tipologia_ente
  FOR DELETE
  TO authenticated
  USING (true);

-- Add foreign key to clienti_service_paghe table
ALTER TABLE clienti_service_paghe
  ADD COLUMN tipologia_ente_id integer REFERENCES tipologia_ente(id);