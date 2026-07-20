import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { QuoteEditor, type QuoteFormState } from "@/components/quote-editor";
import { itemTotal, quoteTotals, type QuoteItemDraft } from "@/lib/quote";
import { Skeleton } from "@/components/ui/skeleton";
import type { PdfTemplateId } from "@/lib/pdf-templates";

export const Route = createFileRoute("/_authenticated/orcamentos/$id/editar")({
  component: EditarOrcamentoPage,
});

function EditarOrcamentoPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
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
  });

  useEffect(() => {
    if (!data || state) return;
    setState({
      client_id: data.client_id,
      machine_id: data.machine_id,
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
      if (!state.client_id) throw new Error("Selecione um cliente");
      if (state.items.length === 0) throw new Error("Adicione ao menos um item");

      const { subtotal, total } = quoteTotals(
        state.items,
        state.desconto_percentual,
        state.desconto_valor,
        state.frete,
      );

      const { error } = await supabase
        .from("quotes")
        .update({
          client_id: state.client_id,
          machine_id: state.machine_id,
          condicao_pagamento: state.condicao_pagamento || null,
          tipo_frete: state.tipo_frete || null,
          prazo_entrega: state.prazo_entrega || null,
          validade_dias: state.validade_dias,
          desconto_percentual: state.desconto_percentual,
          desconto_valor: state.desconto_valor,
          frete: state.frete,
          subtotal,
          total,
          observacoes: state.observacoes || null,
          pdf_template: state.pdf_template,
        })
        .eq("id", id);
      if (error) throw error;

      // Replace items: delete existing and insert current
      const { error: de } = await supabase
        .from("quote_items")
        .delete()
        .eq("quote_id", id);
      if (de) throw de;

      const itemsPayload = state.items.map((i, idx) => ({
        quote_id: id,
        product_id: i.product_id,
        codigo: i.codigo,
        descricao: i.descricao,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
        desconto_percentual: i.desconto_percentual,
        total: itemTotal(i),
        ordem: idx,
      }));
      const { error: ie } = await supabase.from("quote_items").insert(itemsPayload);
      if (ie) throw ie;
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
