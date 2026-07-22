
-- 1) sales_reps table
CREATE TABLE public.sales_reps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT false,
  full_name text,
  nome_pdf text,
  cargo text,
  email text,
  phone text,
  phone_comercial text,
  whatsapp text,
  avatar_url text,
  signature_url text,
  logo_url text,
  empresa_nome text,
  endereco text,
  cep text,
  cidade text,
  estado text,
  site text,
  instagram text,
  facebook text,
  linkedin text,
  mensagem_padrao text,
  pix_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_reps TO authenticated;
GRANT ALL ON public.sales_reps TO service_role;

ALTER TABLE public.sales_reps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own sales reps"
  ON public.sales_reps FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);
CREATE POLICY "Owner can insert own sales reps"
  ON public.sales_reps FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update own sales reps"
  ON public.sales_reps FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can delete own sales reps"
  ON public.sales_reps FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE TRIGGER update_sales_reps_updated_at
  BEFORE UPDATE ON public.sales_reps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure only one default per owner
CREATE UNIQUE INDEX sales_reps_one_default_per_owner
  ON public.sales_reps(owner_id) WHERE is_default;

CREATE INDEX sales_reps_owner_idx ON public.sales_reps(owner_id);

-- 2) sales_rep_id on quotes
ALTER TABLE public.quotes
  ADD COLUMN sales_rep_id uuid REFERENCES public.sales_reps(id) ON DELETE SET NULL;

-- 3) Backfill: one default sales_rep per existing profile
INSERT INTO public.sales_reps (
  owner_id, is_default, full_name, nome_pdf, cargo, email, phone,
  phone_comercial, whatsapp, avatar_url, signature_url, logo_url,
  empresa_nome, endereco, cep, cidade, estado, site, instagram,
  facebook, linkedin, mensagem_padrao, pix_key
)
SELECT
  p.id, true, p.full_name, p.nome_pdf, p.cargo, p.email, p.phone,
  p.phone_comercial, p.whatsapp, p.avatar_url, p.signature_url, p.logo_url,
  p.empresa_nome, p.endereco, p.cep, p.cidade, p.estado, p.site, p.instagram,
  p.facebook, p.linkedin, p.mensagem_padrao, p.pix_key
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.sales_reps sr WHERE sr.owner_id = p.id);

