import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Phone, MapPin, History } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
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
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Client = Tables<"clients">;

export const Route = createFileRoute("/_authenticated/clientes")({
  component: ClientesPage,
});

function ClientesPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("razao_social");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!clients) return [];
    const t = search.trim().toLowerCase();
    if (!t) return clients;
    return clients.filter(
      (c) =>
        c.razao_social?.toLowerCase().includes(t) ||
        c.nome_fantasia?.toLowerCase().includes(t) ||
        c.cnpj_cpf?.toLowerCase().includes(t) ||
        c.cidade?.toLowerCase().includes(t),
    );
  }, [clients, search]);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente removido");
      qc.invalidateQueries({ queryKey: ["clients"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <DataPageHeader
        eyebrow="Cadastro"
        title="Clientes"
        description="Gerencie clientes PJ e PF vinculados aos orçamentos."
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
                <Plus className="size-4" /> Novo cliente
              </Button>
            </DialogTrigger>
            <ClientDialog
              key={editing?.id ?? "new"}
              editing={editing}
              userId={user?.id}
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
          placeholder="Buscar por nome, CNPJ ou cidade..."
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
              ? "Nenhum cliente encontrado com esse termo."
              : "Nenhum cliente cadastrado. Clique em Novo cliente para começar."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-bold">Cliente</th>
                  <th className="px-6 py-3 font-bold">CNPJ/CPF</th>
                  <th className="px-6 py-3 font-bold">Contato</th>
                  <th className="px-6 py-3 font-bold">Cidade</th>
                  <th className="px-6 py-3 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-6 py-3">
                      <p className="font-semibold text-foreground">
                        {c.nome_fantasia || c.razao_social}
                      </p>
                      {c.nome_fantasia && (
                        <p className="text-xs text-muted-foreground">{c.razao_social}</p>
                      )}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                      {c.cnpj_cpf ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {c.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3" /> {c.phone}
                        </span>
                      )}
                      {c.contato_nome && <div>{c.contato_nome}</div>}
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {c.cidade ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" /> {c.cidade}
                          {c.estado ? `/${c.estado}` : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Histórico do cliente ${c.nome_fantasia || c.razao_social || ""}`}
                        title="Histórico"
                        onClick={() => setHistoryTarget(c)}
                      >
                        <History className="size-4" />
                      </Button>
                      <Button

                        variant="ghost"
                        size="sm"
                        aria-label={`Editar cliente ${c.nome_fantasia || c.razao_social || ""}`}
                        onClick={() => {
                          setEditing(c);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Excluir cliente ${c.nome_fantasia || c.razao_social || ""}`}
                        onClick={() => setDeleteTarget(c)}
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
            <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Máquinas e orçamentos vinculados a{" "}
              <b>{deleteTarget?.razao_social}</b> podem ficar órfãos.
            </AlertDialogDescription>
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

function ClientDialog({
  editing,
  userId,
  onClose,
}: {
  editing: Client | null;
  userId: string | undefined;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<TablesInsert<"clients">>({
    razao_social: editing?.razao_social ?? "",
    nome_fantasia: editing?.nome_fantasia ?? "",
    cnpj_cpf: editing?.cnpj_cpf ?? "",
    inscricao_estadual: editing?.inscricao_estadual ?? "",
    tipo: editing?.tipo ?? "juridica",
    contato_nome: editing?.contato_nome ?? "",
    email: editing?.email ?? "",
    phone: editing?.phone ?? "",
    whatsapp: editing?.whatsapp ?? "",
    cep: editing?.cep ?? "",
    endereco: editing?.endereco ?? "",
    numero: editing?.numero ?? "",
    complemento: editing?.complemento ?? "",
    bairro: editing?.bairro ?? "",
    cidade: editing?.cidade ?? "",
    estado: editing?.estado ?? "",
    observacoes: editing?.observacoes ?? "",
  });

  const setField = <K extends keyof TablesInsert<"clients">>(k: K, v: TablesInsert<"clients">[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (!form.razao_social?.trim()) throw new Error("Razão social é obrigatória");
      if (editing) {
        const { error } = await supabase.from("clients").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert({ ...form, created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Cliente atualizado" : "Cliente cadastrado");
      qc.invalidateQueries({ queryKey: ["clients"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-3xl">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
      </DialogHeader>
      <form
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select
            value={form.tipo}
            onValueChange={(v) => setField("tipo", v as "juridica" | "fisica")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
              <SelectItem value="fisica">Pessoa Física</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>CNPJ / CPF</Label>
          <Input
            value={form.cnpj_cpf ?? ""}
            onChange={(e) => setField("cnpj_cpf", e.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Razão social / Nome *</Label>
          <Input
            required
            value={form.razao_social ?? ""}
            onChange={(e) => setField("razao_social", e.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Nome fantasia</Label>
          <Input
            value={form.nome_fantasia ?? ""}
            onChange={(e) => setField("nome_fantasia", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Inscrição Estadual</Label>
          <Input
            value={form.inscricao_estadual ?? ""}
            onChange={(e) => setField("inscricao_estadual", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Contato</Label>
          <Input
            value={form.contato_nome ?? ""}
            onChange={(e) => setField("contato_nome", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={form.email ?? ""}
            onChange={(e) => setField("email", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input value={form.phone ?? ""} onChange={(e) => setField("phone", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>WhatsApp</Label>
          <Input
            value={form.whatsapp ?? ""}
            onChange={(e) => setField("whatsapp", e.target.value)}
            placeholder="Ex: 5511999999999"
          />
        </div>
        <div className="space-y-2">
          <Label>CEP</Label>
          <Input value={form.cep ?? ""} onChange={(e) => setField("cep", e.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Endereço</Label>
          <Input
            value={form.endereco ?? ""}
            onChange={(e) => setField("endereco", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Número</Label>
          <Input value={form.numero ?? ""} onChange={(e) => setField("numero", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Complemento</Label>
          <Input
            value={form.complemento ?? ""}
            onChange={(e) => setField("complemento", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Bairro</Label>
          <Input value={form.bairro ?? ""} onChange={(e) => setField("bairro", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Cidade</Label>
          <Input value={form.cidade ?? ""} onChange={(e) => setField("cidade", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Estado (UF)</Label>
          <Input
            maxLength={2}
            value={form.estado ?? ""}
            onChange={(e) => setField("estado", e.target.value.toUpperCase())}
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
