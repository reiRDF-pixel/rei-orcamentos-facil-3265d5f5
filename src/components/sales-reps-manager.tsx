import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star, StarOff, Save } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export type SalesRep = {
  id: string;
  owner_id: string;
  is_default: boolean;
  full_name: string | null;
  nome_pdf: string | null;
  cargo: string | null;
  email: string | null;
  phone: string | null;
  phone_comercial: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  signature_url: string | null;
  logo_url: string | null;
  empresa_nome: string | null;
  endereco: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
  site: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  mensagem_padrao: string | null;
  pix_key: string | null;
};

const EMPTY: Omit<SalesRep, "id" | "owner_id" | "is_default"> = {
  full_name: "",
  nome_pdf: "",
  cargo: "",
  email: "",
  phone: "",
  phone_comercial: "",
  whatsapp: "",
  avatar_url: "",
  signature_url: "",
  logo_url: "",
  empresa_nome: "",
  endereco: "",
  cep: "",
  cidade: "",
  estado: "",
  site: "",
  instagram: "",
  facebook: "",
  linkedin: "",
  mensagem_padrao: "",
  pix_key: "",
};

interface Props {
  userId: string;
}

export function SalesRepsManager({ userId }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<SalesRep | "new" | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: reps, isLoading } = useQuery({
    queryKey: ["sales_reps", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_reps" as never)
        .select("*")
        .eq("owner_id", userId)
        .order("is_default", { ascending: false })
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as unknown as SalesRep[];
    },
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      // unset previous default, then set new one
      const { error: e1 } = await supabase
        .from("sales_reps" as never)
        .update({ is_default: false } as never)
        .eq("owner_id", userId)
        .eq("is_default", true);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("sales_reps" as never)
        .update({ is_default: true } as never)
        .eq("id", id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Vendedor padrão atualizado");
      qc.invalidateQueries({ queryKey: ["sales_reps", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales_reps" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vendedor removido");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["sales_reps", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="rounded-3xl border-border/60 p-6 shadow-elegant">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Vendedores desta conta
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Se mais de uma pessoa usa este login, cadastre um vendedor para cada uma. Na hora
            de criar o orçamento, escolha quem é o responsável — o PDF e o link enviado ao
            cliente vão mostrar apenas os dados dessa pessoa.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setEditing("new")}
          className="rounded-2xl bg-primary text-primary-foreground hover:bg-primary-hover"
        >
          <Plus className="size-4" /> Novo vendedor
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : !reps || reps.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhum vendedor cadastrado ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {reps.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-2 rounded-2xl border border-border/60 p-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">
                    {r.nome_pdf || r.full_name || "(sem nome)"}
                  </span>
                  {r.is_default && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                      Padrão
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {[r.cargo, r.whatsapp || r.phone_comercial, r.email]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  title={r.is_default ? "Já é o padrão" : "Definir como padrão"}
                  disabled={r.is_default || setDefault.isPending}
                  onClick={() => setDefault.mutate(r.id)}
                >
                  {r.is_default ? (
                    <Star className="size-4 fill-primary text-primary" />
                  ) : (
                    <StarOff className="size-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Editar"
                  onClick={() => setEditing(r)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Excluir"
                  onClick={() => setDeleteId(r.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SalesRepDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        userId={userId}
        rep={editing === "new" ? null : editing}
        onSaved={() => {
          setEditing(null);
          qc.invalidateQueries({ queryKey: ["sales_reps", userId] });
        }}
        hasAny={(reps?.length ?? 0) > 0}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir vendedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Orçamentos já criados continuam exibindo os dados que foram gravados no
              momento. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && remove.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function SalesRepDialog({
  open,
  onOpenChange,
  userId,
  rep,
  onSaved,
  hasAny,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  rep: SalesRep | null;
  onSaved: () => void;
  hasAny: boolean;
}) {
  const [form, setForm] = useState<typeof EMPTY & { is_default: boolean }>({
    ...EMPTY,
    is_default: false,
  });

  useEffect(() => {
    if (!open) return;
    if (rep) {
      const next = { ...EMPTY, is_default: rep.is_default } as typeof form;
      (Object.keys(EMPTY) as Array<keyof typeof EMPTY>).forEach((k) => {
        next[k] = (rep[k] ?? "") as never;
      });
      setForm(next);
    } else {
      setForm({ ...EMPTY, is_default: !hasAny });
    }
  }, [open, rep, hasAny]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { owner_id: userId };
      (Object.keys(EMPTY) as Array<keyof typeof EMPTY>).forEach((k) => {
        const v = form[k];
        payload[k] = v === "" || v == null ? null : v;
      });

      if (rep) {
        // update
        if (form.is_default && !rep.is_default) {
          const { error: e1 } = await supabase
            .from("sales_reps" as never)
            .update({ is_default: false } as never)
            .eq("owner_id", userId)
            .eq("is_default", true);
          if (e1) throw e1;
        }
        payload.is_default = form.is_default;
        const { error } = await supabase
          .from("sales_reps" as never)
          .update(payload as never)
          .eq("id", rep.id);
        if (error) throw error;
      } else {
        if (form.is_default) {
          const { error: e1 } = await supabase
            .from("sales_reps" as never)
            .update({ is_default: false } as never)
            .eq("owner_id", userId)
            .eq("is_default", true);
          if (e1) throw e1;
        }
        payload.is_default = form.is_default;
        const { error } = await supabase.from("sales_reps" as never).insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Vendedor salvo");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof typeof EMPTY>(k: K, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rep ? "Editar vendedor" : "Novo vendedor"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <Group title="Identificação">
            <TxtField
              label="Nome completo"
              value={form.full_name ?? ""}
              onChange={(v) => set("full_name", v)}
            />
            <TxtField
              label="Nome que aparece no PDF"
              value={form.nome_pdf ?? ""}
              onChange={(v) => set("nome_pdf", v)}
            />
            <TxtField
              label="Cargo"
              value={form.cargo ?? ""}
              onChange={(v) => set("cargo", v)}
            />
            <TxtField
              label="E-mail"
              value={form.email ?? ""}
              onChange={(v) => set("email", v)}
            />
            <TxtField
              label="WhatsApp"
              value={form.whatsapp ?? ""}
              onChange={(v) => set("whatsapp", v)}
            />
            <TxtField
              label="Telefone comercial"
              value={form.phone_comercial ?? ""}
              onChange={(v) => set("phone_comercial", v)}
            />
          </Group>

          <Group title="Imagens (URL)">
            <TxtField
              label="URL da assinatura"
              value={form.signature_url ?? ""}
              onChange={(v) => set("signature_url", v)}
            />
            <TxtField
              label="URL da logo (opcional)"
              value={form.logo_url ?? ""}
              onChange={(v) => set("logo_url", v)}
            />
          </Group>

          <Group title="Empresa / Unidade">
            <TxtField
              label="Nome da empresa"
              value={form.empresa_nome ?? ""}
              onChange={(v) => set("empresa_nome", v)}
            />
            <TxtField
              label="Endereço"
              value={form.endereco ?? ""}
              onChange={(v) => set("endereco", v)}
            />
            <TxtField label="CEP" value={form.cep ?? ""} onChange={(v) => set("cep", v)} />
            <TxtField
              label="Cidade"
              value={form.cidade ?? ""}
              onChange={(v) => set("cidade", v)}
            />
            <TxtField
              label="Estado"
              value={form.estado ?? ""}
              onChange={(v) => set("estado", v)}
            />
            <TxtField label="Site" value={form.site ?? ""} onChange={(v) => set("site", v)} />
          </Group>

          <Group title="Extras">
            <TxtField
              label="Chave PIX"
              value={form.pix_key ?? ""}
              onChange={(v) => set("pix_key", v)}
            />
            <div className="md:col-span-2 space-y-2">
              <Label>Mensagem padrão no orçamento</Label>
              <Textarea
                rows={3}
                value={form.mensagem_padrao ?? ""}
                onChange={(e) => set("mensagem_padrao", e.target.value)}
              />
            </div>
          </Group>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm((s) => ({ ...s, is_default: e.target.checked }))}
            />
            Usar este vendedor como padrão nos novos orçamentos
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary-hover"
          >
            <Save className="size-4" /> {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
    </div>
  );
}

function TxtField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
