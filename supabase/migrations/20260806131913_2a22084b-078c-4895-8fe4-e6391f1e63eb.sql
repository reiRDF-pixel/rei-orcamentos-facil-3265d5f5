ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS solicitante text;

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
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Sessão expirada'; END IF;
  IF COALESCE(_payload->>'client_id', '') = '' THEN RAISE EXCEPTION 'Selecione um cliente'; END IF;
  IF jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Adicione ao menos um item'; END IF;

  FOR _item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    IF COALESCE((_item->>'quantidade')::numeric, 0) <= 0 THEN RAISE EXCEPTION 'A quantidade dos itens deve ser maior que zero'; END IF;
    IF COALESCE((_item->>'preco_unitario')::numeric, 0) < 0 THEN RAISE EXCEPTION 'O preço unitário não pode ser negativo'; END IF;
    _line_total := COALESCE((_item->>'quantidade')::numeric, 0) * COALESCE((_item->>'preco_unitario')::numeric, 0);
    _line_total := _line_total - (_line_total * COALESCE((_item->>'desconto_percentual')::numeric, 0) / 100);
    _subtotal := _subtotal + _line_total;
  END LOOP;

  IF _sales_rep_id IS NOT NULL THEN
    SELECT * INTO _sr FROM public.sales_reps WHERE id = _sales_rep_id AND owner_id = _user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Vendedor inválido'; END IF;
    _snapshot := to_jsonb(_sr);
  ELSE
    SELECT to_jsonb(p.*) INTO _snapshot FROM public.profiles p WHERE p.id = _user_id;
  END IF;

  INSERT INTO public.quotes (
    client_id, machine_id, vendedor_id, condicao_pagamento, tipo_frete, prazo_entrega,
    validade_dias, desconto_percentual, desconto_valor, frete, subtotal, total, observacoes, pdf_template,
    vendedor_snapshot, sales_rep_id, solicitante
  ) VALUES (
    (_payload->>'client_id')::uuid,
    NULLIF(_payload->>'machine_id', '')::uuid,
    _user_id,
    NULLIF(trim(COALESCE(_payload->>'condicao_pagamento', '')), ''),
    NULLIF(trim(COALESCE(_payload->>'tipo_frete', 'SEM FRETE')), ''),
    NULLIF(trim(COALESCE(_payload->>'prazo_entrega', '')), ''),
    COALESCE((_payload->>'validade_dias')::integer, 7),
    _desconto_percentual, _desconto_valor, _frete, _subtotal,
    GREATEST(0, _subtotal - (_subtotal * _desconto_percentual / 100) - _desconto_valor + _frete),
    NULLIF(trim(COALESCE(_payload->>'observacoes', '')), ''),
    COALESCE(NULLIF(_payload->>'pdf_template', ''), 'azul'),
    _snapshot, _sales_rep_id,
    NULLIF(trim(COALESCE(_payload->>'solicitante', '')), '')
  ) RETURNING id INTO _quote_id;

  FOR _item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    _line_total := COALESCE((_item->>'quantidade')::numeric, 0) * COALESCE((_item->>'preco_unitario')::numeric, 0);
    _line_total := _line_total - (_line_total * COALESCE((_item->>'desconto_percentual')::numeric, 0) / 100);
    INSERT INTO public.quote_items (
      quote_id, product_id, codigo, codigo_interno, marca, descricao, quantidade, preco_unitario, desconto_percentual, total, ordem
    ) VALUES (
      _quote_id,
      NULLIF(_item->>'product_id', '')::uuid,
      NULLIF(trim(COALESCE(_item->>'codigo', '')), ''),
      NULLIF(trim(COALESCE(_item->>'codigo_interno', '')), ''),
      NULLIF(trim(COALESCE(_item->>'marca', '')), ''),
      COALESCE(trim(COALESCE(_item->>'descricao', '')), ''),
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
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Sessão expirada'; END IF;
  SELECT vendedor_id, status INTO _owner_id, _status FROM public.quotes WHERE id = _quote_id;
  IF _owner_id IS NULL THEN RAISE EXCEPTION 'Orçamento não encontrado'; END IF;
  IF _owner_id <> _user_id THEN RAISE EXCEPTION 'Você só pode editar orçamentos criados por você'; END IF;
  IF _status = 'aprovado' THEN RAISE EXCEPTION 'Orçamentos aprovados não podem ser editados'; END IF;
  IF COALESCE(_payload->>'client_id', '') = '' THEN RAISE EXCEPTION 'Selecione um cliente'; END IF;
  IF jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Adicione ao menos um item'; END IF;

  FOR _item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    IF COALESCE((_item->>'quantidade')::numeric, 0) <= 0 THEN RAISE EXCEPTION 'A quantidade dos itens deve ser maior que zero'; END IF;
    IF COALESCE((_item->>'preco_unitario')::numeric, 0) < 0 THEN RAISE EXCEPTION 'O preço unitário não pode ser negativo'; END IF;
    _line_total := COALESCE((_item->>'quantidade')::numeric, 0) * COALESCE((_item->>'preco_unitario')::numeric, 0);
    _line_total := _line_total - (_line_total * COALESCE((_item->>'desconto_percentual')::numeric, 0) / 100);
    _subtotal := _subtotal + _line_total;
  END LOOP;

  IF _sales_rep_id IS NOT NULL THEN
    SELECT * INTO _sr FROM public.sales_reps WHERE id = _sales_rep_id AND owner_id = _user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Vendedor inválido'; END IF;
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
    sales_rep_id = _sales_rep_id,
    solicitante = NULLIF(trim(COALESCE(_payload->>'solicitante', '')), ''),
    updated_at = now()
  WHERE id = _quote_id;

  DELETE FROM public.quote_items WHERE quote_id = _quote_id;

  FOR _item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    _line_total := COALESCE((_item->>'quantidade')::numeric, 0) * COALESCE((_item->>'preco_unitario')::numeric, 0);
    _line_total := _line_total - (_line_total * COALESCE((_item->>'desconto_percentual')::numeric, 0) / 100);
    INSERT INTO public.quote_items (
      quote_id, product_id, codigo, codigo_interno, marca, descricao, quantidade, preco_unitario, desconto_percentual, total, ordem
    ) VALUES (
      _quote_id,
      NULLIF(_item->>'product_id', '')::uuid,
      NULLIF(trim(COALESCE(_item->>'codigo', '')), ''),
      NULLIF(trim(COALESCE(_item->>'codigo_interno', '')), ''),
      NULLIF(trim(COALESCE(_item->>'marca', '')), ''),
      COALESCE(trim(COALESCE(_item->>'descricao', '')), ''),
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

-- duplicate_quote should carry the solicitante over
CREATE OR REPLACE FUNCTION public.duplicate_quote(_quote_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _new_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Sessão expirada'; END IF;

  INSERT INTO public.quotes (
    client_id, machine_id, vendedor_id, status, condicao_pagamento, tipo_frete,
    prazo_entrega, validade_dias, desconto_percentual, desconto_valor, frete,
    subtotal, total, observacoes, pdf_template, vendedor_snapshot, sales_rep_id, solicitante
  )
  SELECT
    q.client_id, q.machine_id, _uid, 'rascunho', q.condicao_pagamento, q.tipo_frete,
    q.prazo_entrega, q.validade_dias, q.desconto_percentual, q.desconto_valor, q.frete,
    q.subtotal, q.total, q.observacoes, q.pdf_template,
    COALESCE((SELECT to_jsonb(p.*) FROM public.profiles p WHERE p.id = _uid), q.vendedor_snapshot),
    CASE WHEN EXISTS (SELECT 1 FROM public.sales_reps sr WHERE sr.id = q.sales_rep_id AND sr.owner_id = _uid)
      THEN q.sales_rep_id ELSE NULL END,
    q.solicitante
  FROM public.quotes q
  WHERE q.id = _quote_id
  RETURNING id INTO _new_id;

  IF _new_id IS NULL THEN RAISE EXCEPTION 'Orçamento não encontrado'; END IF;

  INSERT INTO public.quote_items (
    quote_id, product_id, codigo, codigo_interno, marca, descricao,
    quantidade, preco_unitario, desconto_percentual, total, ordem
  )
  SELECT _new_id, qi.product_id, qi.codigo, qi.codigo_interno, qi.marca, qi.descricao,
    qi.quantidade, qi.preco_unitario, qi.desconto_percentual, qi.total, qi.ordem
  FROM public.quote_items qi WHERE qi.quote_id = _quote_id;

  RETURN _new_id;
END;
$function$;

-- audit log: recognise solicitante
CREATE OR REPLACE FUNCTION public.log_quote_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _name text;
  _changes jsonb := '[]'::jsonb;
  _labels jsonb := jsonb_build_object(
    'client_id','Cliente','machine_id','Máquina','status','Status',
    'condicao_pagamento','Condição de pagamento','tipo_frete','Tipo de frete',
    'prazo_entrega','Prazo de entrega','validade_dias','Validade (dias)',
    'desconto_percentual','Desconto (%)','desconto_valor','Desconto (R$)',
    'frete','Frete','subtotal','Subtotal','total','Total',
    'observacoes','Observações','pdf_template','Template do PDF',
    'sales_rep_id','Vendedor responsável','solicitante','Solicitante'
  );
  _k text;
  _old text;
  _new text;
BEGIN
  SELECT COALESCE(NULLIF(p.nome_pdf,''), NULLIF(p.full_name,''), p.email)
    INTO _name FROM public.profiles p WHERE p.id = _uid;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.quote_audit_log (quote_id, quote_numero, user_id, user_name, action, changes)
    VALUES (NEW.id, NEW.numero, _uid, _name, 'created', '[]'::jsonb);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.quote_audit_log (quote_id, quote_numero, user_id, user_name, action, changes)
    VALUES (OLD.id, OLD.numero, _uid, _name, 'deleted', '[]'::jsonb);
    RETURN OLD;
  END IF;

  FOR _k IN SELECT jsonb_object_keys(_labels) LOOP
    _old := to_jsonb(OLD) ->> _k;
    _new := to_jsonb(NEW) ->> _k;
    IF COALESCE(_old,'') <> COALESCE(_new,'') THEN
      _changes := _changes || jsonb_build_array(jsonb_build_object(
        'field', _k, 'label', _labels ->> _k, 'from', _old, 'to', _new
      ));
    END IF;
  END LOOP;

  IF jsonb_array_length(_changes) > 0 THEN
    INSERT INTO public.quote_audit_log (quote_id, quote_numero, user_id, user_name, action, changes)
    VALUES (NEW.id, NEW.numero, _uid, _name, 'updated', _changes);
  END IF;

  RETURN NEW;
END;
$function$;

-- daily expiration routine
CREATE OR REPLACE FUNCTION public.expire_overdue_quotes()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _count integer;
BEGIN
  WITH expired AS (
    UPDATE public.quotes
    SET status = 'expirado', updated_at = now()
    WHERE status = 'enviado'
      AND (data_emissao + (validade_dias || ' days')::interval)::date < CURRENT_DATE
    RETURNING id
  )
  SELECT count(*) INTO _count FROM expired;
  RETURN _count;
END;
$function$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('expire-overdue-quotes')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-overdue-quotes');

SELECT cron.schedule(
  'expire-overdue-quotes',
  '10 3 * * *',
  $$SELECT public.expire_overdue_quotes();$$
);