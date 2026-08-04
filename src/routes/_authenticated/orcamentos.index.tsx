import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, Trash2, ExternalLink, Pencil, Copy } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { DataPageHeader } from "@/components/data-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatBRL, formatDate, QUOTE_STATUS_CLASS, QUOTE_STATUS_LABEL } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { duplicateQuote } from "@/lib/quotes.functions";

export const Route = createFileRoute("/_authenticated/orcamentos/")({
  component: OrcamentosPage,
  head: () => ({
    meta: [
      { title: "Orçamentos — Rei dos Filtros" },
      { name: "description", content: "Crie, edite e acompanhe os orçamentos da equipe Rei dos Filtros." },
      { property: "og:title", content: "Orçamentos — Rei dos Filtros" },
      { property: "og:description", content: "Gestão de orçamentos comerciais da equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});


function OrcamentosPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const duplicateQuoteFn = useServerFn(duplicateQuote);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);


  const { data: quotes, isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select(
          "id, numero, status, total, data_emissao, created_at, vendedor_id, items:quote_items(id), client:clients(razao_social, nome_fantasia)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const vendedorIds = Array.from(new Set(rows.map((q) => q.vendedor_id).filter(Boolean)));
      const { data: profiles } = vendedorIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", vendedorIds)
        : { data: [] };
      const profileById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
      return rows.map((q) => ({
        ...q,
        item_count: Array.isArray(q.items) ? q.items.length : 0,
        vendedor_nome: q.vendedor_id ? (profileById.get(q.vendedor_id) ?? null) : null,
      }));
    },
  });

  const filtered = useMemo(() => {
    if (!quotes) return [];
    const t = search.trim().toLowerCase();
    if (!t) return quotes;
    return quotes.filter((q) => {
      const client = q.client as {
        razao_social?: string;
        nome_fantasia?: string;
      } | null;
      return (
        String(q.numero).includes(t) ||
        client?.razao_social?.toLowerCase().includes(t) ||
        client?.nome_fantasia?.toLowerCase().includes(t)
      );
    });
  }, [quotes, search]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Orçamento removido");
      qc.invalidateQueries({ queryKey: ["quotes"] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async (id: string) => (await duplicateQuoteFn({ data: { id } })).id,
    onSuccess: async (newId) => {
      toast.success("Orçamento duplicado como rascunho");
      await qc.invalidateQueries({ queryKey: ["quotes"] });
      navigate({ to: "/orcamentos/$id/editar", params: { id: newId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <DataPageHeader
        eyebrow="Vendas"
        title="Orçamentos"
        description="Todos os orçamentos criados pela equipe."
        actions={
          <Button
            asChild
            size="lg"
            className="rounded-2xl bg-primary text-primary-foreground shadow-lifted hover:bg-primary-hover"
          >
            <Link to="/orcamentos/novo">
              <Plus className="size-4" /> Novo orçamento
            </Link>
          </Button>
        }
      />

      <Card className="mb-4 flex items-center gap-3 rounded-2xl border-border/60 p-3 shadow-elegant">
        <Search className="ml-2 size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por número ou cliente..."
          className="border-0 shadow-none focus-visible:ring-0"
        />
      </Card>

      <Card className="overflow-hidden rounded-3xl border-border/60 shadow-elegant">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-14 text-center text-sm text-muted-foreground">
            {search ? "Nenhum orçamento encontrado." : "Nenhum orçamento criado ainda."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-bold">Nº</th>
                  <th className="px-6 py-3 font-bold">Cliente</th>
                  <th className="px-6 py-3 font-bold">Vendedor</th>
                  <th className="px-6 py-3 font-bold">Emissão</th>
                  <th className="px-6 py-3 font-bold text-center">Itens</th>
                  <th className="px-6 py-3 font-bold text-right">Total</th>
                  <th className="px-6 py-3 font-bold">Status</th>
                  <th className="px-6 py-3 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((q) => {
                  const client = q.client as {
                    razao_social?: string;
                    nome_fantasia?: string;
                  } | null;
                  const isOwner = user?.id === q.vendedor_id;
                  const canEdit = isOwner && q.status !== "aprovado";
                  return (
                    <tr key={q.id} className="hover:bg-muted/30">
                      <td className="px-6 py-3 font-mono text-xs font-semibold">
                        #{String(q.numero).padStart(5, "0")}
                      </td>
                      <td className="px-6 py-3 font-semibold text-foreground">
                        {client?.nome_fantasia || client?.razao_social || "—"}
                      </td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">
                        {q.vendedor_nome || "—"}
                      </td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">
                        {formatDate(q.data_emissao)}
                      </td>
                      <td className="px-6 py-3 text-center text-xs font-semibold">
                        {q.item_count}
                      </td>
                      <td className="px-6 py-3 text-right font-mono font-semibold">
                        {formatBRL(q.total)}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${
                            QUOTE_STATUS_CLASS[q.status] ?? "bg-muted"
                          }`}
                        >
                          {QUOTE_STATUS_LABEL[q.status] ?? q.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Button asChild variant="ghost" size="sm" title="Ver">
                          <Link to="/orcamentos/$id" params={{ id: q.id }}>
                            <ExternalLink className="size-4" />
                          </Link>
                        </Button>
                        {canEdit && (
                          <Button asChild variant="ghost" size="sm" title="Editar">
                            <Link to="/orcamentos/$id/editar" params={{ id: q.id }}>
                              <Pencil className="size-4" />
                            </Link>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Duplicar orçamento"
                          disabled={duplicate.isPending}
                          onClick={() => duplicate.mutate(q.id)}
                        >
                          <Copy className="size-4" />
                        </Button>

                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Remover"
                            onClick={() => setDeleteId(q.id)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover orçamento?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteId && del.mutate(deleteId)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
