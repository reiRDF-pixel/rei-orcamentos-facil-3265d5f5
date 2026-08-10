import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Plus,
  Search,
  Trash2,
  ExternalLink,
  Pencil,
  Copy,
  FileText,
  LayoutList,
  Columns3,
  Send,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { DataPageHeader } from "@/components/data-page-header";
import { EmptyState } from "@/components/empty-state";
import { QuotePipeline, type PipelineQuote } from "@/components/quote-pipeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { formatBRL, formatDate, QUOTE_STATUS_CLASS, QUOTE_STATUS_LABEL } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { duplicateQuote } from "@/lib/quotes.functions";

export const Route = createFileRoute("/_authenticated/orcamentos/")({
  component: OrcamentosPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): { q?: string; mes?: string; dia?: string; ano?: string } => {
    const out: { q?: string; mes?: string; dia?: string; ano?: string } = {};
    if (typeof search.q === "string" && search.q) out.q = search.q;
    if (typeof search.mes === "string" && search.mes) out.mes = search.mes;
    if (typeof search.dia === "string" && search.dia) out.dia = search.dia;
    if (typeof search.ano === "string" && search.ano) out.ano = search.ano;
    return out;
  },

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
  const {
    q: initialQ,
    mes: initialMes,
    dia: initialDia,
    ano: initialAno,
  } = Route.useSearch();
  const [search, setSearch] = useState(initialQ ?? "");
  const [mes, setMes] = useState(initialMes ?? "");
  const [dia, setDia] = useState(initialDia ?? "");
  const [ano, setAno] = useState(initialAno ?? "");
  const [periodo, setPeriodo] = useState<"todos" | "dia" | "mes" | "ano">(
    initialDia ? "dia" : initialMes ? "mes" : initialAno ? "ano" : "todos",
  );

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [view, setView] = useState<"lista" | "pipeline">("lista");
  const [selected, setSelected] = useState<string[]>([]);

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

  const prefixo =
    periodo === "dia" ? dia : periodo === "mes" ? mes : periodo === "ano" ? ano : "";

  const filtered = useMemo(() => {
    if (!quotes) return [];
    const base = prefixo
      ? quotes.filter((q) => (q.data_emissao ?? "").startsWith(prefixo))
      : quotes;
    const t = search.trim().toLowerCase();
    if (!t) return base;

    return base.filter((q) => {
      const client = q.client as {
        razao_social?: string;
        nome_fantasia?: string;
      } | null;
      return (
        String(q.numero).includes(t) ||
        client?.razao_social?.toLowerCase().includes(t) ||
        client?.nome_fantasia?.toLowerCase().includes(t) ||
        q.vendedor_nome?.toLowerCase().includes(t)
      );
    });
  }, [quotes, search, prefixo]);

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

  const moveStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("quotes")
        .update({
          status: status as "rascunho",
          ...(status === "aprovado" ? { approved_at: new Date().toISOString() } : {}),
          ...(status === "enviado" ? { sent_at: new Date().toISOString() } : {}),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase
        .from("quotes")
        .update({
          status: status as "rascunho",
          ...(status === "aprovado" ? { approved_at: new Date().toISOString() } : {}),
          ...(status === "enviado" ? { sent_at: new Date().toISOString() } : {}),
        })
        .in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} ${count === 1 ? "orçamento" : "orçamentos"} atualizados`);
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkDuplicate = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await duplicateQuoteFn({ data: { id } });
      return ids.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} ${count === 1 ? "cópia" : "cópias"} criadas como rascunho`);
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleSelected = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((v) => v !== id) : [...s, id]));

  const ownedSelected = selected.filter(
    (id) => filtered.find((q) => q.id === id)?.vendedor_id === user?.id,
  );

  const applyBulkStatus = (status: string) => {
    if (ownedSelected.length === 0) {
      toast.error("Somente o vendedor responsável pode mudar o status");
      return;
    }
    bulkStatus.mutate({ ids: ownedSelected, status });
  };

  const bulkBar = selected.length > 0 && (
    <Card className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border-primary/40 bg-primary/5 p-3 shadow-elegant">
      <span className="mr-2 text-sm font-semibold">
        {selected.length} selecionado{selected.length === 1 ? "" : "s"}
      </span>
      <Button
        size="sm"
        variant="outline"
        className="rounded-xl"
        disabled={bulkStatus.isPending}
        onClick={() => applyBulkStatus("enviado")}
      >
        <Send className="size-4" /> Marcar enviado
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="rounded-xl"
        disabled={bulkStatus.isPending}
        onClick={() => applyBulkStatus("aprovado")}
      >
        <Check className="size-4" /> Aprovado
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="rounded-xl"
        disabled={bulkStatus.isPending}
        onClick={() => applyBulkStatus("recusado")}
      >
        <X className="size-4" /> Recusado
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="rounded-xl"
        disabled={bulkDuplicate.isPending}
        onClick={() => bulkDuplicate.mutate(selected)}
      >
        <Copy className="size-4" /> Duplicar
      </Button>
      <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected([])}>
        Limpar seleção
      </Button>
    </Card>
  );

  const newQuoteButton = (
    <Button
      asChild
      size="lg"
      className="rounded-2xl bg-primary text-primary-foreground shadow-lifted hover:bg-primary-hover"
    >
      <Link to="/orcamentos/novo">
        <Plus className="size-4" /> Novo orçamento
      </Link>
    </Button>
  );

  const empty = (
    <EmptyState
      icon={FileText}
      title={search ? "Nenhum orçamento encontrado" : "Nenhum orçamento criado ainda"}
      description={
        search
          ? "Ajuste a busca ou tente pelo número do orçamento."
          : "Crie o primeiro orçamento e ele aparecerá aqui com status, vendedor e total."
      }
      action={search ? undefined : newQuoteButton}
    />
  );

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <DataPageHeader
        eyebrow="Vendas"
        title="Orçamentos"
        description="Todos os orçamentos criados pela equipe."
        actions={newQuoteButton}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Card className="flex flex-1 items-center gap-3 rounded-2xl border-border/60 p-3 shadow-elegant">
          <Search className="ml-2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número, cliente ou vendedor..."
            className="border-0 shadow-none focus-visible:ring-0"
          />
        </Card>
        <Card className="flex items-center gap-2 rounded-2xl border-border/60 p-3 shadow-elegant">
          <label htmlFor="filtro-mes" className="text-xs text-muted-foreground">
            Mês
          </label>
          <Input
            id="filtro-mes"
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="w-[9.5rem] border-0 shadow-none focus-visible:ring-0"
          />
          {mes && (
            <Button variant="ghost" size="sm" onClick={() => setMes("")}>
              <X className="size-4" />
            </Button>
          )}
        </Card>
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as "lista" | "pipeline")}
          className="rounded-2xl border border-border/60 bg-card p-1 shadow-elegant"
        >
          <ToggleGroupItem value="lista" className="gap-2 rounded-xl px-3 text-xs">
            <LayoutList className="size-4" /> Lista
          </ToggleGroupItem>
          <ToggleGroupItem value="pipeline" className="gap-2 rounded-xl px-3 text-xs">
            <Columns3 className="size-4" /> Pipeline
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {view === "lista" && bulkBar}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-3xl border-border/60 shadow-elegant">{empty}</Card>
      ) : view === "pipeline" ? (
        <QuotePipeline
          quotes={filtered as unknown as PipelineQuote[]}
          canMove={(q) => user?.id === q.vendedor_id}
          onMove={(id, status) => {
            const current = filtered.find((q) => q.id === id);
            if (!current || current.status === status) return;
            if (user?.id !== current.vendedor_id) {
              toast.error("Somente o vendedor responsável pode mover este orçamento");
              return;
            }
            moveStatus.mutate({ id, status });
          }}
        />
      ) : (
        <>
          {/* Cartões — mobile */}
          <div className="space-y-3 lg:hidden">
            {filtered.map((q) => {
              const client = q.client as { razao_social?: string; nome_fantasia?: string } | null;
              const isOwner = user?.id === q.vendedor_id;
              const canEdit = isOwner && q.status !== "aprovado";
              return (
                <Card key={q.id} className="rounded-2xl border-border/60 p-4 shadow-elegant">
                  <div className="flex items-start justify-between gap-3">
                    <Checkbox
                      className="mt-1"
                      checked={selected.includes(q.id)}
                      onCheckedChange={() => toggleSelected(q.id)}
                      aria-label={`Selecionar orçamento ${q.numero}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-bold text-primary">
                        #{String(q.numero).padStart(5, "0")}
                      </p>
                      <p className="truncate font-semibold text-foreground">
                        {client?.nome_fantasia || client?.razao_social || "—"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {q.vendedor_nome || "—"} · {formatDate(q.data_emissao)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                        QUOTE_STATUS_CLASS[q.status] ?? "bg-muted"
                      }`}
                    >
                      {QUOTE_STATUS_LABEL[q.status] ?? q.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <div className="text-xs text-muted-foreground">
                      {q.item_count} {q.item_count === 1 ? "item" : "itens"}
                    </div>
                    <span className="font-mono text-base font-bold">{formatBRL(q.total)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/orcamentos/$id" params={{ id: q.id }}>
                        <ExternalLink className="size-4" /> Ver
                      </Link>
                    </Button>
                    {canEdit && (
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/orcamentos/$id/editar" params={{ id: q.id }}>
                          <Pencil className="size-4" /> Editar
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={duplicate.isPending}
                      onClick={() => duplicate.mutate(q.id)}
                    >
                      <Copy className="size-4" /> Duplicar
                    </Button>
                    {isOwner && (
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(q.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Tabela — desktop */}
          <Card className="hidden overflow-hidden rounded-3xl border-border/60 shadow-elegant lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <Checkbox
                        aria-label="Selecionar todos"
                        checked={selected.length > 0 && selected.length === filtered.length}
                        onCheckedChange={(v) =>
                          setSelected(v ? filtered.map((q) => q.id) : [])
                        }
                      />
                    </th>
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
                        <td className="px-4 py-3">
                          <Checkbox
                            aria-label={`Selecionar orçamento ${q.numero}`}
                            checked={selected.includes(q.id)}
                            onCheckedChange={() => toggleSelected(q.id)}
                          />
                        </td>
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
          </Card>
        </>
      )}

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
