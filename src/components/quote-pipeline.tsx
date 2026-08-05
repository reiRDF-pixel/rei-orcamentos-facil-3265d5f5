import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { GripVertical } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatBRL, formatDate, QUOTE_STATUS_LABEL } from "@/lib/format";

export type PipelineQuote = {
  id: string;
  numero: number;
  status: string;
  total: number;
  data_emissao: string;
  vendedor_id: string | null;
  vendedor_nome: string | null;
  client: { razao_social?: string; nome_fantasia?: string } | null;
};

const COLUMNS = ["rascunho", "enviado", "aprovado", "recusado", "expirado"] as const;

const COLUMN_ACCENT: Record<string, string> = {
  rascunho: "border-t-muted-foreground/40",
  enviado: "border-t-info",
  aprovado: "border-t-success",
  recusado: "border-t-destructive",
  expirado: "border-t-warning",
};

type Props = {
  quotes: PipelineQuote[];
  canMove: (q: PipelineQuote) => boolean;
  onMove: (id: string, status: string) => void;
};

export function QuotePipeline({ quotes, canMove, onMove }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const byStatus = useMemo(() => {
    const map = new Map<string, PipelineQuote[]>();
    for (const c of COLUMNS) map.set(c, []);
    for (const q of quotes) {
      const arr = map.get(q.status);
      if (arr) arr.push(q);
    }
    return map;
  }, [quotes]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {COLUMNS.map((col) => {
        const items = byStatus.get(col) ?? [];
        const soma = items.reduce((s, q) => s + Number(q.total ?? 0), 0);
        return (
          <div
            key={col}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(col);
            }}
            onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
            onDrop={() => {
              if (dragId) onMove(dragId, col);
              setDragId(null);
              setOverCol(null);
            }}
            className={`rounded-2xl border border-t-4 border-border/60 bg-muted/20 p-3 transition-colors ${
              COLUMN_ACCENT[col] ?? ""
            } ${overCol === col ? "bg-primary/5 ring-2 ring-primary/40" : ""}`}
          >
            <div className="mb-3 flex items-baseline justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                {QUOTE_STATUS_LABEL[col] ?? col}
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground">
                {items.length}
              </span>
            </div>
            <p className="mb-3 px-1 font-mono text-xs font-semibold text-muted-foreground">
              {formatBRL(soma)}
            </p>

            <div className="space-y-2">
              {items.length === 0 && (
                <p className="px-1 py-6 text-center text-[11px] text-muted-foreground">
                  Vazio
                </p>
              )}
              {items.map((q) => {
                const movable = canMove(q);
                const name = q.client?.nome_fantasia || q.client?.razao_social || "Sem cliente";
                return (
                  <Card
                    key={q.id}
                    draggable={movable}
                    onDragStart={() => setDragId(q.id)}
                    onDragEnd={() => setDragId(null)}
                    className={`rounded-xl border-border/60 p-3 shadow-sm transition-opacity ${
                      movable ? "cursor-grab active:cursor-grabbing" : ""
                    } ${dragId === q.id ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      {movable && (
                        <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/orcamentos/$id"
                          params={{ id: q.id }}
                          className="font-mono text-[11px] font-bold text-primary hover:underline"
                        >
                          #{String(q.numero).padStart(5, "0")}
                        </Link>
                        <p className="truncate text-xs font-semibold text-foreground">{name}</p>
                        <p className="mt-1 font-mono text-xs font-bold">{formatBRL(q.total)}</p>
                        <p className="mt-1 truncate text-[10px] text-muted-foreground">
                          {q.vendedor_nome || "—"} · {formatDate(q.data_emissao)}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
