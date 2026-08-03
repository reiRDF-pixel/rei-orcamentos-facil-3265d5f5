import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";

const ACTION_LABEL: Record<string, string> = {
  created: "Criou o orçamento",
  updated: "Atualizou o orçamento",
  deleted: "Removeu o orçamento",
  item_created: "Adicionou um item",
  item_updated: "Alterou um item",
  item_deleted: "Removeu um item",
};

const FIELD_LABEL: Record<string, string> = {
  status: "Status",
  total: "Total",
  subtotal: "Subtotal",
  client_id: "Cliente",
  machine_id: "Máquina",
  condicao_pagamento: "Condição de pagamento",
  tipo_frete: "Frete",
  prazo_entrega: "Prazo de entrega",
  validade_dias: "Validade (dias)",
  desconto_percentual: "Desconto (%)",
  desconto_valor: "Desconto (R$)",
  frete: "Valor do frete",
  observacoes: "Observações",
  pdf_template: "Modelo de PDF",
  descricao: "Descrição",
  codigo: "Código",
  codigo_interno: "Nosso código",
  marca: "Marca",
  quantidade: "Quantidade",
  preco_unitario: "Preço unitário",
};

type ChangeMap = Record<string, { old?: unknown; new?: unknown }>;

function describe(changes: unknown): string[] {
  if (!changes || typeof changes !== "object") return [];
  const map = changes as ChangeMap;
  return Object.entries(map)
    .filter(([, v]) => v && typeof v === "object")
    .map(([field, v]) => {
      const label = FIELD_LABEL[field] ?? field;
      const before = v.old === null || v.old === undefined || v.old === "" ? "—" : String(v.old);
      const after = v.new === null || v.new === undefined || v.new === "" ? "—" : String(v.new);
      return `${label}: ${before} → ${after}`;
    });
}

export function QuoteAuditList({ quoteId }: { quoteId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["quote-audit", quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_audit_log")
        .select("id, action, changes, user_name, created_at")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card className="mt-6 rounded-3xl border-border/60 p-6 shadow-elegant">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
        <History className="size-4" /> Histórico de alterações
      </h2>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma alteração registrada ainda.</p>
      ) : (
        <ol className="space-y-3">
          {data.map((entry) => {
            const details = describe(entry.changes);
            return (
              <li
                key={entry.id}
                className="rounded-2xl border border-border/60 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">
                    {ACTION_LABEL[entry.action] ?? entry.action}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {entry.user_name || "Sistema"} · {formatDateTime(entry.created_at)}
                  </span>
                </div>
                {details.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {details.map((d) => (
                      <li key={d} className="font-mono">
                        {d}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
