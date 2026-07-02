-- Data Migration: Restore User-Role Relationships
-- This script restores the user-role relationships that were lost during the schema migration
-- It assigns the 'super-admin' role to the super admin user

-- Get the super admin role ID
SET @super_admin_role_id = (SELECT id FROM roles WHERE slug = 'super-admin' LIMIT 1);

-- Get the super admin user ID (admin@dbsbackend.local)
SET @super_admin_user_id = (SELECT id FROM users WHERE email = 'admin@dbsbackend.local' LIMIT 1);

-- Insert the user-role relationship if both exist and the relationship doesn't already exist
INSERT INTO user_roles (id, userId, roleId, assignedAt)
SELECT 
  UUID(),
  @super_admin_user_id,
  @super_admin_role_id,
  NOW()
WHERE 
  @super_admin_user_id IS NOT NULL 
  AND @super_admin_role_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE userId = @super_admin_user_id AND roleId = @super_admin_role_id
  );

-- Verify the restoration
SELECT 
  u.email,
  r.name as role_name,
  r.slug as role_slug,
  ur.assignedAt
FROM users u
JOIN user_roles ur ON u.id = ur.userId
JOIN roles r ON ur.roleId = r.id
WHERE u.email = 'admin@dbsbackend.local';
