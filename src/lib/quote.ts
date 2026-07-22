import type { Tables } from "@/integrations/supabase/types";

export type QuoteRow = Tables<"quotes">;
export type QuoteItemRow = Tables<"quote_items">;

export interface QuoteItemDraft {
  id?: string;
  product_id: string | null;
  codigo: string | null;
  marca: string | null;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  desconto_percentual: number;
  ordem: number;
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
