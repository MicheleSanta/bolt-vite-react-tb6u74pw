/*
  # Add Missing RLS Policies for Travel Expenses

  1. Security
    - Add missing RLS policies for travel expenses table
    - Ensure proper access control based on user ownership
*/

-- Enable RLS if not already enabled
ALTER TABLE rendicontazione_trasferte ENABLE ROW LEVEL SECURITY;

-- Create new policies only if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rendicontazione_trasferte' 
    AND policyname = 'Users can read own travel expenses'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rendicontazione_trasferte' 
    AND policyname = 'Users can insert own travel expenses'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rendicontazione_trasferte' 
    AND policyname = 'Users can update own travel expenses'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rendicontazione_trasferte' 
    AND policyname = 'Users can delete own travel expenses'
  ) THEN
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
  END IF;
END $$;