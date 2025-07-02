/*
  # Fix RLS Policies for Travel Expenses

  1. Changes
    - Drop existing policies
    - Create new, more permissive policies for authenticated users
    - Ensure proper access control while maintaining security

  2. Security
    - Maintain row-level security
    - Allow authenticated users to manage their own travel expenses
    - Link permissions to rendicontazione ownership
*/

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
    AND (r.user_id = auth.uid() OR auth.role() = 'admin')
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
    AND (r.user_id = auth.uid() OR auth.role() = 'admin')
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
    AND (r.user_id = auth.uid() OR auth.role() = 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rendicontazione r
    WHERE r.id = rendicontazione_trasferte.rendicontazione_id
    AND (r.user_id = auth.uid() OR auth.role() = 'admin')
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
    AND (r.user_id = auth.uid() OR auth.role() = 'admin')
  )
);