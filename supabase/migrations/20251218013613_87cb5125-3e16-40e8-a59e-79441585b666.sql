
-- Remove client roles from users who already have admin role
DELETE FROM user_roles 
WHERE role = 'client' 
AND user_id IN (
  SELECT DISTINCT user_id 
  FROM user_roles 
  WHERE role = 'admin'
);
