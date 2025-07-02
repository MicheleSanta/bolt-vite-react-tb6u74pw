/*
  # Fix Travel Expenses RLS Policies

  1. Changes
    - Drop existing policies
    - Create new, more permissive policies for authenticated users
    - Add proper checks against rendicontazione ownership
    - Enable RLS on the table

  2. Security
    - Enable row-level security
    - Allow users to manage their own travel expenses
    - Link permissions to rendicontazione ownership
    - Allow admins full access
*/

-- First enable RLS if not already enabled
ALTER TABLE rendicontazione_trasferte ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own travel expenses" ON rendicontazione_trasferte;
DROP POLICY IF EXISTS "Users can insert own travel expenses" ON rendicontazione_trasferte;
DROP POLICY IF EXISTS "Users can update own travel expenses" ON rendicontazione_trasferte;
DROP POLICY IF EXISTS "Users can delete own travel expenses" ON rendicontazione_trasferte;

-- Create new policies with proper checks
CREATE POLICY "Users can read own travel expenses"
ON rendicontazione_trasferte
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND (r.user_id = auth.uid() OR (SELECT role FROM users_custom WHERE id = auth.uid()) = 'admin')
  )
);

CREATE POLICY "Users can insert own travel expenses"
ON rendicontazione_trasferte
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND (r.user_id = auth.uid() OR (SELECT role FROM users_custom WHERE id = auth.uid()) = 'admin')
  )
);

CREATE POLICY "Users can update own travel expenses"
ON rendicontazione_trasferte
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND (r.user_id = auth.uid() OR (SELECT role FROM users_custom WHERE id = auth.uid()) = 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND (r.user_id = auth.uid() OR (SELECT role FROM users_custom WHERE id = auth.uid()) = 'admin')
  )
);

CREATE POLICY "Users can delete own travel expenses"
ON rendicontazione_trasferte
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND (r.user_id = auth.uid() OR (SELECT role FROM users_custom WHERE id = auth.uid()) = 'admin')
  )
);