-- 4) Update create_quote_with_items to accept sales_rep_id
CREATE OR REPLACE FUNCTION public.create_quote_with_items(_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _quote_id uuid;
  _user_id uuid := auth.uid();
  _item jsonb;
  _items jsonb := COALESCE(_payload->'items', '[]'::jsonb);
  _subtotal numeric := 0;
  _desconto_percentual numeric := COALESCE((_payload->>'desconto_percentual')::numeric, 0);
  _desconto_valor numeric := COALESCE((_payload->>'desconto_valor')::numeric, 0);
  _frete numeric := COALESCE((_payload->>'frete')::numeric, 0);
  _line_total numeric;
  _snapshot jsonb;
  _sales_rep_id uuid := NULLIF(_payload->>'sales_rep_id','')::uuid;
  _sr public.sales_reps%ROWTYPE;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada';
  END IF;
  IF COALESCE(_payload->>'client_id', '') = '' THEN
    RAISE EXCEPTION 'Selecione um cliente';
  END IF;
  IF jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Adicione ao menos um item';
  END IF;

  FOR _item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    IF trim(COALESCE(_item->>'descricao', '')) = '' THEN
      RAISE EXCEPTION 'Informe o nome do item';
    END IF;
    IF COALESCE((_item->>'quantidade')::numeric, 0) <= 0 THEN
      RAISE EXCEPTION 'A quantidade dos itens deve ser maior que zero';
    END IF;
    IF COALESCE((_item->>'preco_unitario')::numeric, 0) < 0 THEN
      RAISE EXCEPTION 'O preço unitário não pode ser negativo';
    END IF;

    _line_total := COALESCE((_item->>'quantidade')::numeric, 0) * COALESCE((_item->>'preco_unitario')::numeric, 0);
    _line_total := _line_total - (_line_total * COALESCE((_item->>'desconto_percentual')::numeric, 0) / 100);
    _subtotal := _subtotal + _line_total;
  END LOOP;

  IF _sales_rep_id IS NOT NULL THEN
    SELECT * INTO _sr FROM public.sales_reps WHERE id = _sales_rep_id AND owner_id = _user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Vendedor inválido';
    END IF;
    _snapshot := to_jsonb(_sr);
  ELSE
    SELECT to_jsonb(p.*) INTO _snapshot FROM public.profiles p WHERE p.id = _user_id;
  END IF;

  INSERT INTO public.quotes (
    client_id, machine_id, vendedor_id, condicao_pagamento, tipo_frete, prazo_entrega,
    validade_dias, desconto_percentual, desconto_valor, frete, subtotal, total, observacoes, pdf_template,
    vendedor_snapshot, sales_rep_id
  ) VALUES (
    (_payload->>'client_id')::uuid,
    NULLIF(_payload->>'machine_id', '')::uuid,
    _user_id,
    NULLIF(trim(COALESCE(_payload->>'condicao_pagamento', '')), ''),
    NULLIF(trim(COALESCE(_payload->>'tipo_frete', 'SEM FRETE')), ''),
    NULLIF(trim(COALESCE(_payload->>'prazo_entrega', '')), ''),
    COALESCE((_payload->>'validade_dias')::integer, 7),
    _desconto_percentual,
    _desconto_valor,
    _frete,
    _subtotal,
    GREATEST(0, _subtotal - (_subtotal * _desconto_percentual / 100) - _desconto_valor + _frete),
    NULLIF(trim(COALESCE(_payload->>'observacoes', '')), ''),
    COALESCE(NULLIF(_payload->>'pdf_template', ''), 'azul'),
    _snapshot,
    _sales_rep_id
  ) RETURNING id INTO _quote_id;

  FOR _item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    _line_total := COALESCE((_item->>'quantidade')::numeric, 0) * COALESCE((_item->>'preco_unitario')::numeric, 0);
    _line_total := _line_total - (_line_total * COALESCE((_item->>'desconto_percentual')::numeric, 0) / 100);

    INSERT INTO public.quote_items (
      quote_id, product_id, codigo, descricao, quantidade, preco_unitario, desconto_percentual, total, ordem
    ) VALUES (
      _quote_id,
      NULLIF(_item->>'product_id', '')::uuid,
      NULLIF(trim(COALESCE(_item->>'codigo', '')), ''),
      trim(COALESCE(_item->>'descricao', '')),
      COALESCE((_item->>'quantidade')::numeric, 0),
      COALESCE((_item->>'preco_unitario')::numeric, 0),
      COALESCE((_item->>'desconto_percentual')::numeric, 0),
      _line_total,
      COALESCE((_item->>'ordem')::integer, 0)
    );
  END LOOP;

  RETURN _quote_id;
END;
$function$;

-- 5) Update update_quote_with_items to accept sales_rep_id
CREATE OR REPLACE FUNCTION public.update_quote_with_items(_quote_id uuid, _payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _owner_id uuid;
  _status public.quote_status;
  _item jsonb;
  _items jsonb := COALESCE(_payload->'items', '[]'::jsonb);
  _subtotal numeric := 0;
  _desconto_percentual numeric := COALESCE((_payload->>'desconto_percentual')::numeric, 0);
  _desconto_valor numeric := COALESCE((_payload->>'desconto_valor')::numeric, 0);
  _frete numeric := COALESCE((_payload->>'frete')::numeric, 0);
  _line_total numeric;
  _sales_rep_id uuid := NULLIF(_payload->>'sales_rep_id','')::uuid;
  _sr public.sales_reps%ROWTYPE;
  _snapshot jsonb;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada';
  END IF;

  SELECT vendedor_id, status INTO _owner_id, _status FROM public.quotes WHERE id = _quote_id;

  IF _owner_id IS NULL THEN
    RAISE EXCEPTION 'Orçamento não encontrado';
  END IF;
  IF _owner_id <> _user_id THEN
    RAISE EXCEPTION 'Você só pode editar orçamentos criados por você';
  END IF;
  IF _status = 'aprovado' THEN
    RAISE EXCEPTION 'Orçamentos aprovados não podem ser editados';
  END IF;
  IF COALESCE(_payload->>'client_id', '') = '' THEN
    RAISE EXCEPTION 'Selecione um cliente';
  END IF;
  IF jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Adicione ao menos um item';
  END IF;

  FOR _item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    IF trim(COALESCE(_item->>'descricao', '')) = '' THEN
      RAISE EXCEPTION 'Informe o nome do item';
    END IF;
    IF COALESCE((_item->>'quantidade')::numeric, 0) <= 0 THEN
      RAISE EXCEPTION 'A quantidade dos itens deve ser maior que zero';
    END IF;
    IF COALESCE((_item->>'preco_unitario')::numeric, 0) < 0 THEN
      RAISE EXCEPTION 'O preço unitário não pode ser negativo';
    END IF;

    _line_total := COALESCE((_item->>'quantidade')::numeric, 0) * COALESCE((_item->>'preco_unitario')::numeric, 0);
    _line_total := _line_total - (_line_total * COALESCE((_item->>'desconto_percentual')::numeric, 0) / 100);
    _subtotal := _subtotal + _line_total;
  END LOOP;

  IF _sales_rep_id IS NOT NULL THEN
    SELECT * INTO _sr FROM public.sales_reps WHERE id = _sales_rep_id AND owner_id = _user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Vendedor inválido';
    END IF;
    _snapshot := to_jsonb(_sr);
  ELSE
    SELECT to_jsonb(p.*) INTO _snapshot FROM public.profiles p WHERE p.id = _user_id;
  END IF;

  UPDATE public.quotes SET
    client_id = (_payload->>'client_id')::uuid,
    machine_id = NULLIF(_payload->>'machine_id', '')::uuid,
    condicao_pagamento = NULLIF(trim(COALESCE(_payload->>'condicao_pagamento', '')), ''),
    tipo_frete = NULLIF(trim(COALESCE(_payload->>'tipo_frete', 'SEM FRETE')), ''),
    prazo_entrega = NULLIF(trim(COALESCE(_payload->>'prazo_entrega', '')), ''),
    validade_dias = COALESCE((_payload->>'validade_dias')::integer, 7),
    desconto_percentual = _desconto_percentual,
    desconto_valor = _desconto_valor,
    frete = _frete,
    subtotal = _subtotal,
    total = GREATEST(0, _subtotal - (_subtotal * _desconto_percentual / 100) - _desconto_valor + _frete),
    observacoes = NULLIF(trim(COALESCE(_payload->>'observacoes', '')), ''),
    pdf_template = COALESCE(NULLIF(_payload->>'pdf_template', ''), 'azul'),
    vendedor_snapshot = _snapshot,
    sales_rep_id = _sales_rep_id
  WHERE id = _quote_id;

  DELETE FROM public.quote_items WHERE quote_id = _quote_id;

  FOR _item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    _line_total := COALESCE((_item->>'quantidade')::numeric, 0) * COALESCE((_item->>'preco_unitario')::numeric, 0);
    _line_total := _line_total - (_line_total * COALESCE((_item->>'desconto_percentual')::numeric, 0) / 100);

    INSERT INTO public.quote_items (
      quote_id, product_id, codigo, descricao, quantidade, preco_unitario, desconto_percentual, total, ordem
    ) VALUES (
      _quote_id,
      NULLIF(_item->>'product_id', '')::uuid,
      NULLIF(trim(COALESCE(_item->>'codigo', '')), ''),
      trim(COALESCE(_item->>'descricao', '')),
      COALESCE((_item->>'quantidade')::numeric, 0),
      COALESCE((_item->>'preco_unitario')::numeric, 0),
      COALESCE((_item->>'desconto_percentual')::numeric, 0),
      _line_total,
      COALESCE((_item->>'ordem')::integer, 0)
    );
  END LOOP;

  RETURN _quote_id;
END;
$function$;
