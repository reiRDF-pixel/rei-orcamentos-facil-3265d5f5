import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDate, QUOTE_STATUS_LABEL, QUOTE_STATUS_CLASS } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, TrendingUp, CheckCircle2, DollarSign, Plus, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [quotesRes, monthQuotesRes] = await Promise.all([
        supabase.from("quotes").select("id, total, status", { count: "exact" }),
        supabase.from("quotes").select("id, total, status").gte("created_at", start),
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

      return {
        countMonth: monthQuotes.length,
        quotedMonth,
        approvedValue,
        conversion,
        ticket,
        totalAll: quotesRes.count ?? 0,
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
