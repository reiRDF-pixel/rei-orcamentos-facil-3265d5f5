DELETE FROM public.quotes q
WHERE NOT EXISTS (
  SELECT 1 FROM public.quote_items qi WHERE qi.quote_id = q.id
);