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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Machine = Tables<"machines"> & {
  client?: { razao_social: string; nome_fantasia: string | null } | null;
};

export const Route = createFileRoute("/_authenticated/maquinas")({
  component: MaquinasPage,
});

function MaquinasPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Machine | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Machine | null>(null);

  const { data: machines, isLoading } = useQuery({
    queryKey: ["machines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machines")
        .select("*, client:clients(razao_social, nome_fantasia)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Machine[];
    },
  });

  const filtered = useMemo(() => {
    if (!machines) return [];
    const t = search.trim().toLowerCase();
    if (!t) return machines;
    return machines.filter(
      (m) =>
        m.marca?.toLowerCase().includes(t) ||
        m.modelo?.toLowerCase().includes(t) ||
        m.numero_serie?.toLowerCase().includes(t) ||
        m.client?.razao_social?.toLowerCase().includes(t),
    );
  }, [machines, search]);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("machines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Máquina removida");
      qc.invalidateQueries({ queryKey: ["machines"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <DataPageHeader
        eyebrow="Cadastro"
        title="Máquinas"
        description="Equipamentos vinculados aos clientes."
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
                <Plus className="size-4" /> Nova máquina
              </Button>
            </DialogTrigger>
            <MachineDialog
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
          placeholder="Buscar por marca, modelo, série ou cliente..."
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
              ? "Nenhuma máquina encontrada."
              : "Nenhuma máquina cadastrada."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-bold">Marca / Modelo</th>
                  <th className="px-6 py-3 font-bold">Cliente</th>
                  <th className="px-6 py-3 font-bold">Série</th>
                  <th className="px-6 py-3 font-bold">Ano</th>
                  <th className="px-6 py-3 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30">
                    <td className="px-6 py-3">
                      <p className="font-semibold text-foreground">
                        {m.marca} {m.modelo}
                      </p>
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {m.client?.nome_fantasia || m.client?.razao_social || "—"}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                      {m.numero_serie ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {m.ano ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(m);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(m)}
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

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover máquina?</AlertDialogTitle>
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

function MachineDialog({
  editing,
  onClose,
}: {
  editing: Machine | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<TablesInsert<"machines">>({
    client_id: editing?.client_id ?? null,
    marca: editing?.marca ?? "",
    modelo: editing?.modelo ?? "",
    numero_serie: editing?.numero_serie ?? "",
    ano: editing?.ano ?? null,
    horimetro: editing?.horimetro ?? null,
    km: editing?.km ?? null,
    observacoes: editing?.observacoes ?? "",
  });

  const { data: clients } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, razao_social, nome_fantasia")
        .order("razao_social");
      return data ?? [];
    },
  });

  const setField = <K extends keyof TablesInsert<"machines">>(
    k: K,
    v: TablesInsert<"machines">[K],
  ) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (!form.marca?.trim() || !form.modelo?.trim())
        throw new Error("Marca e modelo são obrigatórios");
      const payload = { ...form, client_id: form.client_id || null };
      if (editing) {
        const { error } = await supabase
          .from("machines")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("machines").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Máquina atualizada" : "Máquina cadastrada");
      qc.invalidateQueries({ queryKey: ["machines"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto rounded-3xl">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar máquina" : "Nova máquina"}</DialogTitle>
      </DialogHeader>
      <form
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="space-y-2 md:col-span-2">
          <Label>Cliente (opcional)</Label>
          <Select
            value={form.client_id ?? "__none__"}
            onValueChange={(v) => setField("client_id", v === "__none__" ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sem cliente vinculado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sem cliente vinculado</SelectItem>
              {clients?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome_fantasia || c.razao_social}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Marca *</Label>
          <Input
            required
            value={form.marca ?? ""}
            onChange={(e) => setField("marca", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Modelo *</Label>
          <Input
            required
            value={form.modelo ?? ""}
            onChange={(e) => setField("modelo", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Nº série / chassi</Label>
          <Input
            value={form.numero_serie ?? ""}
            onChange={(e) => setField("numero_serie", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Ano</Label>
          <Input
            type="number"
            value={form.ano ?? ""}
            onChange={(e) =>
              setField("ano", e.target.value ? Number(e.target.value) : null)
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Horímetro</Label>
          <Input
            type="number"
            step="0.1"
            value={form.horimetro ?? ""}
            onChange={(e) =>
              setField(
                "horimetro",
                e.target.value ? Number(e.target.value) : null,
              )
            }
          />
        </div>
        <div className="space-y-2">
          <Label>KM</Label>
          <Input
            type="number"
            value={form.km ?? ""}
            onChange={(e) =>
              setField("km", e.target.value ? Number(e.target.value) : null)
            }
          />
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
