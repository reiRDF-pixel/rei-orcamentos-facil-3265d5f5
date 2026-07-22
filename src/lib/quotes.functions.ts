import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type QuoteItemDraft } from "@/lib/quote";
import type { PdfTemplateId } from "@/lib/pdf-templates";

type RpcError = { message: string };
type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: RpcError | null }>;
};

type QuotePayload = {
  client_id: string;
  machine_id: string | null;
  sales_rep_id: string | null;
  condicao_pagamento: string;
  tipo_frete: string;
  prazo_entrega: string;
  validade_dias: number;
  desconto_percentual: number;
  desconto_valor: number;
  frete: number;
  observacoes: string;
  pdf_template: PdfTemplateId;
  items: QuoteItemDraft[];
};

type UpdateQuotePayload = QuotePayload & { id: string };

function asFiniteNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeQuotePayload(input: QuotePayload): QuotePayload {
  if (!input.client_id) throw new Error("Selecione um cliente");

  const items = (input.items ?? [])
    .map((item, idx) => ({
      product_id: item.product_id || null,
      codigo: item.codigo?.trim() || null,
      marca: item.marca?.trim() || null,
      descricao: item.descricao?.trim() ?? "",
      quantidade: asFiniteNumber(item.quantidade),
      preco_unitario: asFiniteNumber(item.preco_unitario),
      desconto_percentual: asFiniteNumber(item.desconto_percentual),
      ordem: idx,
    }))
    .filter((item) => item.descricao.length > 0);

  if (items.length === 0) throw new Error("Adicione ao menos um item");
  if (items.some((item) => item.quantidade <= 0)) {
    throw new Error("A quantidade dos itens deve ser maior que zero");
  }
  if (items.some((item) => item.preco_unitario < 0)) {
    throw new Error("O preço unitário não pode ser negativo");
  }

  return {
    client_id: input.client_id,
    machine_id: input.machine_id || null,
    sales_rep_id: input.sales_rep_id || null,
    condicao_pagamento: input.condicao_pagamento?.trim() ?? "",
    tipo_frete: input.tipo_frete?.trim() || "SEM FRETE",
    prazo_entrega: input.prazo_entrega?.trim() ?? "",
    validade_dias: asFiniteNumber(input.validade_dias, 7),
    desconto_percentual: asFiniteNumber(input.desconto_percentual),
    desconto_valor: asFiniteNumber(input.desconto_valor),
    frete: asFiniteNumber(input.frete),
    observacoes: input.observacoes?.trim() ?? "",
    pdf_template: input.pdf_template || "azul",
    items,
  };
}

function normalizeUpdatePayload(input: UpdateQuotePayload): UpdateQuotePayload {
  if (!input.id) throw new Error("Orçamento inválido");
  return { id: input.id, ...normalizeQuotePayload(input) };
}

export const createQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: QuotePayload) => normalizeQuotePayload(input))
  .handler(async ({ data, context }) => {
    const { data: quoteId, error } = await (context.supabase as unknown as RpcClient).rpc(
      "create_quote_with_items",
      { _payload: data },
    );
    if (error) throw new Error(error.message);
    if (!quoteId) throw new Error("Não foi possível criar o orçamento");
    return { id: String(quoteId) };
  });

export const updateQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: UpdateQuotePayload) => normalizeUpdatePayload(input))
  .handler(async ({ data, context }) => {
    const { id, ...payload } = data;
    const { data: quoteId, error } = await (context.supabase as unknown as RpcClient).rpc(
      "update_quote_with_items",
      { _quote_id: id, _payload: payload },
    );
    if (error) throw new Error(error.message);
    return { id: String(quoteId ?? id) };
  });

export const getPublicQuote = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: quote, error } = await supabaseAdmin.rpc("get_public_quote", {
      _quote_id: data.id,
    });
    if (error) throw new Error(error.message);
    return quote;
  });
