import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Sun, Moon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { DataPageHeader } from "@/components/data-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Company = Tables<"company_settings">;

export const Route = createFileRoute("/_authenticated/empresa")({
  component: EmpresaPage,
});

function EmpresaPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["company_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<TablesInsert<"company_settings">>({});

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const setField = <K extends keyof TablesInsert<"company_settings">>(
    k: K,
    v: TablesInsert<"company_settings">[K],
  ) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (data?.id) {
        const { error } = await supabase.from("company_settings").update(form).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("company_settings").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Dados da empresa salvos");
      qc.invalidateQueries({ queryKey: ["company_settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      <DataPageHeader
        eyebrow="Configurações"
        title="Empresa"
        description="Dados institucionais usados no cabeçalho dos orçamentos."
      />

      <ThemeToggleCard />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-6"
      >
        <Section title="Identificação">
          <Field label="Razão social">
            <Input
              value={form.razao_social ?? ""}
              onChange={(e) => setField("razao_social", e.target.value)}
            />
          </Field>
          <Field label="Nome fantasia">
            <Input
              value={form.nome_fantasia ?? ""}
              onChange={(e) => setField("nome_fantasia", e.target.value)}
            />
          </Field>
          <Field label="CNPJ">
            <Input value={form.cnpj ?? ""} onChange={(e) => setField("cnpj", e.target.value)} />
          </Field>
          <Field label="Inscrição Estadual">
            <Input
              value={form.inscricao_estadual ?? ""}
              onChange={(e) => setField("inscricao_estadual", e.target.value)}
            />
          </Field>
          <Field label="URL da logo (opcional)" full>
            <Input
              value={form.logo_url ?? ""}
              onChange={(e) => setField("logo_url", e.target.value)}
              placeholder="https://..."
            />
          </Field>
        </Section>

        <Section title="Contato">
          <Field label="Email">
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setField("email", e.target.value)}
            />
          </Field>
          <Field label="Telefone">
            <Input value={form.phone ?? ""} onChange={(e) => setField("phone", e.target.value)} />
          </Field>
          <Field label="WhatsApp">
            <Input
              value={form.whatsapp ?? ""}
              onChange={(e) => setField("whatsapp", e.target.value)}
              placeholder="Ex: 5511999999999"
            />
          </Field>
        </Section>

        <Section title="Endereço">
          <Field label="CEP">
            <Input value={form.cep ?? ""} onChange={(e) => setField("cep", e.target.value)} />
          </Field>
          <Field label="Endereço" full>
            <Input
              value={form.endereco ?? ""}
              onChange={(e) => setField("endereco", e.target.value)}
            />
          </Field>
          <Field label="Número">
            <Input value={form.numero ?? ""} onChange={(e) => setField("numero", e.target.value)} />
          </Field>
          <Field label="Complemento">
            <Input
              value={form.complemento ?? ""}
              onChange={(e) => setField("complemento", e.target.value)}
            />
          </Field>
          <Field label="Bairro">
            <Input value={form.bairro ?? ""} onChange={(e) => setField("bairro", e.target.value)} />
          </Field>
          <Field label="Cidade">
            <Input value={form.cidade ?? ""} onChange={(e) => setField("cidade", e.target.value)} />
          </Field>
          <Field label="Estado (UF)">
            <Input
              maxLength={2}
              value={form.estado ?? ""}
              onChange={(e) => setField("estado", e.target.value.toUpperCase())}
            />
          </Field>
        </Section>

        <Section title="Padrões de orçamento">
          <Field label="Validade padrão (dias)">
            <Input
              type="number"
              value={form.validade_padrao_dias ?? 7}
              onChange={(e) => setField("validade_padrao_dias", Number(e.target.value))}
            />
          </Field>
          <Field label="Condição de pagamento padrão">
            <Input
              value={form.condicao_pagamento_padrao ?? ""}
              onChange={(e) => setField("condicao_pagamento_padrao", e.target.value)}
              placeholder="Ex: À vista / 30 dias"
            />
          </Field>
          <Field label="Observações padrão do orçamento" full>
            <Textarea
              rows={3}
              value={form.observacoes_padrao ?? ""}
              onChange={(e) => setField("observacoes_padrao", e.target.value)}
            />
          </Field>
        </Section>

        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={save.isPending}
            className="rounded-2xl bg-primary text-primary-foreground shadow-lifted hover:bg-primary-hover"
          >
            <Save className="size-4" /> {save.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-3xl border-border/60 p-6 shadow-elegant">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </Card>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${full ? "md:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ThemeToggleCard() {
  const { theme, setTheme } = useTheme();
  return (
    <Card className="mb-6 flex items-center justify-between rounded-3xl border-border/60 p-6 shadow-elegant">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Aparência
        </h2>
        <p className="mt-1 text-sm text-foreground">
          Escolha entre o modo claro ou escuro do sistema.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={theme === "light" ? "default" : "outline"}
          onClick={() => setTheme("light")}
          className={theme === "light" ? "bg-primary text-primary-foreground" : ""}
        >
          <Sun className="size-4" /> Claro
        </Button>
        <Button
          type="button"
          variant={theme === "dark" ? "default" : "outline"}
          onClick={() => setTheme("dark")}
          className={theme === "dark" ? "bg-primary text-primary-foreground" : ""}
        >
          <Moon className="size-4" /> Escuro
        </Button>
      </div>
    </Card>
  );
}
