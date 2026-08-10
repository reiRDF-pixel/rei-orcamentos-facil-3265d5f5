import type { Tables } from "@/integrations/supabase/types";

export type QuoteRow = Tables<"quotes">;
export type QuoteItemRow = Tables<"quote_items">;

export interface QuoteItemDraft {
  id?: string;
  product_id: string | null;
  /** Código do cliente (impresso no PDF enviado ao cliente). */
  codigo: string | null;
  /** Nosso código interno do produto (aparece apenas no PDF interno). */
  codigo_interno: string | null;
  marca: string | null;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  desconto_percentual: number;
  ordem: number;
}

/** Converte texto digitado em quantidade exata (aceita vírgula, sem lixo de ponto flutuante). */
export function parseQuantity(raw: string | number): number {
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 1000) / 1000;
}

/** Converte texto digitado em valor monetário com 2 casas exatas. */
export function parseMoney(raw: string | number): number {
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}


export function itemTotal(i: QuoteItemDraft): number {
  const gross = i.quantidade * i.preco_unitario;
  return gross - gross * (i.desconto_percentual / 100);
}

export function quoteTotals(
  items: QuoteItemDraft[],
  descontoPct: number,
  descontoValor: number,
  frete: number,
) {
  const subtotal = items.reduce((s, i) => s + itemTotal(i), 0);
  const total = subtotal - subtotal * (descontoPct / 100) - descontoValor + frete;
  return { subtotal, total: Math.max(0, total) };
}
