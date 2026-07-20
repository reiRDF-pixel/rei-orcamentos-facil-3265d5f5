import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { QuoteEditor, type QuoteFormState } from "@/components/quote-editor";
import { type QuoteItemDraft } from "@/lib/quote";
import { createQuote } from "@/lib/quotes.functions";

export const Route = createFileRoute("/_authenticated/orcamentos/novo")({
  component: NovoOrcamentoPage,
});

function NovoOrcamentoPage() {
  const navigate = useNavigate();
  const createQuoteFn = useServerFn(createQuote);

  const { data: company } = useQuery({
    queryKey: ["company_settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const [state, setState] = useState<QuoteFormState>({
    client_id: "",
    machine_id: null,
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
    if (!company?.condicao_pagamento_padrao) return;
    setState((s) => {
      if (s.condicao_pagamento !== "") return s;
      return {
        ...s,
        condicao_pagamento: company.condicao_pagamento_padrao ?? "",
        validade_dias: company.validade_padrao_dias ?? 7,
        observacoes: company.observacoes_padrao ?? "",
      };
    });
  }, [company]);

  const save = useMutation({
    mutationFn: async () => {
      const quote = await createQuoteFn({ data: state });
      return quote.id;
    },
    onSuccess: (id) => {
      toast.success("Orçamento criado");
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
    />
  );
}
