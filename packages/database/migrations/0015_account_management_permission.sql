INSERT INTO permissions(id,key) VALUES
 ('00000000-0000-4000-8000-000000000107','factory.account.manage')
ON CONFLICT (key) DO NOTHING;

-- Existing tenant Owner roles were created before this permission existed.
-- Grant the new permission only to the canonical Owner role in each tenant.
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id
FROM roles r
JOIN permissions p ON p.key='factory.account.manage'
WHERE r.name='Owner'
ON CONFLICT DO NOTHING;
