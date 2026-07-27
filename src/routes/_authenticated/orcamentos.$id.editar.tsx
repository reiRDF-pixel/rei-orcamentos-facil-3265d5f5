import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { QuoteEditor, type QuoteFormState } from "@/components/quote-editor";
import { type QuoteItemDraft } from "@/lib/quote";
import { Skeleton } from "@/components/ui/skeleton";
import type { PdfTemplateId } from "@/lib/pdf-templates";
import { updateQuote } from "@/lib/quotes.functions";

export const Route = createFileRoute("/_authenticated/orcamentos/$id/editar")({
  component: EditarOrcamentoPage,
});

function EditarOrcamentoPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const updateQuoteFn = useServerFn(updateQuote);
  const [state, setState] = useState<QuoteFormState | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["quote-edit", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, items:quote_items(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (!data || state) return;
    setState({
      client_id: data.client_id,
      machine_id: data.machine_id,
      sales_rep_id: (data as unknown as { sales_rep_id: string | null }).sales_rep_id ?? null,
      condicao_pagamento: data.condicao_pagamento ?? "",
      tipo_frete: data.tipo_frete ?? "SEM FRETE",
      prazo_entrega: data.prazo_entrega ?? "",
      validade_dias: data.validade_dias,
      desconto_percentual: Number(data.desconto_percentual),
      desconto_valor: Number(data.desconto_valor),
      frete: Number(data.frete),
      observacoes: data.observacoes ?? "",
      pdf_template: (data.pdf_template as PdfTemplateId) ?? "azul",
      items: (data.items ?? [])
        .sort((a, b) => a.ordem - b.ordem)
        .map<QuoteItemDraft>((i) => ({
          id: i.id,
          product_id: i.product_id,
          codigo: i.codigo,
          codigo_interno:
            (i as unknown as { codigo_interno: string | null }).codigo_interno ?? null,
          marca: (i as unknown as { marca: string | null }).marca ?? null,
          descricao: i.descricao,
          quantidade: Number(i.quantidade),
          preco_unitario: Number(i.preco_unitario),
          desconto_percentual: Number(i.desconto_percentual),
          ordem: i.ordem,
        })),
    });
  }, [data, state]);

  const save = useMutation({
    mutationFn: async () => {
      if (!state) throw new Error("Carregando...");
      await updateQuoteFn({ data: { id, ...state } });
    },
    onSuccess: () => {
      toast.success("Orçamento atualizado");
      qc.invalidateQueries({ queryKey: ["quote", id] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      navigate({ to: "/orcamentos/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !state) {
    return (
      <div className="p-8">
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <QuoteEditor
      title={`Editar orçamento #${String(data?.numero ?? 0).padStart(5, "0")}`}
      state={state}
      setState={setState as React.Dispatch<React.SetStateAction<QuoteFormState>>}
      onSave={() => save.mutate()}
      saving={save.isPending}
    />
  );
}
