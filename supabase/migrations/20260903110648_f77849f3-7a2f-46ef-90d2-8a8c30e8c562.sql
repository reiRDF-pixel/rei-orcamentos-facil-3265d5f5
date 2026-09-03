ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS formas_pagamento text[] NOT NULL DEFAULT ARRAY['À VISTA','PIX','BOLETO 28 DIAS','CARTÃO DE CRÉDITO']::text[];