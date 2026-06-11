-- Create get_team_members RPC function
-- Returns all employees that report to a given manager (via manager_hierarchy or manager_id on profile)
-- Falls back to returning all employees for admin users
CREATE OR REPLACE FUNCTION get_team_members(manager_user_id uuid)
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  role text,
  status text,
  level integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return employees who have this manager_id set, or via manager_hierarchy
  RETURN QUERY
    SELECT DISTINCT
      p.id,
      p.email,
      p.full_name,
      p.role,
      p.status,
      1 as level
    FROM profiles p
    WHERE 
      p.role = 'employee'
      AND p.deleted_at IS NULL
      AND (
        p.manager_id = manager_user_id
        OR EXISTS (
          SELECT 1 FROM manager_hierarchy mh
          WHERE mh.manager_id = manager_user_id AND mh.employee_id = p.id
        )
      )
    ORDER BY p.full_name;
END;
$$;