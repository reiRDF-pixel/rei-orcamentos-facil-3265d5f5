import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { QuoteEditor, type QuoteFormState } from "@/components/quote-editor";
import { type QuoteItemDraft } from "@/lib/quote";
import { createQuote } from "@/lib/quotes.functions";
import { useAuth } from "@/hooks/use-auth";
import { clearQuoteDraft } from "@/lib/quote-draft";


export const Route = createFileRoute("/_authenticated/orcamentos/novo")({
  component: NovoOrcamentoPage,
});

function NovoOrcamentoPage() {
  const navigate = useNavigate();
  const createQuoteFn = useServerFn(createQuote);
  const { user } = useAuth();

  const { data: company } = useQuery({
    queryKey: ["company_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("company_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile-defaults", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data as Record<string, unknown> | null;
    },
  });

  const [state, setState] = useState<QuoteFormState>({
    client_id: "",
    machine_id: null,
    sales_rep_id: null,
    solicitante: "",
    condicao_pagamento: "",
    tipo_frete: "SEM FRETE",
    prazo_entrega: "",
    validade_dias: 7,
    desconto_percentual: 0,
    desconto_valor: 0,
    frete: 0,
    observacoes: "",
    pdf_template: "azul",
    items: [] as QuoteItemDraft[],
  });

  useEffect(() => {
    setState((s) => {
      // User profile defaults take precedence; fall back to company defaults.
      const pCond = (profile?.condicao_pagamento_padrao as string | null) ?? null;
      const pPrazo = (profile?.prazo_entrega_padrao as string | null) ?? null;
      const pValid = profile?.validade_padrao_dias as number | null | undefined;
      const pObs = (profile?.observacao_padrao as string | null) ?? null;

      return {
        ...s,
        condicao_pagamento:
          s.condicao_pagamento || pCond || company?.condicao_pagamento_padrao || "",
        prazo_entrega: s.prazo_entrega || pPrazo || "",
        validade_dias:
          s.validade_dias && s.validade_dias !== 7
            ? s.validade_dias
            : (pValid ?? company?.validade_padrao_dias ?? 7),
        observacoes: s.observacoes || pObs || company?.observacoes_padrao || "",
      };
    });
  }, [company, profile]);

  const save = useMutation({
    mutationFn: async () => {
      const quote = await createQuoteFn({ data: state });
      return quote.id;
    },
    onSuccess: (id) => {
      toast.success("Orçamento criado");
      clearQuoteDraft("novo");
      navigate({ to: "/orcamentos/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <QuoteEditor
      title="Novo orçamento"
      state={state}
      setState={setState}
      onSave={() => save.mutate()}
      saving={save.isPending}
      draftKey="novo"
    />
  );
}

