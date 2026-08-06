REVOKE ALL ON FUNCTION public.expire_overdue_quotes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_overdue_quotes() TO postgres, service_role;