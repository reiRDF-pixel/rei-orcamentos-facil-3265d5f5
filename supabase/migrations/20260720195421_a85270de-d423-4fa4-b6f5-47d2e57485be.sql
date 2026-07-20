
-- 1. Extend profiles with vendor-specific fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nome_pdf text,
  ADD COLUMN IF NOT EXISTS cargo text,
  ADD COLUMN IF NOT EXISTS phone_comercial text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS signature_url text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS empresa_nome text,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS site text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS facebook text,
  ADD COLUMN IF NOT EXISTS linkedin text,
  ADD COLUMN IF NOT EXISTS mensagem_padrao text,
  ADD COLUMN IF NOT EXISTS observacao_padrao text,
  ADD COLUMN IF NOT EXISTS validade_padrao_dias integer,
  ADD COLUMN IF NOT EXISTS prazo_entrega_padrao text,
  ADD COLUMN IF NOT EXISTS condicao_pagamento_padrao text,
  ADD COLUMN IF NOT EXISTS pix_key text;

-- 2. Snapshot column on quotes
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS vendedor_snapshot jsonb;

-- 3. Update create_quote_with_items to snapshot vendedor profile
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

  SELECT to_jsonb(p.*) INTO _snapshot FROM public.profiles p WHERE p.id = _user_id;

  INSERT INTO public.quotes (
    client_id, machine_id, vendedor_id, condicao_pagamento, tipo_frete, prazo_entrega,
    validade_dias, desconto_percentual, desconto_valor, frete, subtotal, total, observacoes, pdf_template,
    vendedor_snapshot
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
    _snapshot
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

-- 4. Update get_public_quote to return vendedor snapshot
CREATE OR REPLACE FUNCTION public.get_public_quote(_quote_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'quote', to_jsonb(q.*),
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
  WHERE q.id = _quote_id;

  RETURN result;
END; $function$;
