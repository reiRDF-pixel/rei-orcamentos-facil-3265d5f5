import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (client: { id: string; razao_social: string; nome_fantasia: string | null }) => void;
}

export function ClientQuickDialog({ open, onOpenChange, onCreated }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj_cpf: "",
    tipo: "juridica" as "juridica" | "fisica",
    phone: "",
    email: "",
    cidade: "",
    estado: "",
  });

  const setField = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (!form.razao_social.trim()) throw new Error("Razão social / nome é obrigatório");
      const { data, error } = await supabase
        .from("clients")
        .insert({
          razao_social: form.razao_social.trim(),
          nome_fantasia: form.nome_fantasia.trim() || null,
          cnpj_cpf: form.cnpj_cpf.trim() || null,
          tipo: form.tipo,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          cidade: form.cidade.trim() || null,
          estado: form.estado.trim().toUpperCase() || null,
          created_by: user?.id,
        })
        .select("id, razao_social, nome_fantasia")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Cliente cadastrado");
      qc.invalidateQueries({ queryKey: ["clients-min"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      onCreated(data);
      setForm({
        razao_social: "",
        nome_fantasia: "",
        cnpj_cpf: "",
        tipo: "juridica",
        phone: "",
        email: "",
        cidade: "",
        estado: "",
      });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
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
            <Select value={form.tipo} onValueChange={(v) => setField("tipo", v as "juridica" | "fisica")}>
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
            <Input value={form.cnpj_cpf} onChange={(e) => setField("cnpj_cpf", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Razão social / Nome *</Label>
            <Input
              required
              autoFocus
              value={form.razao_social}
              onChange={(e) => setField("razao_social", e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Nome fantasia</Label>
            <Input
              value={form.nome_fantasia}
              onChange={(e) => setField("nome_fantasia", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input value={form.cidade} onChange={(e) => setField("cidade", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Estado (UF)</Label>
            <Input
              maxLength={2}
              value={form.estado}
              onChange={(e) => setField("estado", e.target.value.toUpperCase())}
            />
          </div>
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={save.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              {save.isPending ? "Salvando..." : "Salvar cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
