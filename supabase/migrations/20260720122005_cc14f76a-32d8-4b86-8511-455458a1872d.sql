
-- Staff can view all quotes (for collaboration); delete/update rules unchanged
DROP POLICY IF EXISTS "View own or admin quotes" ON public.quotes;
CREATE POLICY "Staff view all quotes" ON public.quotes
FOR SELECT TO authenticated
USING (private.is_staff(auth.uid()));

-- Broaden quote_items view to any staff (they can see the parent quote)
DROP POLICY IF EXISTS "View items own or admin" ON public.quote_items;
DROP POLICY IF EXISTS "View own or admin quote items" ON public.quote_items;
CREATE POLICY "Staff view quote items" ON public.quote_items
FOR SELECT TO authenticated
USING (private.is_staff(auth.uid()));

-- Public RPC to fetch a quote for shared WhatsApp links (read-only)
CREATE OR REPLACE FUNCTION public.get_public_quote(_quote_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'quote', to_jsonb(q.*),
    'client', to_jsonb(c.*),
    'machine', to_jsonb(m.*),
    'company', to_jsonb(cs.*),
    'vendedor_nome', p.full_name,
    'items', COALESCE(
      (SELECT jsonb_agg(to_jsonb(qi.*) ORDER BY qi.ordem)
         FROM public.quote_items qi WHERE qi.quote_id = q.id),
      '[]'::jsonb
    )
  )
  INTO result
  FROM public.quotes q
  LEFT JOIN public.clients c ON c.id = q.client_id
  LEFT JOIN public.machines m ON m.id = q.machine_id
  LEFT JOIN public.profiles p ON p.id = q.vendedor_id
  LEFT JOIN LATERAL (SELECT * FROM public.company_settings LIMIT 1) cs ON TRUE
  WHERE q.id = _quote_id;

  RETURN result;
END; $$;

REVOKE ALL ON FUNCTION public.get_public_quote(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_quote(uuid) TO anon, authenticated;
