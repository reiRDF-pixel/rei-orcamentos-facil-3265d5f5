import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QuoteDocument, type QuoteDocumentData } from "@/components/quote-document";
import { downloadPdfFromElement } from "@/lib/pdf-download";
import { toast } from "sonner";

export const Route = createFileRoute("/q/$id")({
  ssr: false,
  component: PublicQuotePage,
});

function PublicQuotePage() {
  const { id } = Route.useParams();
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-quote", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_quote", {
        _quote_id: id,
      });
      if (error) throw error;
      return data as unknown as {
        quote: QuoteDocumentData["quote"] & { numero: number };
        client: QuoteDocumentData["client"];
        machine: QuoteDocumentData["machine"];
        items: QuoteDocumentData["items"];
        company: QuoteDocumentData["company"];
        vendedor_nome: string | null;
      } | null;
    },
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
          <h1 className="text-xl font-semibold text-foreground">
            Orçamento não encontrado
          </h1>
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
    <div className="min-h-screen bg-muted/40 p-4 lg:p-8">
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
              vendedorNome={data.vendedor_nome}
            />
          </div>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Este link é apenas para visualização. Para dúvidas, entre em contato com{" "}
          {data.company?.nome_fantasia || data.company?.razao_social || "a empresa"}.
        </p>
      </div>
    </div>
  );
}
