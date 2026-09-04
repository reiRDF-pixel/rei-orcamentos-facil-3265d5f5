import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Target, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { DataPageHeader } from "@/components/data-page-header";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatBRL, QUOTE_STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: RelatoriosPage,
  head: () => ({
    meta: [
      { title: "Relatórios comerciais — Rei dos Filtros" },
      {
        name: "description",
        content:
          "Acompanhe conversão, faturamento aprovado, itens mais cotados e desempenho por vendedor.",
      },
      { property: "og:title", content: "Relatórios comerciais — Rei dos Filtros" },
      { property: "og:description", content: "Indicadores de vendas e conversão de orçamentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const PIE_COLORS = [
  "var(--primary)",
  "var(--accent)",
  "var(--info)",
  "var(--success)",
  "var(--warning)",
];

type Range = "90" | "180" | "365";

function RelatoriosPage() {
  const [range, setRange] = useState<Range>("180");

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(range));
    return d.toISOString().slice(0, 10);
  }, [range]);

  const { data, isLoading } = useQuery({
    queryKey: ["relatorios", range],
    queryFn: async () => {
      const { data: quotes, error } = await supabase
        .from("quotes")
        .select(
          "id, numero, status, total, data_emissao, vendedor_id, client:clients(razao_social, nome_fantasia), items:quote_items(descricao, marca, codigo, quantidade, total)",
        )
        .is("deleted_at", null)
        .gte("data_emissao", since)
        .order("data_emissao", { ascending: true });
      if (error) throw error;

      const rows = quotes ?? [];
      const vendedorIds = Array.from(new Set(rows.map((q) => q.vendedor_id).filter(Boolean)));
      const { data: profiles } = vendedorIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", vendedorIds)
        : { data: [] };
      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
      return { rows, nameById };
    },
  });

  const metrics = useMemo(() => {
    const rows = data?.rows ?? [];
    const nameById = data?.nameById ?? new Map<string, string>();

    const cotado = rows.reduce((s, q) => s + Number(q.total ?? 0), 0);
    const aprovados = rows.filter((q) => q.status === "aprovado");
    const aprovado = aprovados.reduce((s, q) => s + Number(q.total ?? 0), 0);
    const conversao = rows.length ? (aprovados.length / rows.length) * 100 : 0;
    const ticket = aprovados.length ? aprovado / aprovados.length : 0;

    const monthMap = new Map<string, { label: string; cotado: number; aprovado: number }>();
    for (const q of rows) {
      const d = new Date(q.data_emissao + "T00:00:00");
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      const entry =
        monthMap.get(key) ??
        { label: `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, cotado: 0, aprovado: 0 };
      entry.cotado += Number(q.total ?? 0);
      if (q.status === "aprovado") entry.aprovado += Number(q.total ?? 0);
      monthMap.set(key, entry);
    }
    const monthly = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    const statusMap = new Map<string, number>();
    for (const q of rows) statusMap.set(q.status, (statusMap.get(q.status) ?? 0) + 1);
    const statusData = Array.from(statusMap.entries()).map(([k, v]) => ({
      name: QUOTE_STATUS_LABEL[k] ?? k,
      value: v,
    }));

    const clientMap = new Map<string, { name: string; total: number; count: number }>();
    for (const q of rows) {
      const c = q.client as { razao_social?: string; nome_fantasia?: string } | null;
      const name = c?.nome_fantasia || c?.razao_social || "Sem cliente";
      const e = clientMap.get(name) ?? { name, total: 0, count: 0 };
      e.total += Number(q.total ?? 0);
      e.count += 1;
      clientMap.set(name, e);
    }
    const topClients = Array.from(clientMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const itemMap = new Map<string, { name: string; qtd: number; total: number }>();
    for (const q of rows) {
      const items = (q.items ?? []) as Array<{
        descricao?: string | null;
        marca?: string | null;
        codigo?: string | null;
        quantidade?: number;
        total?: number;
      }>;
      for (const it of items) {
        const name = it.descricao?.trim() || it.codigo?.trim() || it.marca?.trim() || "Item sem nome";
        const e = itemMap.get(name) ?? { name, qtd: 0, total: 0 };
        e.qtd += Number(it.quantidade ?? 0);
        e.total += Number(it.total ?? 0);
        itemMap.set(name, e);
      }
    }
    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 8);

    const vendMap = new Map<
      string,
      { name: string; total: number; aprovado: number; count: number; aprovados: number }
    >();
    for (const q of rows) {
      const name = (q.vendedor_id && nameById.get(q.vendedor_id)) || "Sem vendedor";
      const e = vendMap.get(name) ?? { name, total: 0, aprovado: 0, count: 0, aprovados: 0 };
      e.total += Number(q.total ?? 0);
      e.count += 1;
      if (q.status === "aprovado") {
        e.aprovado += Number(q.total ?? 0);
        e.aprovados += 1;
      }
      vendMap.set(name, e);
    }
    const vendedores = Array.from(vendMap.values()).sort((a, b) => b.aprovado - a.aprovado);

    return {
      count: rows.length,
      cotado,
      aprovado,
      conversao,
      ticket,
      monthly,
      statusData,
      topClients,
      topItems,
      vendedores,
    };
  }, [data]);

  const kpis = [
    { label: "Total cotado", value: formatBRL(metrics.cotado), icon: BarChart3 },
    { label: "Total aprovado", value: formatBRL(metrics.aprovado), icon: TrendingUp },
    { label: "Conversão", value: `${metrics.conversao.toFixed(1)}%`, icon: Target },
    { label: "Ticket médio aprovado", value: formatBRL(metrics.ticket), icon: Users },
  ];

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <DataPageHeader
        eyebrow="Inteligência comercial"
        title="Relatórios"
        description="Conversão, faturamento aprovado, itens mais cotados e desempenho por vendedor."
        actions={
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(v) => v && setRange(v as Range)}
            className="rounded-2xl border border-border/60 bg-card p-1 shadow-elegant"
          >
            <ToggleGroupItem value="90" className="rounded-xl px-3 text-xs">
              90 dias
            </ToggleGroupItem>
            <ToggleGroupItem value="180" className="rounded-xl px-3 text-xs">
              6 meses
            </ToggleGroupItem>
            <ToggleGroupItem value="365" className="rounded-xl px-3 text-xs">
              12 meses
            </ToggleGroupItem>
          </ToggleGroup>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : metrics.count === 0 ? (
        <Card className="rounded-3xl border-border/60 shadow-elegant">
          <EmptyState
            icon={BarChart3}
            title="Nenhum dado no período"
            description="Crie orçamentos ou amplie o período para visualizar os indicadores."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <Card key={k.label} className="rounded-2xl border-border/60 p-5 shadow-elegant">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {k.label}
                  </p>
                  <k.icon className="size-4 text-primary" />
                </div>
                <p className="mt-2 font-mono text-xl font-bold text-foreground">{k.value}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="rounded-3xl border-border/60 p-6 shadow-elegant lg:col-span-2">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Cotado vs. aprovado por mês
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.monthly}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="currentColor"
                      tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                    />
                    <Tooltip
                      formatter={(v: number) => formatBRL(v)}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        color: "var(--card-foreground)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="cotado" name="Cotado" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="aprovado" name="Aprovado" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="rounded-3xl border-border/60 p-6 shadow-elegant">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Distribuição por status
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {metrics.statusData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        color: "var(--card-foreground)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden rounded-3xl border-border/60 shadow-elegant">
              <h2 className="border-b border-border px-6 py-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Melhores clientes
              </h2>
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-border">
                  {metrics.topClients.map((c) => (
                    <tr key={c.name}>
                      <td className="px-6 py-3 font-semibold text-foreground">{c.name}</td>
                      <td className="px-6 py-3 text-center text-xs text-muted-foreground">
                        {c.count} orç.
                      </td>
                      <td className="px-6 py-3 text-right font-mono font-semibold">
                        {formatBRL(c.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card className="overflow-hidden rounded-3xl border-border/60 shadow-elegant">
              <h2 className="border-b border-border px-6 py-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Itens mais cotados
              </h2>
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-border">
                  {metrics.topItems.map((i) => (
                    <tr key={i.name}>
                      <td className="max-w-[240px] truncate px-6 py-3 font-semibold text-foreground">
                        {i.name}
                      </td>
                      <td className="px-6 py-3 text-center text-xs text-muted-foreground">
                        {i.qtd} un.
                      </td>
                      <td className="px-6 py-3 text-right font-mono font-semibold">
                        {formatBRL(i.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <Card className="overflow-hidden rounded-3xl border-border/60 shadow-elegant">
            <h2 className="border-b border-border px-6 py-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Desempenho por vendedor
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-bold">Vendedor</th>
                    <th className="px-6 py-3 text-center font-bold">Orçamentos</th>
                    <th className="px-6 py-3 text-center font-bold">Aprovados</th>
                    <th className="px-6 py-3 text-center font-bold">Conversão</th>
                    <th className="px-6 py-3 text-right font-bold">Cotado</th>
                    <th className="px-6 py-3 text-right font-bold">Aprovado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metrics.vendedores.map((v) => (
                    <tr key={v.name} className="hover:bg-muted/30">
                      <td className="px-6 py-3 font-semibold text-foreground">{v.name}</td>
                      <td className="px-6 py-3 text-center">{v.count}</td>
                      <td className="px-6 py-3 text-center">{v.aprovados}</td>
                      <td className="px-6 py-3 text-center font-semibold">
                        {v.count ? ((v.aprovados / v.count) * 100).toFixed(0) : 0}%
                      </td>
                      <td className="px-6 py-3 text-right font-mono">{formatBRL(v.total)}</td>
                      <td className="px-6 py-3 text-right font-mono font-semibold text-primary">
                        {formatBRL(v.aprovado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
