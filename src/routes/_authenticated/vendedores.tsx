import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { DataPageHeader } from "@/components/data-page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
        content: "Relatório individual e mensal de orçamentos por vendedor da Rei dos Filtros.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STATUSES = ["rascunho", "enviado", "aprovado", "recusado", "expirado"] as const;
type Range = "30" | "90" | "365" | "all";

type QuoteRow = {
  id: string;
  status: string;
  total: number | string | null;
  vendedor_id: string | null;
  data_emissao: string | null;
  vendedor_nome: string;
};

type VendorRow = {
  id: string;
  name: string;
  count: number;
  total: number;
  aprovado: number;
  byStatus: Record<string, number>;
};

function monthLabel(month: string) {
  const [y, m] = month.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function VendedoresPage() {
  const [range, setRange] = useState<Range>("90");
  const [mes, setMes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["vendedores-report"],
    queryFn: async (): Promise<QuoteRow[]> => {
      const { data: quotes, error } = await supabase
        .from("quotes")
        .select("id, status, total, vendedor_id, data_emissao");
      if (error) throw error;

      const rows = quotes ?? [];
      const ids = Array.from(new Set(rows.map((q) => q.vendedor_id).filter(Boolean))) as string[];
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
        : { data: [] };
      const nameById = new Map(
        (profiles ?? []).map((p) => [p.id, p.full_name || p.email || "Vendedor"]),
      );

      return rows.map((q) => ({
        ...q,
        vendedor_nome: (q.vendedor_id && nameById.get(q.vendedor_id)) || "Sem vendedor",
      }));
    },
  });

  const quotes = data ?? [];

  const filtered = useMemo(() => {
    if (mes) return quotes.filter((q) => (q.data_emissao ?? "").startsWith(mes));
    if (range === "all") return quotes;
    const d = new Date();
    d.setDate(d.getDate() - Number(range));
    const since = d.toISOString().slice(0, 10);
    return quotes.filter((q) => (q.data_emissao ?? "") >= since);
  }, [quotes, range, mes]);

  const rows = useMemo(() => {
    const map = new Map<string, VendorRow>();
    for (const q of filtered) {
      const id = q.vendedor_id ?? "none";
      const entry =
        map.get(id) ??
        ({
          id,
          name: q.vendedor_nome,
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
  }, [filtered]);

  // Relatório mês a mês (todos os vendedores), independente do filtro de período.
  const monthly = useMemo(() => {
    const map = new Map<string, { month: string; count: number; total: number; aprovado: number }>();
    for (const q of quotes) {
      const month = (q.data_emissao ?? "").slice(0, 7);
      if (!month) continue;
      const entry = map.get(month) ?? { month, count: 0, total: 0, aprovado: 0 };
      entry.count += 1;
      entry.total += Number(q.total ?? 0);
      if (q.status === "aprovado") entry.aprovado += Number(q.total ?? 0);
      map.set(month, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
  }, [quotes]);

  const periodoLabel = mes ? monthLabel(mes) : null;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <DataPageHeader
        eyebrow="Equipe comercial"
        title="Vendedores"
        description="Relatório individual e mensal: orçamentos criados, aprovados, recusados, expirados, enviados e rascunhos — com acesso direto aos orçamentos."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Card className="flex items-center gap-2 rounded-xl border-border/70 px-3 py-1">
              <label htmlFor="mes-vendedores" className="text-xs text-muted-foreground">
                Mês
              </label>
              <Input
                id="mes-vendedores"
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="h-8 w-[9.5rem] border-0 shadow-none focus-visible:ring-0"
              />
            </Card>
            <ToggleGroup
              type="single"
              value={mes ? "" : range}
              onValueChange={(v) => {
                if (!v) return;
                setMes("");
                setRange(v as Range);
              }}
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
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      ) : (
        <>
          {periodoLabel && (
            <p className="mb-4 text-xs text-muted-foreground">
              Período selecionado: <b className="text-foreground">{periodoLabel}</b>
            </p>
          )}

          {rows.length === 0 ? (
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
                    <Button asChild variant="outline" size="sm" className="mt-4 rounded-xl">
                      <Link
                        to="/orcamentos"
                        search={{ q: v.name, mes: mes || undefined }}
                      >
                        <ExternalLink className="size-4" /> Ver orçamentos
                      </Link>
                    </Button>
                  </Card>
                ))}
              </div>

              <Card className="mb-6 overflow-x-auto rounded-3xl border-border/60 shadow-elegant">
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
                      <TableHead />
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
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link
                              to="/orcamentos"
                              search={{ q: v.name, mes: mes || undefined }}
                              aria-label={`Ver orçamentos de ${v.name}`}
                            >
                              <ExternalLink className="size-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}

          <h2 className="mb-3 text-sm font-bold text-foreground">Relatório mês a mês</h2>
          {monthly.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sem histórico mensal"
              description="Os totais por mês aparecem aqui depois do primeiro orçamento."
            />
          ) : (
            <Card className="overflow-x-auto rounded-3xl border-border/60 shadow-elegant">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-center">Orçamentos</TableHead>
                    <TableHead className="text-right">Valor cotado</TableHead>
                    <TableHead className="text-right">Valor aprovado</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthly.map((m) => (
                    <TableRow key={m.month}>
                      <TableCell className="font-semibold capitalize">
                        {monthLabel(m.month)}
                      </TableCell>
                      <TableCell className="text-center font-mono">{m.count}</TableCell>
                      <TableCell className="text-right font-mono">{formatBRL(m.total)}</TableCell>
                      <TableCell className="text-right font-mono text-success">
                        {formatBRL(m.aprovado)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMes(m.month)}
                            className="text-xs"
                          >
                            Filtrar
                          </Button>
                          <Button asChild variant="ghost" size="sm" className="text-xs">
                            <Link to="/orcamentos" search={{ mes: m.month }}>
                              Ver orçamentos
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
