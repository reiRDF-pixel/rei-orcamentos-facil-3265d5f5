-- ============ AUDIT LOG ============
CREATE TABLE public.quote_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL,
  quote_numero integer,
  user_id uuid,
  user_name text,
  action text NOT NULL,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX quote_audit_log_quote_idx ON public.quote_audit_log (quote_id, created_at DESC);

GRANT SELECT ON public.quote_audit_log TO authenticated;
GRANT ALL ON public.quote_audit_log TO service_role;

ALTER TABLE public.quote_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view quote audit log"
ON public.quote_audit_log FOR SELECT TO authenticated
USING (private.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_quote_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    'sales_rep_id','Vendedor responsável'
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
$$;

CREATE TRIGGER quotes_audit_ins AFTER INSERT ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.log_quote_change();
CREATE TRIGGER quotes_audit_upd AFTER UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.log_quote_change();
CREATE TRIGGER quotes_audit_del AFTER DELETE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.log_quote_change();

CREATE OR REPLACE FUNCTION public.log_quote_items_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _name text;
  _qid uuid := COALESCE(NEW.quote_id, OLD.quote_id);
  _numero integer;
  _label text;
  _action text;
BEGIN
  SELECT numero INTO _numero FROM public.quotes WHERE id = _qid;
  IF _numero IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(NULLIF(p.nome_pdf,''), NULLIF(p.full_name,''), p.email)
    INTO _name FROM public.profiles p WHERE p.id = _uid;

  IF TG_OP = 'INSERT' THEN
    _action := 'item_added';
    _label := COALESCE(NULLIF(NEW.descricao,''), NEW.codigo, NEW.codigo_interno, 'Item');
  ELSE
    _action := 'item_removed';
    _label := COALESCE(NULLIF(OLD.descricao,''), OLD.codigo, OLD.codigo_interno, 'Item');
  END IF;

  INSERT INTO public.quote_audit_log (quote_id, quote_numero, user_id, user_name, action, changes)
  VALUES (_qid, _numero, _uid, _name, _action,
    jsonb_build_array(jsonb_build_object('field','item','label',_label,
      'from', CASE WHEN TG_OP='DELETE' THEN _label ELSE NULL END,
      'to', CASE WHEN TG_OP='INSERT' THEN _label ELSE NULL END)));

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER quote_items_audit_ins AFTER INSERT ON public.quote_items
FOR EACH ROW EXECUTE FUNCTION public.log_quote_items_change();
CREATE TRIGGER quote_items_audit_del AFTER DELETE ON public.quote_items
FOR EACH ROW EXECUTE FUNCTION public.log_quote_items_change();

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  quote_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own notifications"
ON public.notifications FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_quote_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _title text;
  _client text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('aprovado','recusado','expirado') THEN RETURN NEW; END IF;

  SELECT COALESCE(NULLIF(c.nome_fantasia,''), c.razao_social) INTO _client
    FROM public.clients c WHERE c.id = NEW.client_id;

  _title := CASE NEW.status
    WHEN 'aprovado' THEN 'Orçamento aprovado'
    WHEN 'recusado' THEN 'Orçamento recusado'
    ELSE 'Orçamento expirado' END;

  INSERT INTO public.notifications (user_id, type, title, body, quote_id)
  VALUES (
    NEW.vendedor_id,
    NEW.status::text,
    _title,
    'Orçamento #' || lpad(NEW.numero::text, 5, '0') || COALESCE(' · ' || _client, ''),
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER quotes_notify_status AFTER UPDATE OF status ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.notify_quote_status();

-- ============ DUPLICATE QUOTE ============
CREATE OR REPLACE FUNCTION public.duplicate_quote(_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _new_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Sessão expirada'; END IF;

  INSERT INTO public.quotes (
    client_id, machine_id, vendedor_id, status, condicao_pagamento, tipo_frete,
    prazo_entrega, validade_dias, desconto_percentual, desconto_valor, frete,
    subtotal, total, observacoes, pdf_template, vendedor_snapshot, sales_rep_id
  )
  SELECT
    q.client_id, q.machine_id, _uid, 'rascunho', q.condicao_pagamento, q.tipo_frete,
    q.prazo_entrega, q.validade_dias, q.desconto_percentual, q.desconto_valor, q.frete,
    q.subtotal, q.total, q.observacoes, q.pdf_template,
    COALESCE((SELECT to_jsonb(p.*) FROM public.profiles p WHERE p.id = _uid), q.vendedor_snapshot),
    CASE WHEN EXISTS (SELECT 1 FROM public.sales_reps sr WHERE sr.id = q.sales_rep_id AND sr.owner_id = _uid)
      THEN q.sales_rep_id ELSE NULL END
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
$$;

REVOKE ALL ON FUNCTION public.duplicate_quote(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.duplicate_quote(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.log_quote_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_quote_items_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_quote_status() FROM PUBLIC, anon, authenticated;