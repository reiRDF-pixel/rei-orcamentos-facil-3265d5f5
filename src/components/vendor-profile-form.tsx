import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUploadField } from "@/components/image-upload-field";

export const VENDOR_PROFILE_FIELDS = [
  "full_name",
  "nome_pdf",
  "cargo",
  "email",
  "phone",
  "phone_comercial",
  "whatsapp",
  "avatar_url",
  "signature_url",
  "cidade",
  "estado",
  "empresa_nome",
  "logo_url",
  "endereco",
  "cep",
  "site",
  "instagram",
  "facebook",
  "linkedin",
  "mensagem_padrao",
  "observacao_padrao",
  "validade_padrao_dias",
  "prazo_entrega_padrao",
  "condicao_pagamento_padrao",
] as const;

type VendorProfile = Record<string, string | number | null>;

interface Props {
  userId: string;
  /** When true, the "email" field is read-only (own profile) */
  ownProfile?: boolean;
}

export function VendorProfileForm({ userId, ownProfile }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<VendorProfile>({});

  const { data, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? {}) as VendorProfile;
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const patch: VendorProfile = {};
      for (const k of VENDOR_PROFILE_FIELDS) {
        if (ownProfile && k === "email") continue;
        const v = form[k];
        if (k === "validade_padrao_dias") {
          patch[k] = v === "" || v == null ? null : Number(v);
        } else {
          patch[k] = v === "" ? null : (v ?? null);
        }
      }
      const { error } = await supabase
        .from("profiles")
        .update(patch as never)
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil salvo");
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      qc.invalidateQueries({ queryKey: ["users-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));
  const val = (k: string) => (form[k] == null ? "" : String(form[k]));

  if (isLoading) {
    return <Skeleton className="h-96 w-full rounded-3xl" />;
  }

  return (
    <div className="space-y-6">
      <Section title="Dados pessoais">
        <Field
          label="Nome completo"
          value={val("full_name")}
          onChange={(v) => set("full_name", v)}
        />
        <Field
          label="Nome que aparece no PDF"
          value={val("nome_pdf")}
          onChange={(v) => set("nome_pdf", v)}
        />
        <Field label="Cargo" value={val("cargo")} onChange={(v) => set("cargo", v)} />
        <Field
          label="E-mail"
          value={val("email")}
          onChange={(v) => set("email", v)}
          disabled={ownProfile}
        />
        <Field
          label="Telefone comercial"
          value={val("phone_comercial")}
          onChange={(v) => set("phone_comercial", v)}
        />
        <Field label="WhatsApp" value={val("whatsapp")} onChange={(v) => set("whatsapp", v)} />
        <Field label="Telefone pessoal" value={val("phone")} onChange={(v) => set("phone", v)} />
      </Section>

      <Section title="Imagens">
        <ImageUploadField
          label="Foto de perfil"
          value={val("avatar_url")}
          onChange={(v) => set("avatar_url", v)}
          hint="Envie um arquivo do computador ou celular (PNG ou JPG)."
        />
        <ImageUploadField
          label="Assinatura digital"
          value={val("signature_url")}
          onChange={(v) => set("signature_url", v)}
          hint="Foto ou digitalização da assinatura, de preferência em PNG com fundo transparente."
        />
        <ImageUploadField
          label="Logo da unidade"
          value={val("logo_url")}
          onChange={(v) => set("logo_url", v)}
          hint="Aparece no PDF do orçamento."
        />
      </Section>

      <Section title="Empresa / Unidade">
        <Field
          label="Nome da empresa"
          value={val("empresa_nome")}
          onChange={(v) => set("empresa_nome", v)}
        />
        <Field label="Endereço" value={val("endereco")} onChange={(v) => set("endereco", v)} />
        <Field label="CEP" value={val("cep")} onChange={(v) => set("cep", v)} />
        <Field label="Cidade" value={val("cidade")} onChange={(v) => set("cidade", v)} />
        <Field label="Estado" value={val("estado")} onChange={(v) => set("estado", v)} />
      </Section>

      <Section title="Redes sociais">
        <Field label="Site" value={val("site")} onChange={(v) => set("site", v)} />
        <Field label="Instagram" value={val("instagram")} onChange={(v) => set("instagram", v)} />
        <Field label="Facebook" value={val("facebook")} onChange={(v) => set("facebook", v)} />
        <Field label="LinkedIn" value={val("linkedin")} onChange={(v) => set("linkedin", v)} />
      </Section>

      <Section title="Padrões do orçamento">
        <Field
          label="Condições de pagamento padrão"
          value={val("condicao_pagamento_padrao")}
          onChange={(v) => set("condicao_pagamento_padrao", v)}
        />
        <Field
          label="Prazo de entrega padrão"
          value={val("prazo_entrega_padrao")}
          onChange={(v) => set("prazo_entrega_padrao", v)}
        />
        <Field
          label="Prazo de validade padrão (dias)"
          type="number"
          value={val("validade_padrao_dias")}
          onChange={(v) => set("validade_padrao_dias", v)}
        />
        <Field label="Chave PIX" value={val("pix_key")} onChange={(v) => set("pix_key", v)} />
        <div className="md:col-span-2 space-y-2">
          <Label>Mensagem padrão do orçamento</Label>
          <Textarea
            rows={2}
            value={val("mensagem_padrao")}
            onChange={(e) => set("mensagem_padrao", e.target.value)}
          />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label>Observação padrão</Label>
          <Textarea
            rows={3}
            value={val("observacao_padrao")}
            onChange={(e) => set("observacao_padrao", e.target.value)}
          />
        </div>
      </Section>

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-2xl bg-primary text-primary-foreground shadow-lifted hover:bg-primary-hover"
        >
          <Save className="size-4" /> {save.isPending ? "Salvando..." : "Salvar perfil"}
        </Button>
      </div>
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
  value,
  onChange,
  type = "text",
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
