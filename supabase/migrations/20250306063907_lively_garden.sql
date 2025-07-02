/*
  # Fix RLS policies for rendicontazione_trasferte table

  1. Security
    - Drop existing policies
    - Enable RLS on rendicontazione_trasferte table
    - Add policies for CRUD operations
    - Link permissions to parent rendicontazione record ownership

  2. Policies
    - Users can read their own travel expenses
    - Users can insert travel expenses for their own rendicontazioni
    - Users can update their own travel expenses
    - Users can delete their own travel expenses
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop SELECT policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'rendicontazione_trasferte' 
    AND policyname = 'Users can read own travel expenses'
  ) THEN
    DROP POLICY "Users can read own travel expenses" ON rendicontazione_trasferte;
  END IF;

  -- Drop INSERT policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'rendicontazione_trasferte' 
    AND policyname = 'Users can insert own travel expenses'
  ) THEN
    DROP POLICY "Users can insert own travel expenses" ON rendicontazione_trasferte;
  END IF;

  -- Drop UPDATE policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'rendicontazione_trasferte' 
    AND policyname = 'Users can update own travel expenses'
  ) THEN
    DROP POLICY "Users can update own travel expenses" ON rendicontazione_trasferte;
  END IF;

  -- Drop DELETE policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'rendicontazione_trasferte' 
    AND policyname = 'Users can delete own travel expenses'
  ) THEN
    DROP POLICY "Users can delete own travel expenses" ON rendicontazione_trasferte;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE rendicontazione_trasferte ENABLE ROW LEVEL SECURITY;

-- Policy for reading travel expenses
CREATE POLICY "Users can read own travel expenses"
ON rendicontazione_trasferte
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND r.user_id = auth.uid()
  )
);

-- Policy for inserting travel expenses
CREATE POLICY "Users can insert own travel expenses"
ON rendicontazione_trasferte
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND r.user_id = auth.uid()
  )
);

-- Policy for updating travel expenses
CREATE POLICY "Users can update own travel expenses"
ON rendicontazione_trasferte
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND r.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND r.user_id = auth.uid()
  )
);

-- Policy for deleting travel expenses
CREATE POLICY "Users can delete own travel expenses"
ON rendicontazione_trasferte
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND r.user_id = auth.uid()
  )
);