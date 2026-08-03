import { describe, it, expect } from "vitest";

import { itemTotal, quoteTotals, type QuoteItemDraft } from "@/lib/quote";
import { parseQuoteItemsCsv, parseNumberBR } from "@/lib/quote-csv";

function item(partial: Partial<QuoteItemDraft> = {}): QuoteItemDraft {
  return {
    product_id: null,
    codigo: null,
    codigo_interno: null,
    marca: null,
    descricao: "",
    quantidade: 1,
    preco_unitario: 0,
    desconto_percentual: 0,
    ordem: 0,
    ...partial,
  };
}

describe("itemTotal", () => {
  it("multiplica quantidade por preço", () => {
    expect(itemTotal(item({ quantidade: 3, preco_unitario: 10 }))).toBe(30);
  });

  it("aplica desconto percentual da linha", () => {
    expect(itemTotal(item({ quantidade: 2, preco_unitario: 100, desconto_percentual: 10 }))).toBe(
      180,
    );
  });
});

describe("quoteTotals", () => {
  it("soma itens, aplica descontos e frete", () => {
    const items = [
      item({ quantidade: 2, preco_unitario: 100 }),
      item({ quantidade: 1, preco_unitario: 50, ordem: 1 }),
    ];
    const { subtotal, total } = quoteTotals(items, 10, 25, 30);
    expect(subtotal).toBe(250);
    expect(total).toBe(250 - 25 - 25 + 30);
  });

  it("nunca retorna total negativo", () => {
    const { total } = quoteTotals([item({ preco_unitario: 10 })], 0, 500, 0);
    expect(total).toBe(0);
  });
});

describe("parseNumberBR", () => {
  it("entende formato brasileiro e internacional", () => {
    expect(parseNumberBR("1.234,56")).toBeCloseTo(1234.56);
    expect(parseNumberBR("1234.56")).toBeCloseTo(1234.56);
    expect(parseNumberBR("R$ 89,90")).toBeCloseTo(89.9);
    expect(parseNumberBR("")).toBe(0);
  });
});

describe("parseQuoteItemsCsv", () => {
  it("importa com cabeçalho e ponto-e-vírgula", () => {
    const csv = [
      "CODIGO;NOSSO CODIGO;MARCA;DESCRICAO;QTD;PRECO",
      "W1160;FO-1160;MANN;Filtro de óleo;2;89,90",
      "P550;FC-550;DONALDSON;Filtro combustível;1;120,00",
    ].join("\n");
    const items = parseQuoteItemsCsv(csv);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      codigo: "W1160",
      codigo_interno: "FO-1160",
      marca: "MANN",
      descricao: "Filtro de óleo",
      quantidade: 2,
      ordem: 0,
    });
    expect(items[0]!.preco_unitario).toBeCloseTo(89.9);
    expect(items[1]!.ordem).toBe(1);
  });

  it("importa colado do Excel (tabulação, sem cabeçalho)", () => {
    const tsv = "W1160\tFO-1160\tMANN\tFiltro\t3\t10,50";
    const items = parseQuoteItemsCsv(tsv, 5);
    expect(items).toHaveLength(1);
    expect(items[0]!.quantidade).toBe(3);
    expect(items[0]!.ordem).toBe(5);
  });

  it("ignora linhas vazias e assume quantidade 1", () => {
    const items = parseQuoteItemsCsv("\nW1160;;;Filtro;;25\n\n");
    expect(items).toHaveLength(1);
    expect(items[0]!.quantidade).toBe(1);
    expect(items[0]!.preco_unitario).toBe(25);
  });
});
