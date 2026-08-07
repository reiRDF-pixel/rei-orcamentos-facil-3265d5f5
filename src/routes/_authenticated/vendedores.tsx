import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { DataPageHeader } from "@/components/data-page-header";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL, QUOTE_STATUS_CLASS, QUOTE_STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/vendedores")({
  component: VendedoresPage,
  head: () => ({
    meta: [
      { title: "Desempenho por vendedor — Rei dos Filtros" },
      {
        name: "description",
        content:
          "Veja quantos orçamentos cada vendedor criou e quantos foram aprovados, recusados, expirados, enviados ou seguem em rascunho.",
      },
      { property: "og:title", content: "Desempenho por vendedor — Rei dos Filtros" },
      {
        property: "og:description",
        content: "Relatório individual de orçamentos por vendedor da Rei dos Filtros.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STATUSES = ["rascunho", "enviado", "aprovado", "recusado", "expirado"] as const;
type Range = "30" | "90" | "365" | "all";

type VendorRow = {
  id: string;
  name: string;
  count: number;
  total: number;
  aprovado: number;
  byStatus: Record<string, number>;
};

function VendedoresPage() {
  const [range, setRange] = useState<Range>("90");

  const since = useMemo(() => {
    if (range === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - Number(range));
    return d.toISOString().slice(0, 10);
  }, [range]);

  const { data, isLoading } = useQuery({
    queryKey: ["vendedores-report", range],
    queryFn: async (): Promise<VendorRow[]> => {
      let query = supabase.from("quotes").select("id, status, total, vendedor_id");
      if (since) query = query.gte("data_emissao", since);
      const { data: quotes, error } = await query;
      if (error) throw error;

      const rows = quotes ?? [];
      const ids = Array.from(new Set(rows.map((q) => q.vendedor_id).filter(Boolean))) as string[];
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
        : { data: [] };
      const nameById = new Map(
        (profiles ?? []).map((p) => [p.id, p.full_name || p.email || "Vendedor"]),
      );

      const map = new Map<string, VendorRow>();
      for (const q of rows) {
        const id = q.vendedor_id ?? "none";
        const entry =
          map.get(id) ??
          ({
            id,
            name: nameById.get(id) ?? "Sem vendedor",
            count: 0,
            total: 0,
            aprovado: 0,
            byStatus: {},
          } satisfies VendorRow);
        entry.count += 1;
        entry.total += Number(q.total ?? 0);
        if (q.status === "aprovado") entry.aprovado += Number(q.total ?? 0);
        entry.byStatus[q.status] = (entry.byStatus[q.status] ?? 0) + 1;
        map.set(id, entry);
      }
      return Array.from(map.values()).sort((a, b) => b.count - a.count);
    },
  });

  const rows = data ?? [];

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <DataPageHeader
        eyebrow="Equipe comercial"
        title="Vendedores"
        description="Relatório individual de cada vendedor: orçamentos criados, aprovados, recusados, expirados, enviados e rascunhos."
        actions={
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(v) => v && setRange(v as Range)}
            className="rounded-xl border border-border/70 p-1"
          >
            <ToggleGroupItem value="30" className="rounded-lg px-3 text-xs">
              30 dias
            </ToggleGroupItem>
            <ToggleGroupItem value="90" className="rounded-lg px-3 text-xs">
              90 dias
            </ToggleGroupItem>
            <ToggleGroupItem value="365" className="rounded-lg px-3 text-xs">
              12 meses
            </ToggleGroupItem>
            <ToggleGroupItem value="all" className="rounded-lg px-3 text-xs">
              Tudo
            </ToggleGroupItem>
          </ToggleGroup>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum orçamento no período"
          description="Assim que a equipe criar orçamentos, o desempenho de cada vendedor aparece aqui."
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((v) => (
              <Card key={v.id} className="rounded-3xl border-border/60 p-5 shadow-elegant">
                <p className="truncate text-base font-bold text-foreground">{v.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {v.count} orçamento{v.count === 1 ? "" : "s"} · aprovado{" "}
                  <b className="font-mono text-success">{formatBRL(v.aprovado)}</b>
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => (
                    <span
                      key={s}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${QUOTE_STATUS_CLASS[s]}`}
                    >
                      {QUOTE_STATUS_LABEL[s]}: {v.byStatus[s] ?? 0}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <Card className="overflow-x-auto rounded-3xl border-border/60 shadow-elegant">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  {STATUSES.map((s) => (
                    <TableHead key={s} className="text-center">
                      {QUOTE_STATUS_LABEL[s]}
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Total de orçamentos</TableHead>
                  <TableHead className="text-right">Valor cotado</TableHead>
                  <TableHead className="text-right">Valor aprovado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-semibold">{v.name}</TableCell>
                    {STATUSES.map((s) => (
                      <TableCell key={s} className="text-center font-mono">
                        {v.byStatus[s] ?? 0}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-mono font-bold">{v.count}</TableCell>
                    <TableCell className="text-right font-mono">{formatBRL(v.total)}</TableCell>
                    <TableCell className="text-right font-mono text-success">
                      {formatBRL(v.aprovado)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
