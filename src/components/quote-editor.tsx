import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Check,
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { DataPageHeader } from "@/components/data-page-header";
import { ClientQuickDialog } from "@/components/client-quick-dialog";
import { MachineQuickDialog } from "@/components/machine-quick-dialog";
import { formatBRL } from "@/lib/format";
import { itemTotal, quoteTotals, type QuoteItemDraft } from "@/lib/quote";
import { PDF_TEMPLATES, type PdfTemplateId } from "@/lib/pdf-templates";

export interface QuoteFormState {
  client_id: string;
  machine_id: string | null;
  sales_rep_id: string | null;
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
  const [confirmed, setConfirmed] = useState<Record<number, boolean>>({});
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newMachineOpen, setNewMachineOpen] = useState(false);

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

  const { data: salesReps } = useQuery({
    queryKey: ["sales_reps-min"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sales_reps" as never)
        .select("id, full_name, nome_pdf, is_default")
        .order("is_default", { ascending: false })
        .order("full_name");
      return (data ?? []) as unknown as Array<{
        id: string;
        full_name: string | null;
        nome_pdf: string | null;
        is_default: boolean;
      }>;
    },
  });

  // Auto-select default rep on new quotes.
  useEffect(() => {
    if (state.sales_rep_id) return;
    if (!salesReps || salesReps.length === 0) return;
    const def = salesReps.find((r) => r.is_default) ?? salesReps[0];
    if (def) setState((s) => (s.sales_rep_id ? s : { ...s, sales_rep_id: def.id }));
  }, [salesReps, state.sales_rep_id, setState]);

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

  const selectedClient = clients?.find((c) => c.id === state.client_id) ?? null;
  const trimmedSearch = clientSearch.trim().toLowerCase();
  const filteredClients = trimmedSearch
    ? (clients ?? []).filter((c) =>
        `${c.razao_social ?? ""} ${c.nome_fantasia ?? ""}`
          .toLowerCase()
          .includes(trimmedSearch),
      )
    : [];

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
          codigo_interno: null,
          marca: null,
          descricao: "",
          quantidade: 1,
          preco_unitario: 0,
          desconto_percentual: 0,
          ordem: s.items.length,
        },
      ],
    }));

  const removeItem = (idx: number) => {
    setState((s) => ({
      ...s,
      items: s.items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, ordem: i })),
    }));
    setConfirmed((c) => {
      const next: Record<number, boolean> = {};
      Object.keys(c).forEach((k) => {
        const n = Number(k);
        if (n < idx) next[n] = c[n];
        else if (n > idx) next[n - 1] = c[n];
      });
      return next;
    });
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    setState((s) => {
      if (target < 0 || target >= s.items.length) return s;
      const items = [...s.items];
      [items[idx], items[target]] = [items[target], items[idx]];
      return { ...s, items: items.map((it, i) => ({ ...it, ordem: i })) };
    });
    setConfirmed((c) => {
      if (target < 0 || target >= state.items.length) return c;
      const next = { ...c };
      const a = next[idx];
      const b = next[target];
      if (b) next[idx] = b;
      else delete next[idx];
      if (a) next[target] = a;
      else delete next[target];
      return next;
    });
  };

  const updateItem = (idx: number, patch: Partial<QuoteItemDraft>) => {
    setState((s) => ({
      ...s,
      items: s.items.map((i, k) => (k === idx ? { ...i, ...patch } : i)),
    }));
    setConfirmed((c) => (c[idx] ? { ...c, [idx]: false } : c));
  };

  const confirmItem = (idx: number) => {
    const item = state.items[idx];
    if (!item?.descricao?.trim()) {
      toast.error("Informe o nome do item antes de confirmar");
      return;
    }
    if (!(item.quantidade > 0)) {
      toast.error("A quantidade deve ser maior que zero");
      return;
    }
    setConfirmed((c) => ({ ...c, [idx]: true }));
    toast.success("Item confirmado");
  };

  const { subtotal, total } = quoteTotals(
    state.items,
    state.desconto_percentual,
    state.desconto_valor,
    state.frete,
  );
  const totalQtd = state.items.reduce((s, i) => s + (Number(i.quantidade) || 0), 0);

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/orcamentos">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      </Button>

      <DataPageHeader eyebrow="Vendas" title={title} />

      <Card className="mb-6 rounded-3xl border-border/60 p-6 shadow-elegant">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Vendedor responsável
        </h2>
        {salesReps && salesReps.length > 0 ? (
          <div className="max-w-md space-y-2">
            <Label>Quem está fazendo este orçamento?</Label>
            <Select
              value={state.sales_rep_id ?? ""}
              onValueChange={(v) => setField("sales_rep_id", v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {salesReps.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nome_pdf || r.full_name || "(sem nome)"}
                    {r.is_default ? " · Padrão" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Os dados desta pessoa (nome, telefone, assinatura, PIX) aparecem no PDF e no
              link enviado ao cliente.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum vendedor cadastrado. Vá em <b>Meu perfil</b> para cadastrar os vendedores
            desta conta. Enquanto isso, os dados do perfil da conta serão usados no PDF.
          </p>
        )}
      </Card>

      <Card className="mb-6 rounded-3xl border-border/60 p-6 shadow-elegant">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Cliente e máquina
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Cliente *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-primary hover:text-primary"
                onClick={() => setNewClientOpen(true)}
              >
                <Plus className="size-3" /> Novo cliente
              </Button>
            </div>
            <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between font-normal",
                    !selectedClient && "text-muted-foreground",
                  )}
                >
                  {selectedClient
                    ? selectedClient.nome_fantasia || selectedClient.razao_social
                    : "Pesquise o cliente pelo nome..."}
                  <ChevronsUpDown className="size-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
              >
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Digite o nome do cliente ou empresa..."
                    value={clientSearch}
                    onValueChange={setClientSearch}
                  />
                  <CommandList>
                    {trimmedSearch.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-foreground">
                        Comece a digitar para pesquisar ou cadastre um novo cliente.
                      </div>
                    ) : filteredClients.length === 0 ? (
                      <CommandEmpty>
                        Nenhum cliente encontrado.
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="mt-1 h-auto p-0 text-primary"
                          onClick={() => {
                            setClientPickerOpen(false);
                            setNewClientOpen(true);
                          }}
                        >
                          Cadastrar novo cliente
                        </Button>
                      </CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {filteredClients.slice(0, 30).map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.id}
                            onSelect={() => {
                              setField("client_id", c.id);
                              setField("machine_id", null);
                              setClientPickerOpen(false);
                              setClientSearch("");
                            }}
                          >
                            <Check
                              className={cn(
                                "size-4",
                                state.client_id === c.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {c.nome_fantasia || c.razao_social}
                              </span>
                              {c.nome_fantasia && c.razao_social && (
                                <span className="text-xs text-muted-foreground">
                                  {c.razao_social}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <ClientQuickDialog
              open={newClientOpen}
              onOpenChange={setNewClientOpen}
              onCreated={(c) => {
                setField("client_id", c.id);
                setField("machine_id", null);
              }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Máquina (opcional)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-primary hover:text-primary"
                onClick={() => setNewMachineOpen(true)}
              >
                <Plus className="size-3" /> Nova máquina
              </Button>
            </div>
            <Select
              value={state.machine_id ?? ""}
              onValueChange={(v) => setField("machine_id", v || null)}
              disabled={!state.client_id}
            >
              <SelectTrigger>
                <SelectValue placeholder={state.client_id ? "Nenhuma" : "Selecione um cliente primeiro"} />
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
            <MachineQuickDialog
              open={newMachineOpen}
              onOpenChange={setNewMachineOpen}
              clientId={state.client_id || null}
              onCreated={(m) => setField("machine_id", m.id)}
            />
          </div>
        </div>
      </Card>

      <Card className="mb-6 rounded-3xl border-border/60 p-6 shadow-elegant">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Itens
          </h2>
          <span className="text-xs text-muted-foreground">
            {state.items.length} {state.items.length === 1 ? "item" : "itens"} · Qtd total:{" "}
            <span className="font-semibold text-foreground">{totalQtd}</span>
          </span>
        </div>

        {state.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum item. Clique em "Adicionar item" para começar.
          </p>
        ) : (
          <div className="space-y-3">
            {state.items.map((item, idx) => {
              const isConfirmed = !!confirmed[idx];
              return (
                <div
                  key={idx}
                  className={`grid grid-cols-12 items-end gap-2 rounded-2xl border p-3 transition-colors ${
                    isConfirmed ? "border-success/60 bg-success/5" : "border-border/60"
                  }`}
                >
                  <div className="col-span-12 flex items-center justify-between md:col-span-12">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Item {idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        title="Mover para cima"
                        disabled={idx === 0}
                        onClick={() => moveItem(idx, -1)}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        title="Mover para baixo"
                        disabled={idx === state.items.length - 1}
                        onClick={() => moveItem(idx, 1)}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <Label className="text-[10px]">Cód. cliente</Label>
                    <Input
                      placeholder="Código do cliente"
                      value={item.codigo ?? ""}
                      onChange={(e) => updateItem(idx, { codigo: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (idx === state.items.length - 1 && item.descricao.trim() && item.quantidade > 0) {
                            addItem();
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <Label className="text-[10px]">Nosso código</Label>
                    <Input
                      placeholder="Buscar / nosso cód."
                      value={item.codigo_interno ?? ""}
                      onChange={(e) => updateItem(idx, { codigo_interno: e.target.value })}
                      onKeyDown={async (e) => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        const code = (item.codigo_interno ?? "").trim();
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
                          codigo_interno: data.codigo,
                          preco_unitario: Number(data.preco_venda),
                          descricao: item.descricao || data.descricao,
                        });
                        toast.success("Produto carregado");
                      }}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-1">
                    <Label className="text-[10px]">Marca</Label>
                    <Input
                      placeholder="Marca"
                      value={item.marca ?? ""}
                      onChange={(e) => updateItem(idx, { marca: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (idx === state.items.length - 1 && item.descricao.trim() && item.quantidade > 0) {
                            addItem();
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <Label className="text-[10px]">Item / descrição *</Label>
                    <Input
                      placeholder="Ex: Filtro de óleo Mann W1160"
                      value={item.descricao}
                      onChange={(e) => updateItem(idx, { descricao: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (idx === state.items.length - 1 && item.descricao.trim() && item.quantidade > 0) {
                            addItem();
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <Label className="text-[10px]">Qtd</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.quantidade}
                      onChange={(e) => updateItem(idx, { quantidade: Number(e.target.value) })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (idx === state.items.length - 1 && item.descricao.trim() && item.quantidade > 0) {
                            addItem();
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Label className="text-[10px]">Preço un. (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.preco_unitario}
                      onChange={(e) =>
                        updateItem(idx, { preco_unitario: Number(e.target.value) })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (idx === state.items.length - 1 && item.descricao.trim() && item.quantidade > 0) {
                            addItem();
                          }
                        }
                      }}
                    />
                  </div>

                  <div className="col-span-3 md:col-span-1 text-right font-mono text-sm font-semibold">
                    {formatBRL(itemTotal(item))}
                  </div>
                  <div className="col-span-1 flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      title={isConfirmed ? "Item confirmado" : "Confirmar item"}
                      onClick={() => confirmItem(idx)}
                    >
                      <Check
                        className={`size-4 ${isConfirmed ? "text-success" : "text-muted-foreground"}`}
                      />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(idx)}
                      title="Remover item"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex justify-center">
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
              <span className="text-muted-foreground">Qtd total de itens</span>
              <span className="font-mono font-semibold">{totalQtd}</span>
            </div>
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

      <div className="mt-8 flex justify-end">
        <Button
          size="lg"
          onClick={onSave}
          disabled={saving}
          className="rounded-2xl bg-primary text-primary-foreground shadow-lifted hover:bg-primary-hover"
        >
          <Save className="size-4" /> {saving ? "Salvando..." : "Salvar orçamento"}
        </Button>
      </div>
    </div>
  );
}
