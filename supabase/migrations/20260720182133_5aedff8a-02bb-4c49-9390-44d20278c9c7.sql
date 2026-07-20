REVOKE ALL ON FUNCTION public.get_public_quote(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_quote(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_public_quote(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_quote(uuid) TO service_role;