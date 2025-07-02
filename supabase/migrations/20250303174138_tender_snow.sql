-- Add employee role support
CREATE OR REPLACE FUNCTION is_employee()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users_custom
    WHERE id = auth.uid()
    AND role = 'employee'
    AND attivo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION is_employee() TO public;
GRANT EXECUTE ON FUNCTION is_employee() TO anon;
GRANT EXECUTE ON FUNCTION is_employee() TO authenticated;

-- Update existing policies to include employee role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM users_custom
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION get_user_role() TO public;
GRANT EXECUTE ON FUNCTION get_user_role() TO anon;
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;