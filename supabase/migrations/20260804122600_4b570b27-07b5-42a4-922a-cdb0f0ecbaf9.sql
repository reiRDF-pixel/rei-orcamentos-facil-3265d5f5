ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS public_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS public_token_revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_decision_by text,
  ADD COLUMN IF NOT EXISTS client_decision_note text,
  ADD COLUMN IF NOT EXISTS client_decision_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS quotes_public_token_key ON public.quotes(public_token);

COMMENT ON COLUMN public.quotes.public_token IS 'Revocable unguessable token used by public quote links';
COMMENT ON COLUMN public.quotes.public_token_revoked_at IS 'When set, disables public viewing and decision for this token';

CREATE OR REPLACE FUNCTION public.get_public_quote_by_token(_token uuid)
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
    'quote', to_jsonb(q.*) - 'public_token' - 'public_token_revoked_at',
    'client', to_jsonb(c.*),
    'machine', to_jsonb(m.*),
    'company', to_jsonb(cs.*),
    'vendedor', COALESCE(q.vendedor_snapshot, to_jsonb(p.*)),
    'vendedor_nome', COALESCE(q.vendedor_snapshot->>'nome_pdf', q.vendedor_snapshot->>'full_name', p.full_name),
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
  WHERE q.public_token = _token
    AND q.public_token_revoked_at IS NULL;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_quote_by_token(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_quote_by_token(uuid) TO service_role;