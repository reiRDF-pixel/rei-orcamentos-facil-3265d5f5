import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronsUpDown, Plus, Zap } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ClientQuickDialog } from "@/components/client-quick-dialog";
import { DataPageHeader } from "@/components/data-page-header";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { createQuote } from "@/lib/quotes.functions";

export const Route = createFileRoute("/_authenticated/balcao")({
  component: BalcaoPage,
  head: () => ({
    meta: [
      { title: "Balcão rápido — Rei dos Filtros" },
      {
        name: "description",
        content:
          "Modo balcão: gere um orçamento em segundos pelo celular com cliente, item e preço.",
      },
      { property: "og:title", content: "Balcão rápido — Rei dos Filtros" },
      {
        property: "og:description",
        content: "Orçamento rápido de balcão em três campos, direto do celular.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function BalcaoPage() {
  const navigate = useNavigate();
  const createQuoteFn = useServerFn(createQuote);

  const [clientId, setClientId] = useState("");
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [preco, setPreco] = useState(0);

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

  const selectedClient = clients?.find((c) => c.id === clientId) ?? null;
  const term = clientSearch.trim().toLowerCase();
  const filteredClients = useMemo(
    () =>
      term
        ? (clients ?? []).filter((c) =>
            `${c.razao_social ?? ""} ${c.nome_fantasia ?? ""}`.toLowerCase().includes(term),
          )
        : [],
    [clients, term],
  );

  const total = quantidade * preco;

  const save = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Selecione o cliente");
      if (quantidade <= 0) throw new Error("A quantidade deve ser maior que zero");
      const quote = await createQuoteFn({
        data: {
          client_id: clientId,
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
          items: [
            {
              product_id: null,
              codigo: null,
              codigo_interno: null,
              marca: null,
              descricao: descricao.trim(),
              quantidade,
              preco_unitario: preco,
              desconto_percentual: 0,
              ordem: 0,
            },
          ],
        },
      });
      return quote.id;
    },
    onSuccess: (id) => {
      toast.success("Orçamento de balcão criado");
      navigate({ to: "/orcamentos/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-md p-4 sm:p-6">
      <DataPageHeader
        eyebrow="Vendas"
        title="Balcão rápido"
        description="Três campos e o orçamento está pronto."
      />

      <Card className="space-y-5 rounded-3xl border-border/60 p-5 shadow-elegant">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>1 · Cliente</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-primary hover:text-primary"
              onClick={() => setNewClientOpen(true)}
            >
              <Plus className="size-3" /> Novo
            </Button>
          </div>
          <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                className={cn(
                  "h-12 w-full justify-between text-base font-normal",
                  !selectedClient && "text-muted-foreground",
                )}
              >
                {selectedClient
                  ? selectedClient.nome_fantasia || selectedClient.razao_social
                  : "Pesquisar cliente..."}
                <ChevronsUpDown className="size-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Digite o nome do cliente..."
                  value={clientSearch}
                  onValueChange={setClientSearch}
                />
                <CommandList>
                  {term.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      Comece a digitar para pesquisar.
                    </div>
                  ) : filteredClients.length === 0 ? (
                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {filteredClients.slice(0, 20).map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.id}
                          onSelect={() => {
                            setClientId(c.id);
                            setClientPickerOpen(false);
                            setClientSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "size-4",
                              clientId === c.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {c.nome_fantasia || c.razao_social}
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
            onCreated={(c) => setClientId(c.id)}
          />
        </div>

        <div className="space-y-2">
          <Label>2 · Item</Label>
          <Input
            className="h-12 text-base"
            placeholder="Ex: Filtro de óleo W1160"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Qtd</Label>
            <Input
              className="h-12 text-base"
              type="number"
              inputMode="decimal"
              step="1"
              value={quantidade}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => setQuantidade(parseQuantity(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>3 · Preço un.</Label>
            <Input
              className="h-12 text-base"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={preco}
              onChange={(e) => setPreco(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Total
          </span>
          <span className="font-mono text-lg font-bold">{formatBRL(total)}</span>
        </div>

        <Button
          size="lg"
          className="h-14 w-full rounded-2xl bg-primary text-base text-primary-foreground shadow-lifted hover:bg-primary-hover"
          disabled={save.isPending}
          onClick={() => save.mutate()}
        >
          <Zap className="size-5" /> {save.isPending ? "Gerando..." : "Gerar orçamento"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Precisa de mais itens ou condições? Abra o orçamento gerado e continue editando.
        </p>
      </Card>
    </div>
  );
}
