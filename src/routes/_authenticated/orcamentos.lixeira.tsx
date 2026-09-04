import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { DataPageHeader } from "@/components/data-page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/orcamentos/lixeira")({
  component: LixeiraPage,
  head: () => ({
    meta: [
      { title: "Lixeira de orçamentos — Rei dos Filtros" },
      {
        name: "description",
        content:
          "Restaure orçamentos excluídos por engano. Itens não restaurados são apagados após 30 dias.",
      },
      { property: "og:title", content: "Lixeira de orçamentos — Rei dos Filtros" },
      {
        property: "og:description",
        content: "Recupere orçamentos excluídos nos últimos 30 dias.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function daysLeft(deletedAt: string) {
  const ms = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function LixeiraPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["quotes-trash"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select(
          "id, numero, status, total, data_emissao, deleted_at, client:clients(razao_social, nome_fantasia)",
        )
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("quotes")
        .update({ deleted_at: null, deleted_by: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Orçamento restaurado");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["quotes-trash"] }),
        qc.invalidateQueries({ queryKey: ["quotes"] }),
      ]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const purge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Orçamento excluído definitivamente");
      qc.invalidateQueries({ queryKey: ["quotes-trash"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <DataPageHeader
        eyebrow="Vendas"
        title="Lixeira de orçamentos"
        description="Orçamentos excluídos ficam aqui por 30 dias antes de serem apagados de vez."
        actions={
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/orcamentos">
              <ArrowLeft className="size-4" /> Voltar aos orçamentos
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="A lixeira está vazia"
          description="Nenhum orçamento foi excluído recentemente."
        />
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((q) => {
            const client = q.client as {
              razao_social?: string;
              nome_fantasia?: string;
            } | null;
            return (
              <Card
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-border/60 p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    #{String(q.numero).padStart(5, "0")} ·{" "}
                    {client?.nome_fantasia || client?.razao_social || "Cliente removido"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBRL(Number(q.total ?? 0))} · emitido em {formatDate(q.data_emissao)} ·
                    apaga em {q.deleted_at ? daysLeft(q.deleted_at) : 30} dia(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    disabled={restore.isPending}
                    onClick={() => restore.mutate(q.id)}
                  >
                    <RotateCcw className="size-4" /> Restaurar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-xl text-destructive hover:text-destructive"
                    disabled={purge.isPending}
                    onClick={() => purge.mutate(q.id)}
                  >
                    <Trash2 className="size-4" /> Excluir definitivo
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
