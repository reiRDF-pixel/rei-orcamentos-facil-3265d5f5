import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Download,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Send,
  Palette,
} from "lucide-react";
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
import { PDF_TEMPLATES, type PdfTemplateId } from "@/lib/pdf-templates";
import { QuoteDocument } from "@/components/quote-document";
import { downloadPdfFromElement } from "@/lib/pdf-download";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";

type QuoteStatus = Database["public"]["Enums"]["quote_status"];

export const Route = createFileRoute("/_authenticated/orcamentos/$id/")({
  component: OrcamentoDetailPage,
});

function OrcamentoDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [templateOverride, setTemplateOverride] = useState<PdfTemplateId | null>(null);
  const [downloading, setDownloading] = useState<null | "client" | "internal">(null);

  const { data, isLoading } = useQuery({
    queryKey: ["quote", id],
    queryFn: async () => {
      const { data: q, error } = await supabase
        .from("quotes")
        .select("*, client:clients(*), machine:machines(*), items:quote_items(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return q;
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: company } = useQuery({
    queryKey: ["company_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("company_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const { data: vendedor } = useQuery({
    queryKey: ["quote-vendedor", data?.vendedor_id, data?.id],
    enabled: !!data?.vendedor_id,
    queryFn: async () => {
      // Prefer snapshot stored on the quote (immutable history);
      // fall back to live profile for legacy quotes without a snapshot.
      const snap = (data as { vendedor_snapshot?: Record<string, unknown> } | null)
        ?.vendedor_snapshot;
      if (snap && Object.keys(snap).length > 0) return snap as Record<string, unknown>;
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data!.vendedor_id)
        .maybeSingle();
      return profile as Record<string, unknown> | null;
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
      const { error } = await supabase.from("quotes").update({ pdf_template: tpl }).eq("id", id);
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
  const vendedorNome =
    (vendedor?.nome_pdf as string | undefined) ??
    (vendedor?.full_name as string | undefined) ??
    null;
  const isOwner = user?.id === data.vendedor_id;
  const canEdit = isOwner && data.status !== "aprovado";

  const handleWhatsapp = () => {
    const phone = (client?.whatsapp ?? client?.phone ?? "").replace(/\D/g, "");
    if (!phone) {
      toast.error("Cliente sem WhatsApp cadastrado");
      return;
    }
    const url = `${window.location.origin}/q/${id}`;
    const text = `Olá ${client?.contato_nome ?? client?.razao_social ?? ""}, segue o orçamento #${String(data.numero).padStart(5, "0")} no valor de ${Number(data.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.\n\n${url}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleDownload = async (kind: "client" | "internal") => {
    const el = document.getElementById(
      kind === "internal" ? "quote-document-internal-pdf" : "quote-document-pdf",
    );
    if (!el) return;
    setDownloading(kind);
    try {
      const suffix = kind === "internal" ? "-interno" : "";
      await downloadPdfFromElement(el, `orcamento-${String(data.numero).padStart(5, "0")}${suffix}.pdf`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error(`Falha ao gerar PDF: ${msg}`);
      console.error("[pdf]", e);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
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
          {canEdit && (
            <Button asChild variant="outline">
              <Link to="/orcamentos/$id/editar" params={{ id }}>
                Editar
              </Link>
            </Button>
          )}
          <Button
            onClick={() => handleDownload("client")}
            disabled={downloading !== null}
            className="bg-primary text-primary-foreground hover:bg-primary-hover"
          >
            <Download className="size-4" />{" "}
            {downloading === "client" ? "Gerando..." : "PDF do cliente"}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleDownload("internal")}
            disabled={downloading !== null}
          >
            <Download className="size-4" />{" "}
            {downloading === "internal" ? "Gerando..." : "PDF interno"}
          </Button>
          <Button variant="outline" onClick={handleWhatsapp}>
            <MessageCircle className="size-4" /> WhatsApp
          </Button>
          {data.status === "rascunho" && (
            <Button onClick={() => setStatus.mutate("enviado")} variant="outline">
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
              <Button variant="outline" onClick={() => setStatus.mutate("recusado")}>
                <XCircle className="size-4" /> Recusado
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="overflow-hidden rounded-3xl border-border/60 p-0 shadow-elegant">
        <div id="quote-document-pdf">
          <QuoteDocument
            quote={data}
            client={client}
            machine={data.machine}
            items={items}
            company={company ?? null}
            vendedorNome={vendedorNome}
            vendedor={vendedor as never}
            templateId={currentTemplateId}
          />
        </div>
      </Card>

      {/* Off-screen internal doc used only for PDF capture */}
      <div
        style={{
          position: "absolute",
          left: -10000,
          top: 0,
          width: 900,
        }}
        aria-hidden
      >
        <div id="quote-document-internal-pdf">
          <QuoteDocument
            quote={data}
            client={client}
            machine={data.machine}
            items={items}
            company={company ?? null}
            vendedorNome={vendedorNome}
            vendedor={vendedor as never}
            templateId={currentTemplateId}
            variant="internal"
          />
        </div>
      </div>

      <QuoteAuditList quoteId={id} />
    </div>

  );
}
