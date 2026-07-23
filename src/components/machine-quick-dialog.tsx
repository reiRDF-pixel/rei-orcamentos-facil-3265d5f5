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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  onCreated: (machine: { id: string; marca: string; modelo: string; numero_serie: string | null }) => void;
}

export function MachineQuickDialog({ open, onOpenChange, clientId, onCreated }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState({
    marca: "",
    modelo: "",
    numero_serie: "",
    ano: "",
    horimetro: "",
    km: "",
  });

  const setField = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (!form.marca.trim() || !form.modelo.trim())
        throw new Error("Marca e modelo são obrigatórios");
      const { data, error } = await supabase
        .from("machines")
        .insert({
          client_id: clientId || null,
          marca: form.marca.trim(),
          modelo: form.modelo.trim(),
          numero_serie: form.numero_serie.trim() || null,
          ano: form.ano ? Number(form.ano) : null,
          horimetro: form.horimetro ? Number(form.horimetro) : null,
          km: form.km ? Number(form.km) : null,
          created_by: user?.id,
        })
        .select("id, marca, modelo, numero_serie")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Máquina cadastrada");
      qc.invalidateQueries({ queryKey: ["machines"] });
      qc.invalidateQueries({ queryKey: ["machines-by-client"] });
      onCreated(data);
      setForm({ marca: "", modelo: "", numero_serie: "", ano: "", horimetro: "", km: "" });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>Nova máquina</DialogTitle>
        </DialogHeader>
        <form
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label>Marca *</Label>
            <Input
              required
              autoFocus
              value={form.marca}
              onChange={(e) => setField("marca", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Modelo *</Label>
            <Input
              required
              value={form.modelo}
              onChange={(e) => setField("modelo", e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Nº série / chassi</Label>
            <Input
              value={form.numero_serie}
              onChange={(e) => setField("numero_serie", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Ano</Label>
            <Input
              type="number"
              value={form.ano}
              onChange={(e) => setField("ano", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Horímetro</Label>
            <Input
              type="number"
              step="0.1"
              value={form.horimetro}
              onChange={(e) => setField("horimetro", e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>KM</Label>
            <Input
              type="number"
              value={form.km}
              onChange={(e) => setField("km", e.target.value)}
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
              {save.isPending ? "Salvando..." : "Salvar máquina"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
