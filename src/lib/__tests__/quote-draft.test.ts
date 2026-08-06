import { describe, it, expect, beforeEach } from "vitest";

import { saveQuoteDraft, loadQuoteDraft, clearQuoteDraft } from "@/lib/quote-draft";
import type { QuoteFormState } from "@/components/quote-editor";

const state: QuoteFormState = {
  client_id: "c1",
  machine_id: null,
  sales_rep_id: null,
  condicao_pagamento: "30 dias",
  solicitante: "",
  tipo_frete: "SEM FRETE",
  prazo_entrega: "",
  validade_dias: 7,
  desconto_percentual: 0,
  desconto_valor: 0,
  frete: 0,
  observacoes: "",
  pdf_template: "azul",
  items: [
    {
      product_id: null,
      codigo: "W1160",
      codigo_interno: null,
      marca: "MANN",
      descricao: "Filtro",
      quantidade: 2,
      preco_unitario: 50,
      desconto_percentual: 0,
      ordem: 0,
    },
  ],
};

describe("auto-save do rascunho", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => void store.set(k, v),
          removeItem: (k: string) => void store.delete(k),
        },
      },
    });
  });

  it("salva e recarrega o rascunho", () => {
    saveQuoteDraft("novo", state);
    const draft = loadQuoteDraft("novo");
    expect(draft?.state.client_id).toBe("c1");
    expect(draft?.state.items).toHaveLength(1);
  });

  it("limpa o rascunho após salvar o orçamento", () => {
    saveQuoteDraft("novo", state);
    clearQuoteDraft("novo");
    expect(loadQuoteDraft("novo")).toBeNull();
  });
});
