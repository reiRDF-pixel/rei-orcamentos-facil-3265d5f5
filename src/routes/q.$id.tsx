import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, Download, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QuoteDocument, type QuoteDocumentData } from "@/components/quote-document";
import { downloadPdfFromElement } from "@/lib/pdf-download";
import { toast } from "sonner";
import { getPublicQuote, respondPublicQuote } from "@/lib/quotes.functions";

export const Route = createFileRoute("/q/$id")({
  ssr: false,
  component: PublicQuotePage,
  head: ({ params }) => ({
    meta: [
      { title: "Orçamento — Rei dos Filtros" },
      {
        name: "description",
        content:
          "Visualização do orçamento emitido pela Rei dos Filtros. Baixe o PDF ou entre em contato com o vendedor responsável.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Orçamento — Rei dos Filtros" },
      {
        property: "og:description",
        content: "Visualização do orçamento emitido pela Rei dos Filtros.",
      },
      {
        property: "og:url",
        content: `https://rei-orcamentos-facil.lovable.app/q/${params.id}`,
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      {
        rel: "canonical",
        href: `https://rei-orcamentos-facil.lovable.app/q/${params.id}`,
      },
    ],
  }),
});

function PublicQuotePage() {
  const { id } = Route.useParams();
  const [downloading, setDownloading] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const getPublicQuoteFn = useServerFn(getPublicQuote);
  const respondPublicQuoteFn = useServerFn(respondPublicQuote);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-quote", id],
    queryFn: async () => {
      const data = await getPublicQuoteFn({ data: { token: id } });
      return data as unknown as {
        quote: QuoteDocumentData["quote"] & {
          numero: number;
          client_decision_at?: string | null;
          client_decision_by?: string | null;
          client_decision_note?: string | null;
        };
        client: QuoteDocumentData["client"];
        machine: QuoteDocumentData["machine"];
        items: QuoteDocumentData["items"];
        company: QuoteDocumentData["company"];
        vendedor: QuoteDocumentData["vendedor"];
        vendedor_nome: string | null;
      } | null;
    },
  });

  const respond = useMutation({
    mutationFn: (decision: "aprovado" | "recusado") =>
      respondPublicQuoteFn({ data: { token: id, decision, name, note } }),
    onSuccess: async (_, decision) => {
      toast.success(decision === "aprovado" ? "Orçamento aprovado" : "Resposta registrada");
      await queryClient.invalidateQueries({ queryKey: ["public-quote", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="mx-auto h-96 w-full max-w-4xl rounded-3xl" />
      </div>
    );
  }

  if (error || !data || !data.quote) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8 text-center">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Orçamento não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O link pode ter expirado ou está incorreto.
          </p>
        </div>
      </div>
    );
  }

  const handleDownload = async () => {
    const el = document.getElementById("quote-document-pdf");
    if (!el) return;
    setDownloading(true);
    try {
      await downloadPdfFromElement(
        el,
        `orcamento-${String(data.quote.numero).padStart(5, "0")}.pdf`,
      );
    } catch (e) {
      toast.error("Falha ao gerar PDF");
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted/40 p-4 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex justify-end">
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-primary text-primary-foreground hover:bg-primary-hover"
          >
            {downloading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {downloading ? "Gerando..." : "Baixar PDF"}
          </Button>
        </div>
        <Card className="overflow-hidden rounded-3xl border-border/60 p-0 shadow-elegant">
          <div id="quote-document-pdf">
            <QuoteDocument
              quote={data.quote}
              client={data.client}
              machine={data.machine}
              items={data.items}
              company={data.company}
              vendedor={data.vendedor}
              vendedorNome={data.vendedor_nome}
            />
          </div>
        </Card>
        {data.quote.status === "enviado" && (
          <Card className="mt-6 border-border/60 p-5 shadow-elegant sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-foreground">Responder ao orçamento</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Confirme sua decisão. Depois de enviada, ela não poderá ser alterada por este link.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="decision-name">Seu nome (opcional)</Label>
                <Input
                  id="decision-name"
                  value={name}
                  maxLength={120}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Quem está respondendo"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="decision-note">Observação (opcional)</Label>
                <Textarea
                  id="decision-note"
                  value={note}
                  maxLength={1000}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Escreva uma observação para o vendedor"
                />
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button
                disabled={respond.isPending}
                onClick={() => respond.mutate("aprovado")}
                className="bg-success text-success-foreground hover:opacity-90"
              >
                {respond.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Aprovar orçamento
              </Button>
              <Button
                disabled={respond.isPending}
                variant="outline"
                onClick={() => respond.mutate("recusado")}
              >
                <XCircle className="size-4" /> Recusar
              </Button>
            </div>
          </Card>
        )}
        {(data.quote.status === "aprovado" || data.quote.status === "recusado") && (
          <Card className="mt-6 border-border/60 p-6 text-center shadow-elegant">
            {data.quote.status === "aprovado" ? (
              <CheckCircle2 className="mx-auto size-8 text-success" />
            ) : (
              <XCircle className="mx-auto size-8 text-muted-foreground" />
            )}
            <h2 className="mt-3 text-lg font-bold text-foreground">
              {data.quote.status === "aprovado" ? "Orçamento aprovado" : "Orçamento recusado"}
            </h2>
            {data.quote.client_decision_by && (
              <p className="mt-1 text-sm text-muted-foreground">
                Resposta de {data.quote.client_decision_by}
              </p>
            )}
            {data.quote.client_decision_note && (
              <p className="mt-3 text-sm text-foreground">“{data.quote.client_decision_note}”</p>
            )}
          </Card>
        )}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Para dúvidas, entre em contato com{" "}
          {data.company?.nome_fantasia || data.company?.razao_social || "a empresa"}.
        </p>
      </div>
    </main>
  );
}
