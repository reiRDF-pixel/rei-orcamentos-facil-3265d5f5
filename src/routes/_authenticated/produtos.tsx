import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { DataPageHeader } from "@/components/data-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatBRL } from "@/lib/format";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Product = Tables<"products">;

export const Route = createFileRoute("/_authenticated/produtos")({
  component: ProdutosPage,
  head: () => ({
    meta: [
      { title: "Produtos — Rei dos Filtros" },
      { name: "description", content: "Catálogo interno de produtos, códigos, marcas e preços." },
      { property: "og:title", content: "Produtos — Rei dos Filtros" },
      { property: "og:description", content: "Catálogo interno de produtos da Rei dos Filtros." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ProdutosPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("descricao");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!products) return [];
    const t = search.trim().toLowerCase();
    if (!t) return products;
    return products.filter(
      (p) =>
        p.descricao?.toLowerCase().includes(t) ||
        p.codigo?.toLowerCase().includes(t) ||
        p.marca?.toLowerCase().includes(t) ||
        p.categoria?.toLowerCase().includes(t),
    );
  }, [products, search]);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto removido");
      qc.invalidateQueries({ queryKey: ["products"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <DataPageHeader
        eyebrow="Cadastro"
        title="Produtos"
        description="Catálogo de filtros e lubrificantes disponíveis para orçamento."
        actions={
          <Dialog
            open={dialogOpen}
            onOpenChange={(o) => {
              setDialogOpen(o);
              if (!o) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="rounded-2xl bg-primary text-primary-foreground shadow-lifted hover:bg-primary-hover"
                onClick={() => setEditing(null)}
              >
                <Plus className="size-4" /> Novo produto
              </Button>
            </DialogTrigger>
            <ProductDialog
              key={editing?.id ?? "new"}
              editing={editing}
              onClose={() => setDialogOpen(false)}
            />
          </Dialog>
        }
      />

      <Card className="mb-4 flex items-center gap-3 rounded-2xl border-border/60 p-3 shadow-elegant">
        <Search className="ml-2 size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código, descrição, marca ou categoria..."
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
            {search
              ? "Nenhum produto encontrado."
              : "Nenhum produto cadastrado. Clique em Novo produto."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-bold">Código</th>
                  <th className="px-6 py-3 font-bold">Descrição</th>
                  <th className="px-6 py-3 font-bold">Marca</th>
                  <th className="px-6 py-3 font-bold text-right">Preço</th>
                  <th className="px-6 py-3 font-bold text-right">Estoque</th>
                  <th className="px-6 py-3 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                      {p.codigo ?? "—"}
                    </td>
                    <td className="px-6 py-3">
                      <p className="font-semibold text-foreground">{p.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.categoria ?? "—"} · {p.unidade}
                      </p>
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">{p.marca ?? "—"}</td>
                    <td className="px-6 py-3 text-right font-mono font-semibold text-foreground">
                      {formatBRL(p.preco_venda)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-xs">{p.estoque}</td>
                    <td className="px-6 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Editar produto ${p.descricao}`}
                        onClick={() => {
                          setEditing(p);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Excluir produto ${p.descricao}`}
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover produto?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductDialog({ editing, onClose }: { editing: Product | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<TablesInsert<"products">>({
    codigo: editing?.codigo ?? "",
    descricao: editing?.descricao ?? "",
    marca: editing?.marca ?? "",
    categoria: editing?.categoria ?? "",
    unidade: editing?.unidade ?? "UN",
    preco_custo: editing?.preco_custo ?? 0,
    preco_venda: editing?.preco_venda ?? 0,
    estoque: editing?.estoque ?? 0,
    ativo: editing?.ativo ?? true,
    observacoes: editing?.observacoes ?? "",
  });

  const setField = <K extends keyof TablesInsert<"products">>(
    k: K,
    v: TablesInsert<"products">[K],
  ) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (!form.descricao?.trim()) throw new Error("Descrição é obrigatória");
      if (editing) {
        const { error } = await supabase.from("products").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Produto atualizado" : "Produto cadastrado");
      qc.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-3xl">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
      </DialogHeader>
      <form
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="space-y-2">
          <Label>Código</Label>
          <Input value={form.codigo ?? ""} onChange={(e) => setField("codigo", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Marca</Label>
          <Input value={form.marca ?? ""} onChange={(e) => setField("marca", e.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Descrição *</Label>
          <Input
            required
            value={form.descricao ?? ""}
            onChange={(e) => setField("descricao", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Input
            value={form.categoria ?? ""}
            onChange={(e) => setField("categoria", e.target.value)}
            placeholder="Ex: Filtro de óleo"
          />
        </div>
        <div className="space-y-2">
          <Label>Unidade</Label>
          <Input
            value={form.unidade ?? "UN"}
            onChange={(e) => setField("unidade", e.target.value.toUpperCase())}
            placeholder="UN, L, KG..."
          />
        </div>
        <div className="space-y-2">
          <Label>Preço de custo</Label>
          <Input
            type="number"
            step="0.01"
            value={form.preco_custo ?? 0}
            onChange={(e) => setField("preco_custo", Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Preço de venda</Label>
          <Input
            type="number"
            step="0.01"
            value={form.preco_venda ?? 0}
            onChange={(e) => setField("preco_venda", Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Estoque</Label>
          <Input
            type="number"
            step="1"
            value={form.estoque ?? 0}
            onChange={(e) => setField("estoque", Number(e.target.value))}
          />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Switch checked={form.ativo ?? true} onCheckedChange={(v) => setField("ativo", v)} />
          <Label>Produto ativo</Label>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Observações</Label>
          <Textarea
            rows={3}
            value={form.observacoes ?? ""}
            onChange={(e) => setField("observacoes", e.target.value)}
          />
        </div>

        <DialogFooter className="md:col-span-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={save.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary-hover"
          >
            {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
