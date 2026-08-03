import type { QuoteItemDraft } from "@/lib/quote";

const HEADER_ALIASES: Record<string, keyof ParsedRow> = {
  codigo: "codigo",
  "codigo cliente": "codigo",
  "cod cliente": "codigo",
  "código": "codigo",
  "código cliente": "codigo",
  codigo_interno: "codigo_interno",
  "nosso codigo": "codigo_interno",
  "nosso código": "codigo_interno",
  interno: "codigo_interno",
  marca: "marca",
  descricao: "descricao",
  "descrição": "descricao",
  item: "descricao",
  quantidade: "quantidade",
  qtd: "quantidade",
  qtde: "quantidade",
  preco: "preco_unitario",
  "preço": "preco_unitario",
  preco_unitario: "preco_unitario",
  "preco unitario": "preco_unitario",
  "preço unitário": "preco_unitario",
  valor: "preco_unitario",
};

const DEFAULT_ORDER: Array<keyof ParsedRow> = [
  "codigo",
  "codigo_interno",
  "marca",
  "descricao",
  "quantidade",
  "preco_unitario",
];

interface ParsedRow {
  codigo: string;
  codigo_interno: string;
  marca: string;
  descricao: string;
  quantidade: string;
  preco_unitario: string;
}

function detectDelimiter(line: string): string {
  const candidates = [";", "\t", ","];
  let best = ";";
  let bestCount = -1;
  for (const c of candidates) {
    const count = line.split(c).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = c;
    }
  }
  return bestCount > 0 ? best : ";";
}

function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === delimiter && !quoted) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** Accepts "1.234,56" and "1234.56". */
export function parseNumberBR(raw: string): number {
  const cleaned = (raw ?? "").replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return 0;
  let normalized = cleaned;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma > -1 && lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = cleaned.replace(/,/g, "");
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Parses a CSV/TSV (or Excel copy-paste) block into quote item drafts.
 * A header row is detected automatically; otherwise the default column
 * order is used: código, nosso código, marca, descrição, quantidade, preço.
 */
export function parseQuoteItemsCsv(text: string, startOrdem = 0): QuoteItemDraft[] {
  const lines = (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]!);
  const rows = lines.map((l) => splitLine(l, delimiter));

  let order = DEFAULT_ORDER;
  const first = rows[0]!.map((c) => c.toLowerCase().replace(/["']/g, "").trim());
  const mapped = first.map((c) => HEADER_ALIASES[c]);
  const isHeader = mapped.filter(Boolean).length >= 2;
  if (isHeader) {
    order = mapped.map((m, i) => m ?? DEFAULT_ORDER[i] ?? "descricao");
    rows.shift();
  }

  const items: QuoteItemDraft[] = [];
  rows.forEach((cols) => {
    const row: ParsedRow = {
      codigo: "",
      codigo_interno: "",
      marca: "",
      descricao: "",
      quantidade: "",
      preco_unitario: "",
    };
    cols.forEach((value, i) => {
      const key = order[i];
      if (key) row[key] = value.replace(/^"|"$/g, "").trim();
    });

    const quantidade = row.quantidade ? parseNumberBR(row.quantidade) : 1;
    const preco = parseNumberBR(row.preco_unitario);
    const hasContent =
      !!row.codigo || !!row.codigo_interno || !!row.marca || !!row.descricao || preco > 0;
    if (!hasContent) return;

    items.push({
      product_id: null,
      codigo: row.codigo || null,
      codigo_interno: row.codigo_interno || null,
      marca: row.marca || null,
      descricao: row.descricao,
      quantidade: quantidade > 0 ? quantidade : 1,
      preco_unitario: preco,
      desconto_percentual: 0,
      ordem: startOrdem + items.length,
    });
  });

  return items;
}
