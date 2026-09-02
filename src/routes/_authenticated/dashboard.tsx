import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDate, QUOTE_STATUS_LABEL, QUOTE_STATUS_CLASS } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import {
  FileText,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Plus,
  ArrowRight,
  Target,
  Save,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Painel de Controle — Rei dos Filtros" },
      { name: "description", content: "Indicadores comerciais e orçamentos recentes da Rei dos Filtros." },
      { property: "og:title", content: "Painel de Controle — Rei dos Filtros" },
      { property: "og:description", content: "Indicadores comerciais e orçamentos recentes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function DashboardPage() {
  const mesAtual = new Date().toISOString().slice(0, 7);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [quotesRes, monthQuotesRes] = await Promise.all([
        supabase.from("quotes").select("id, total, status", { count: "exact" }),
        supabase
          .from("quotes")
          .select("id, total, status, vendedor_id")
          .gte("created_at", start),
      ]);

      const monthQuotes = monthQuotesRes.data ?? [];
      const quotedMonth = monthQuotes.reduce((sum, q) => sum + Number(q.total ?? 0), 0);
      const approvedMonth = monthQuotes.filter((q) => q.status === "aprovado");
      const approvedValue = approvedMonth.reduce((s, q) => s + Number(q.total ?? 0), 0);
      const conversion =
        monthQuotes.length > 0 ? (approvedMonth.length / monthQuotes.length) * 100 : 0;
      const ticket =
        approvedMonth.length > 0
          ? approvedMonth.reduce((s, q) => s + Number(q.total ?? 0), 0) / approvedMonth.length
          : 0;

      const vendedorIds = Array.from(
        new Set(monthQuotes.map((q) => q.vendedor_id).filter(Boolean) as string[]),
      );
      const { data: profiles } = vendedorIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", vendedorIds)
        : { data: [] };
      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

      const byVendor = new Map<
        string,
        { id: string; nome: string; count: number; quoted: number; approved: number }
      >();
      for (const q of monthQuotes) {
        const id = q.vendedor_id ?? "sem-vendedor";
        const entry =
          byVendor.get(id) ??
          { id, nome: nameById.get(id) || "Sem vendedor", count: 0, quoted: 0, approved: 0 };
        entry.count += 1;
        entry.quoted += Number(q.total ?? 0);
        if (q.status === "aprovado") entry.approved += Number(q.total ?? 0);
        byVendor.set(id, entry);
      }

      return {
        countMonth: monthQuotes.length,
        quotedMonth,
        approvedValue,
        conversion,
        ticket,
        totalAll: quotesRes.count ?? 0,
        vendors: Array.from(byVendor.values()).sort((a, b) => b.quoted - a.quoted),
      };
    },
  });


  const { data: recentQuotes, isLoading: loadingRecent } = useQuery({
    queryKey: ["dashboard-recent-quotes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quotes")
        .select(
          "id, numero, total, status, data_emissao, client:clients(razao_social, nome_fantasia)",
        )
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Visão Geral
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            Painel de Controle
          </h1>
        </div>
        <Button
          asChild
          size="lg"
          className="rounded-2xl bg-primary text-primary-foreground shadow-lifted hover:bg-primary-hover"
        >
          <Link to="/orcamentos/novo">
            <Plus className="size-4" />
            Novo Orçamento
          </Link>
        </Button>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Orçamentos (mês)"
          value={isLoading ? undefined : String(stats?.countMonth ?? 0)}
          icon={FileText}
          hint={`${stats?.totalAll ?? 0} no total`}
        />
        <StatCard
           label="Valor aprovado (mês)"
           value={isLoading ? undefined : formatBRL(stats?.approvedValue)}
          icon={DollarSign}
           hint={`Cotado: ${formatBRL(stats?.quotedMonth)}`}
          highlight
        />
        <StatCard
          label="Taxa de aprovação"
          value={isLoading ? undefined : `${(stats?.conversion ?? 0).toFixed(1)}%`}
          icon={TrendingUp}
          hint="Aprovados / criados no mês"
        />
        <StatCard
          label="Ticket médio"
          value={isLoading ? undefined : formatBRL(stats?.ticket)}
          icon={CheckCircle2}
          hint="Média dos aprovados"
        />
      </section>

      <MonthlyTargetsSection
        mes={mesAtual}
        approvedByVendor={new Map((stats?.vendors ?? []).map((v) => [v.id, v.approved]))}
      />

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Orçamentos do mês por vendedor</h2>
          <Button asChild variant="ghost" size="sm" className="text-primary">
            <Link to="/vendedores">
              Relatório completo <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <Card className="overflow-hidden rounded-3xl border-border/60 shadow-elegant">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : stats && stats.vendors.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Vendedor
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Orçamentos
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Valor cotado
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Valor aprovado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.vendors.map((v) => (
                    <tr key={v.nome} className="hover:bg-muted/30">
                      <td className="px-6 py-4 text-sm font-semibold text-foreground">{v.nome}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{v.count}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-foreground">
                        {formatBRL(v.quoted)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-primary">
                        {formatBRL(v.approved)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30">
                  <tr>
                    <td className="px-6 py-3 text-xs font-bold text-foreground">
                      Total ({mesAtual.split("-").reverse().join("/")})
                    </td>
                    <td className="px-6 py-3 text-xs font-bold text-foreground">
                      {stats.countMonth}
                    </td>
                    <td className="px-6 py-3 text-xs font-bold text-foreground">
                      {formatBRL(stats.quotedMonth)}
                    </td>
                    <td className="px-6 py-3 text-xs font-bold text-primary">
                      {formatBRL(stats.approvedValue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Nenhum orçamento neste mês ainda.
            </p>
          )}
        </Card>
      </section>



      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Últimos orçamentos</h2>
          <Button asChild variant="ghost" size="sm" className="text-primary">
            <Link to="/orcamentos">
              Ver todos <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <Card className="overflow-hidden rounded-3xl border-border/60 shadow-elegant">
          {loadingRecent ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : recentQuotes && recentQuotes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Nº
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Data
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentQuotes.map((q) => {
                    const client = q.client as {
                      razao_social?: string;
                      nome_fantasia?: string;
                    } | null;
                    return (
                      <tr key={q.id} className="hover:bg-muted/30">
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-foreground">
                          #{String(q.numero).padStart(5, "0")}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-foreground">
                            {client?.nome_fantasia || client?.razao_social || "—"}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {formatDate(q.data_emissao)}
                        </td>
                        <td className="px-6 py-4 font-mono text-sm font-semibold text-foreground">
                          {formatBRL(q.total)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${
                              QUOTE_STATUS_CLASS[q.status] ?? "bg-muted"
                            }`}
                          >
                            {QUOTE_STATUS_LABEL[q.status] ?? q.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyRecentQuotes />
          )}
        </Card>
      </section>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value?: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}

function StatCard({ label, value, hint, icon: Icon, highlight }: StatCardProps) {
  return (
    <Card className="rounded-3xl border-border/60 p-5 shadow-elegant">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <div
          className={`flex size-8 items-center justify-center rounded-xl ${
            highlight ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
          }`}
        >
          <Icon className="size-4" />
        </div>
      </div>
      {value === undefined ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <p
          className={`text-2xl font-bold tracking-tight ${
            highlight ? "text-primary" : "text-foreground"
          }`}
        >
          {value}
        </p>
      )}
      {hint && <p className="mt-2 text-[10px] font-medium text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function EmptyRecentQuotes() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <FileText className="size-6" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">Nenhum orçamento ainda</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie o primeiro orçamento para começar a acompanhar suas métricas aqui.
        </p>
      </div>
      <Button asChild className="rounded-xl bg-primary text-primary-foreground">
        <Link to="/orcamentos/novo">
          <Plus className="size-4" />
          Criar primeiro orçamento
        </Link>
      </Button>
    </div>
  );
}

function MonthlyTargetsSection({
  mes,
  approvedByVendor,
}: {
  mes: string;
  approvedByVendor: Map<string, number>;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["metas-mes", mes],
    queryFn: async () => {
      const [profilesRes, targetsRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, active").order("full_name"),
        supabase.from("sales_targets").select("user_id, meta_valor").eq("mes", mes),
      ]);
      const metaById = new Map(
        (targetsRes.data ?? []).map((t) => [t.user_id, Number(t.meta_valor ?? 0)]),
      );
      return (profilesRes.data ?? [])
        .filter((p) => p.active !== false)
        .map((p) => ({
          id: p.id,
          nome: p.full_name || "Vendedor",
          meta: metaById.get(p.id) ?? 0,
        }));
    },
  });

  const saveMeta = useMutation({
    mutationFn: async ({ userId, meta }: { userId: string; meta: number }) => {
      const { error } = await supabase
        .from("sales_targets")
        .upsert({ user_id: userId, mes, meta_valor: meta }, { onConflict: "user_id,mes" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Meta salva");
      qc.invalidateQueries({ queryKey: ["metas-mes", mes] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data ?? [];
  const totalMeta = rows.reduce((s, r) => s + r.meta, 0);
  const totalAprovado = rows.reduce((s, r) => s + (approvedByVendor.get(r.id) ?? 0), 0);
  const totalPct = totalMeta > 0 ? Math.min(100, (totalAprovado / totalMeta) * 100) : 0;

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Target className="size-5 text-primary" /> Metas do mês
        </h2>
        {totalMeta > 0 && (
          <span className="text-xs font-semibold text-muted-foreground">
            {formatBRL(totalAprovado)} de {formatBRL(totalMeta)} ({totalPct.toFixed(0)}%)
          </span>
        )}
      </div>

      <Card className="rounded-3xl border-border/60 p-6 shadow-elegant">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum vendedor cadastrado ainda.
          </p>
        ) : (
          <div className="space-y-5">
            {totalMeta > 0 && (
              <div className="rounded-2xl bg-muted/30 p-4">
                <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <span>Meta geral da equipe</span>
                  <span>{totalPct.toFixed(0)}%</span>
                </div>
                <Progress value={totalPct} className="h-3" />
              </div>
            )}

            {rows.map((row) => {
              const aprovado = approvedByVendor.get(row.id) ?? 0;
              const pct = row.meta > 0 ? Math.min(100, (aprovado / row.meta) * 100) : 0;
              const canEdit = isAdmin || user?.id === row.id;
              const draft = drafts[row.id];
              return (
                <div key={row.id} className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{row.nome}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {formatBRL(aprovado)} /{" "}
                        {row.meta > 0 ? formatBRL(row.meta) : "sem meta definida"}
                      </span>
                      {canEdit && (
                        <>
                          <Input
                            type="number"
                            min="0"
                            step="100"
                            className="h-8 w-32"
                            placeholder="Meta R$"
                            value={draft ?? (row.meta > 0 ? String(row.meta) : "")}
                            onChange={(e) =>
                              setDrafts((d) => ({ ...d, [row.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                saveMeta.mutate({
                                  userId: row.id,
                                  meta: Number(draft ?? row.meta) || 0,
                                });
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={saveMeta.isPending}
                            onClick={() =>
                              saveMeta.mutate({
                                userId: row.id,
                                meta: Number(draft ?? row.meta) || 0,
                              })
                            }
                          >
                            <Save className="size-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <p className="text-[10px] font-medium text-muted-foreground">
                    {row.meta > 0
                      ? `${pct.toFixed(0)}% da meta • falta ${formatBRL(Math.max(0, row.meta - aprovado))}`
                      : "Defina uma meta para acompanhar o progresso."}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </section>
  );
}
