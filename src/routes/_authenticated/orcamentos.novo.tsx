import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { QuoteEditor } from "@/components/quote-editor";
import type { QuoteItemDraft } from "@/lib/quote";

export const Route = createFileRoute("/_authenticated/orcamentos/novo")({
  component: NovoOrcamentoPage,
});

function NovoOrcamentoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const [state, setState] = useState({
    client_id: "",
    machine_id: null as string | null,
    condicao_pagamento: "",
    prazo_entrega: "",
    validade_dias: 7,
    desconto_percentual: 0,
    desconto_valor: 0,
    frete: 0,
    observacoes: "",
    items: [] as QuoteItemDraft[],
  });

  // Initialize defaults once company loads
  if (
    company &&
    state.condicao_pagamento === "" &&
    company.condicao_pagamento_padrao
  ) {
    setState((s) => ({
      ...s,
      condicao_pagamento: company.condicao_pagamento_padrao ?? "",
      validade_dias: company.validade_padrao_dias ?? 7,
      observacoes: company.observacoes_padrao ?? "",
    }));
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sessão expirada");
      if (!state.client_id) throw new Error("Selecione um cliente");
      if (state.items.length === 0) throw new Error("Adicione ao menos um item");

      const { data: quote, error } = await supabase
        .from("quotes")
        .insert({
          client_id: state.client_id,
          machine_id: state.machine_id,
          vendedor_id: user.id,
          condicao_pagamento: state.condicao_pagamento || null,
          prazo_entrega: state.prazo_entrega || null,
          validade_dias: state.validade_dias,
          desconto_percentual: state.desconto_percentual,
          desconto_valor: state.desconto_valor,
          frete: state.frete,
          observacoes: state.observacoes || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      const itemsPayload = state.items.map((i, idx) => ({
        quote_id: quote.id,
        product_id: i.product_id,
        codigo: i.codigo,
        descricao: i.descricao,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
        desconto_percentual: i.desconto_percentual,
        ordem: idx,
      }));
      const { error: ie } = await supabase
        .from("quote_items")
        .insert(itemsPayload);
      if (ie) throw ie;

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
