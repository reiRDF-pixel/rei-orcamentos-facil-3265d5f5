
-- 1) machines.client_id opcional
ALTER TABLE public.machines DROP CONSTRAINT IF EXISTS machines_client_id_fkey;
ALTER TABLE public.machines ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.machines
  ADD CONSTRAINT machines_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- 2) Restringir DELETE em quotes ao vendedor criador (nem admin apaga alheio)
DROP POLICY IF EXISTS "Delete own or admin quotes" ON public.quotes;
CREATE POLICY "Only owner deletes quote" ON public.quotes FOR DELETE TO authenticated
  USING (vendedor_id = auth.uid());

-- 2b) quote_items delete acompanha o dono da quote
DROP POLICY IF EXISTS "Delete quote items via quote" ON public.quote_items;
CREATE POLICY "Delete quote items via quote" ON public.quote_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id AND q.vendedor_id = auth.uid()
  ));

-- 3) Permitir que qualquer funcionário veja nome dos colegas (para exibir "criado por")
DROP POLICY IF EXISTS "Staff view profiles" ON public.profiles;
CREATE POLICY "Staff view profiles" ON public.profiles FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

-- 4) RPC pública para link do WhatsApp (leitura somente)
CREATE OR REPLACE FUNCTION public.get_public_quote(_quote_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'quote', to_jsonb(q.*),
    'client', to_jsonb(c.*),
    'machine', to_jsonb(m.*),
    'items', COALESCE((
      SELECT jsonb_agg(to_jsonb(qi.*) ORDER BY qi.ordem)
      FROM public.quote_items qi WHERE qi.quote_id = q.id
    ), '[]'::jsonb),
    'company', (SELECT to_jsonb(cs.*) FROM public.company_settings cs LIMIT 1),
    'vendedor_nome', (SELECT p.full_name FROM public.profiles p WHERE p.id = q.vendedor_id)
  )
  FROM public.quotes q
  LEFT JOIN public.clients c ON c.id = q.client_id
  LEFT JOIN public.machines m ON m.id = q.machine_id
  WHERE q.id = _quote_id;
$$;

REVOKE ALL ON FUNCTION public.get_public_quote(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_quote(uuid) TO anon, authenticated;
