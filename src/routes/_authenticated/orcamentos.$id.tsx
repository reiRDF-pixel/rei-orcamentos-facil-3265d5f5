import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Printer, MessageCircle, CheckCircle2, XCircle, Send, Palette } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatBRL,
  formatDate,
  QUOTE_STATUS_CLASS,
  QUOTE_STATUS_LABEL,
} from "@/lib/format";
import { getPdfTemplate, PDF_TEMPLATES, type PdfTemplateId } from "@/lib/pdf-templates";
import type { Database } from "@/integrations/supabase/types";

type QuoteStatus = Database["public"]["Enums"]["quote_status"];

export const Route = createFileRoute("/_authenticated/orcamentos/$id")({
  component: OrcamentoDetailPage,
});

function OrcamentoDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [templateOverride, setTemplateOverride] = useState<PdfTemplateId | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["quote", id],
    queryFn: async () => {
      const { data: q, error } = await supabase
        .from("quotes")
        .select(
          "*, client:clients(*), machine:machines(*), items:quote_items(*)",
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return q;
    },
  });

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

  const setStatus = useMutation({
    mutationFn: async (status: QuoteStatus) => {
      const patch: {
        status: QuoteStatus;
        sent_at?: string;
        approved_at?: string;
      } = { status };
      if (status === "enviado") patch.sent_at = new Date().toISOString();
      if (status === "aprovado") patch.approved_at = new Date().toISOString();
      const { error } = await supabase.from("quotes").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["quote", id] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveTemplate = useMutation({
    mutationFn: async (tpl: PdfTemplateId) => {
      const { error } = await supabase
        .from("quotes")
        .update({ pdf_template: tpl })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Modelo salvo");
      qc.invalidateQueries({ queryKey: ["quote", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <div className="p-8">
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    );
  }

  const client = data.client;
  const items = (data.items ?? []).sort((a, b) => a.ordem - b.ordem);
  const currentTemplateId = (templateOverride ??
    (data.pdf_template as PdfTemplateId | null) ??
    "azul") as PdfTemplateId;
  const tpl = getPdfTemplate(currentTemplateId);

  const handleWhatsapp = () => {
    const phone = (client?.whatsapp ?? client?.phone ?? "").replace(/\D/g, "");
    if (!phone) {
      toast.error("Cliente sem WhatsApp cadastrado");
      return;
    }
    const url = `${window.location.origin}/orcamentos/${id}`;
    const text = `Olá ${client?.contato_nome ?? client?.razao_social ?? ""}, segue o orçamento #${String(data.numero).padStart(5, "0")} no valor de ${formatBRL(data.total)}.\n\n${url}`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  };

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link to="/orcamentos">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-1">
            <Palette className="size-4 text-muted-foreground" />
            <Select
              value={currentTemplateId}
              onValueChange={(v) => {
                setTemplateOverride(v as PdfTemplateId);
                saveTemplate.mutate(v as PdfTemplateId);
              }}
            >
              <SelectTrigger className="h-8 border-0 shadow-none focus:ring-0">
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
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> Imprimir / PDF
          </Button>
          <Button variant="outline" onClick={handleWhatsapp}>
            <MessageCircle className="size-4" /> WhatsApp
          </Button>
          {data.status === "rascunho" && (
            <Button
              onClick={() => setStatus.mutate("enviado")}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              <Send className="size-4" /> Marcar como enviado
            </Button>
          )}
          {data.status === "enviado" && (
            <>
              <Button
                onClick={() => setStatus.mutate("aprovado")}
                className="bg-success text-success-foreground hover:opacity-90"
              >
                <CheckCircle2 className="size-4" /> Aprovado
              </Button>
              <Button
                variant="outline"
                onClick={() => setStatus.mutate("recusado")}
              >
                <XCircle className="size-4" /> Recusado
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="overflow-hidden rounded-3xl border-border/60 p-0 shadow-elegant print:border-0 print:shadow-none">
        <header
          className="flex flex-wrap items-start justify-between gap-4 p-8"
          style={{ background: tpl.headerBg, color: tpl.headerText }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">
              Orçamento
            </p>
            <h1 className="mt-1 font-mono text-3xl font-bold tracking-tight">
              #{String(data.numero).padStart(5, "0")}
            </h1>
            <p className="mt-1 text-xs opacity-80">
              Emissão: {formatDate(data.data_emissao)} · Validade:{" "}
              {data.validade_dias} dias
            </p>
            <span
              className="mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold"
              style={{ background: tpl.accent, color: "#ffffff" }}
            >
              {QUOTE_STATUS_LABEL[data.status] ?? data.status}
            </span>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold text-base">
              {company?.nome_fantasia || company?.razao_social || "Rei dos Filtros"}
            </p>
            {company?.cnpj && <p className="opacity-90">CNPJ {company.cnpj}</p>}
            {company?.endereco && (
              <p className="opacity-90">
                {company.endereco}
                {company.numero ? `, ${company.numero}` : ""}
              </p>
            )}
            {company?.cidade && (
              <p className="opacity-90">
                {company.cidade}
                {company.estado ? `/${company.estado}` : ""}
              </p>
            )}
            {company?.phone && <p className="opacity-90">{company.phone}</p>}
          </div>
        </header>

        <div className="p-8">
          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: tpl.accent }}
              >
                Cliente
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {client?.nome_fantasia || client?.razao_social}
              </p>
              {client?.cnpj_cpf && (
                <p className="text-xs text-muted-foreground">{client.cnpj_cpf}</p>
              )}
              {client?.endereco && (
                <p className="text-xs text-muted-foreground">
                  {client.endereco}
                  {client.numero ? `, ${client.numero}` : ""} - {client.cidade}
                  {client.estado ? `/${client.estado}` : ""}
                </p>
              )}
              {client?.phone && (
                <p className="text-xs text-muted-foreground">{client.phone}</p>
              )}
            </div>
            {data.machine && (
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: tpl.accent }}
                >
                  Máquina
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {data.machine.marca} {data.machine.modelo}
                </p>
                {data.machine.numero_serie && (
                  <p className="text-xs text-muted-foreground">
                    Série: {data.machine.numero_serie}
                  </p>
                )}
                {data.machine.ano && (
                  <p className="text-xs text-muted-foreground">
                    Ano: {data.machine.ano}
                  </p>
                )}
              </div>
            )}
          </section>

          <table className="mb-6 w-full overflow-hidden rounded-xl text-left text-sm">
            <thead
              className="text-[10px] uppercase tracking-wider"
              style={{ background: tpl.tableHeaderBg, color: tpl.tableHeaderText }}
            >
              <tr>
                <th className="px-3 py-2 font-bold">Item</th>
                <th className="px-3 py-2 text-right font-bold">Qtd</th>
                <th className="px-3 py-2 text-right font-bold">Preço un.</th>
                <th className="px-3 py-2 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="px-3 py-2">{i.descricao}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {i.quantidade}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {formatBRL(i.preco_unitario)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold">
                    {formatBRL(i.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto max-w-xs space-y-1 text-sm">
            <Row label="Subtotal" value={formatBRL(data.subtotal)} />
            {Number(data.desconto_percentual) > 0 && (
              <Row
                label={`Desconto (${data.desconto_percentual}%)`}
                value={`- ${formatBRL(
                  (Number(data.subtotal) * Number(data.desconto_percentual)) / 100,
                )}`}
              />
            )}
            {Number(data.desconto_valor) > 0 && (
              <Row
                label="Desconto (valor)"
                value={`- ${formatBRL(data.desconto_valor)}`}
              />
            )}
            <div
              className="mt-2 flex justify-between rounded-xl px-4 py-3 text-base font-bold"
              style={{ background: tpl.totalBg, color: tpl.totalText }}
            >
              <span>TOTAL</span>
              <span className="font-mono">{formatBRL(data.total)}</span>
            </div>
          </div>

          {(data.condicao_pagamento ||
            data.tipo_frete ||
            data.prazo_entrega ||
            data.observacoes) && (
            <section className="mt-6 space-y-3 border-t border-border pt-6 text-sm">
              {data.condicao_pagamento && (
                <p>
                  <b style={{ color: tpl.accent }}>Condição de pagamento:</b>{" "}
                  {data.condicao_pagamento}
                </p>
              )}
              {data.tipo_frete && (
                <p>
                  <b style={{ color: tpl.accent }}>Frete:</b> {data.tipo_frete}
                </p>
              )}
              {data.prazo_entrega && (
                <p>
                  <b style={{ color: tpl.accent }}>Prazo de entrega:</b>{" "}
                  {data.prazo_entrega}
                </p>
              )}
              {data.observacoes && (
                <div>
                  <p className="font-bold" style={{ color: tpl.accent }}>
                    Observações
                  </p>
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {data.observacoes}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
