ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS pdf_template_padrao text NOT NULL DEFAULT 'azul';

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE INDEX IF NOT EXISTS quotes_deleted_at_idx ON public.quotes (deleted_at);

CREATE OR REPLACE FUNCTION public.purge_trashed_quotes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count integer;
BEGIN
  WITH gone AS (
    DELETE FROM public.quotes
    WHERE deleted_at IS NOT NULL
      AND deleted_at < now() - interval '30 days'
    RETURNING id
  )
  SELECT count(*) INTO _count FROM gone;
  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_trashed_quotes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_trashed_quotes() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge-trashed-quotes')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-trashed-quotes');
    PERFORM cron.schedule('purge-trashed-quotes', '30 4 * * *', 'SELECT public.purge_trashed_quotes();');
  END IF;
END;
$$;

-- Metas mensais privadas: cada vendedor só vê a própria meta
DROP POLICY IF EXISTS "Staff view sales targets" ON public.sales_targets;
CREATE POLICY "Own or admin view sales targets"
ON public.sales_targets FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role));