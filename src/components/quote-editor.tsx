import { Plus, Trash2, Save, ArrowLeft, Check } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataPageHeader } from "@/components/data-page-header";
import { formatBRL } from "@/lib/format";
import { itemTotal, quoteTotals, type QuoteItemDraft } from "@/lib/quote";
import { PDF_TEMPLATES, type PdfTemplateId } from "@/lib/pdf-templates";

export interface QuoteFormState {
  client_id: string;
  machine_id: string | null;
  condicao_pagamento: string;
  tipo_frete: string;
  prazo_entrega: string;
  validade_dias: number;
  desconto_percentual: number;
  desconto_valor: number;
  frete: number;
  observacoes: string;
  pdf_template: PdfTemplateId;
  items: QuoteItemDraft[];
}

const TIPO_FRETE_OPTIONS = ["FRETE FOB", "FRETE CIF", "SEM FRETE"];

interface Props {
  title: string;
  state: QuoteFormState;
  setState: React.Dispatch<React.SetStateAction<QuoteFormState>>;
  onSave: () => void;
  saving: boolean;
}

export function QuoteEditor({ title, state, setState, onSave, saving }: Props) {
  const { data: clients } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, razao_social, nome_fantasia")
        .order("razao_social");
      return data ?? [];
    },
  });

  const { data: machines } = useQuery({
    queryKey: ["machines-by-client", state.client_id],
    enabled: !!state.client_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("machines")
        .select("id, marca, modelo, numero_serie")
        .eq("client_id", state.client_id);
      return data ?? [];
    },
  });

  const setField = <K extends keyof QuoteFormState>(k: K, v: QuoteFormState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const addItem = () =>
    setState((s) => ({
      ...s,
      items: [
        ...s.items,
        {
          product_id: null,
          codigo: null,
          descricao: "",
          quantidade: 1,
          preco_unitario: 0,
          desconto_percentual: 0,
          ordem: s.items.length,
        },
      ],
    }));

  const removeItem = (idx: number) =>
    setState((s) => ({ ...s, items: s.items.filter((_, i) => i !== idx) }));

  const updateItem = (idx: number, patch: Partial<QuoteItemDraft>) =>
    setState((s) => ({
      ...s,
      items: s.items.map((i, k) => (k === idx ? { ...i, ...patch } : i)),
    }));

  const { subtotal, total } = quoteTotals(
    state.items,
    state.desconto_percentual,
    state.desconto_valor,
    state.frete,
  );

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/orcamentos">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      </Button>

      <DataPageHeader
        eyebrow="Vendas"
        title={title}
        actions={
          <Button
            size="lg"
            onClick={onSave}
            disabled={saving}
            className="rounded-2xl bg-primary text-primary-foreground shadow-lifted hover:bg-primary-hover"
          >
            <Save className="size-4" /> {saving ? "Salvando..." : "Salvar orçamento"}
          </Button>
        }
      />

      <Card className="mb-6 rounded-3xl border-border/60 p-6 shadow-elegant">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Cliente e máquina
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select
              value={state.client_id}
              onValueChange={(v) => {
                setField("client_id", v);
                setField("machine_id", null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome_fantasia || c.razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Máquina (opcional)</Label>
            <Select
              value={state.machine_id ?? ""}
              onValueChange={(v) => setField("machine_id", v || null)}
              disabled={!state.client_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhuma" />
              </SelectTrigger>
              <SelectContent>
                {machines?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.marca} {m.modelo}
                    {m.numero_serie ? ` · ${m.numero_serie}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="mb-6 rounded-3xl border-border/60 p-6 shadow-elegant">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Itens
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="rounded-xl"
          >
            <Plus className="size-4" /> Adicionar item
          </Button>
        </div>

        {state.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum item. Clique em "Adicionar item" para começar.
          </p>
        ) : (
          <div className="space-y-3">
            {state.items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 items-end gap-2 rounded-2xl border border-border/60 p-3"
              >
                <div className="col-span-6 md:col-span-2">
                  <Label className="text-[10px]">Código do produto</Label>
                  <div className="flex gap-1">
                    <Input
                      placeholder="Buscar código"
                      value={item.codigo ?? ""}
                      onChange={(e) => updateItem(idx, { codigo: e.target.value })}
                      onKeyDown={async (e) => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        const code = (item.codigo ?? "").trim();
                        if (!code) return;
                        const { data } = await supabase
                          .from("products")
                          .select("id, codigo, descricao, preco_venda")
                          .eq("codigo", code)
                          .maybeSingle();
                        if (!data) {
                          toast.error("Código não encontrado");
                          return;
                        }
                        updateItem(idx, {
                          product_id: data.id,
                          codigo: data.codigo,
                          preco_unitario: Number(data.preco_venda),
                          descricao: item.descricao || data.descricao,
                        });
                        toast.success("Produto carregado");
                      }}
                    />
                  </div>
                </div>
                <div className="col-span-6 md:col-span-4">
                  <Label className="text-[10px]">Item / descrição *</Label>
                  <Input
                    placeholder="Ex: Filtro de óleo Mann W1160"
                    value={item.descricao}
                    onChange={(e) => updateItem(idx, { descricao: e.target.value })}
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Label className="text-[10px]">Qtd</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.quantidade}
                    onChange={(e) => updateItem(idx, { quantidade: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Label className="text-[10px]">Preço un. (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.preco_unitario}
                    onChange={(e) => updateItem(idx, { preco_unitario: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-3 md:col-span-1 text-right font-mono text-sm font-semibold">
                  {formatBRL(itemTotal(item))}
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="rounded-3xl border-border/60 p-6 shadow-elegant md:col-span-2">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Condições
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Condição de pagamento</Label>
              <Input
                value={state.condicao_pagamento}
                onChange={(e) => setField("condicao_pagamento", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Frete</Label>
              <Select value={state.tipo_frete} onValueChange={(v) => setField("tipo_frete", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_FRETE_OPTIONS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prazo de entrega</Label>
              <Input
                value={state.prazo_entrega}
                onChange={(e) => setField("prazo_entrega", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Validade (dias)</Label>
              <Input
                type="number"
                value={state.validade_dias}
                onChange={(e) => setField("validade_dias", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Modelo de PDF</Label>
              <Select
                value={state.pdf_template}
                onValueChange={(v) => setField("pdf_template", v as PdfTemplateId)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PDF_TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Observações</Label>
              <Textarea
                rows={3}
                value={state.observacoes}
                onChange={(e) => setField("observacoes", e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border-border/60 p-6 shadow-elegant">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Totais
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono font-semibold">{formatBRL(subtotal)}</span>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px]">Desconto (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={state.desconto_percentual}
                onChange={(e) => setField("desconto_percentual", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px]">Desconto (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={state.desconto_valor}
                onChange={(e) => setField("desconto_valor", Number(e.target.value))}
              />
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
              <span>TOTAL</span>
              <span className="font-mono text-primary">{formatBRL(total)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
