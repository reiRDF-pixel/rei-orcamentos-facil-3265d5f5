import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { QuoteItemDraft } from "@/lib/quote";
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

export const createQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: QuotePayload) => input)
  .handler(async ({ data, context }) => {
    if (!data.client_id) throw new Error("Selecione um cliente");
    if (!data.items?.length) throw new Error("Adicione ao menos um item");
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
  .inputValidator((input: UpdateQuotePayload) => input)
  .handler(async ({ data, context }) => {
    if (!data.id) throw new Error("Orçamento inválido");
    const { id, ...payload } = data;
    const { data: quoteId, error } = await (context.supabase as unknown as RpcClient).rpc(
      "update_quote_with_items",
      { _quote_id: id, _payload: payload },
    );
    if (error) throw new Error(error.message);
    return { id: String(quoteId ?? id) };
  });

export const duplicateQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Orçamento inválido");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    const { data: newId, error } = await (context.supabase as unknown as RpcClient).rpc(
      "duplicate_quote",
      { _quote_id: data.id },
    );
    if (error) throw new Error(error.message);
    if (!newId) throw new Error("Não foi possível duplicar o orçamento");
    return { id: String(newId) };
  });

export const getPublicQuote = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => {
    if (!input?.token) throw new Error("Link inválido");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: quote, error } = await supabaseAdmin.rpc("get_public_quote_by_token", {
      _token: data.token,
    });
    if (error) throw new Error(error.message);
    return quote;
  });

export const respondPublicQuote = createServerFn({ method: "POST" })
  .inputValidator((input: {
    token: string;
    decision: "aprovado" | "recusado";
    name?: string;
    note?: string;
  }) => {
    if (!input?.token) throw new Error("Link inválido");
    if (input.decision !== "aprovado" && input.decision !== "recusado") {
      throw new Error("Resposta inválida");
    }
    return {
      token: input.token,
      decision: input.decision,
      name: input.name?.trim().slice(0, 120) || null,
      note: input.note?.trim().slice(0, 1000) || null,
    };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: quote, error: readError } = await supabaseAdmin
      .from("quotes")
      .select("id,status,data_emissao,validade_dias,public_token_revoked_at")
      .eq("public_token", data.token)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!quote || quote.public_token_revoked_at) throw new Error("Link inválido ou revogado");
    if (quote.status !== "enviado") throw new Error("Este orçamento já recebeu uma resposta");

    const expiresAt = new Date(`${quote.data_emissao}T23:59:59`);
    expiresAt.setDate(expiresAt.getDate() + quote.validade_dias);
    if (expiresAt.getTime() < Date.now()) {
      await supabaseAdmin.from("quotes").update({ status: "expirado" }).eq("id", quote.id);
      throw new Error("Este orçamento expirou");
    }

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("quotes")
      .update({
        status: data.decision,
        approved_at: data.decision === "aprovado" ? now : null,
        client_decision_at: now,
        client_decision_by: data.name,
        client_decision_note: data.note,
      })
      .eq("id", quote.id)
      .eq("status", "enviado");
    if (error) throw new Error(error.message);
    return { status: data.decision, decidedAt: now };
  });
