GRANT USAGE ON SCHEMA private TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.is_staff(uuid) TO authenticated, anon;