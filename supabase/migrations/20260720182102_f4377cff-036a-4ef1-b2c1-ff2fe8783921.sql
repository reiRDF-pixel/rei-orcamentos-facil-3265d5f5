CREATE OR REPLACE FUNCTION public.create_quote_with_items(_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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

  INSERT INTO public.quotes (
    client_id, machine_id, vendedor_id, condicao_pagamento, tipo_frete, prazo_entrega,
    validade_dias, desconto_percentual, desconto_valor, frete, subtotal, total, observacoes, pdf_template
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
    COALESCE(NULLIF(_payload->>'pdf_template', ''), 'azul')
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
$$;

CREATE OR REPLACE FUNCTION public.update_quote_with_items(_quote_id uuid, _payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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
    pdf_template = COALESCE(NULLIF(_payload->>'pdf_template', ''), 'azul')
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
$$;

REVOKE ALL ON FUNCTION public.create_quote_with_items(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_quote_with_items(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_quote_with_items(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_quote_with_items(uuid, jsonb) TO authenticated;