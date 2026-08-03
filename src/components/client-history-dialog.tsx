import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL, formatDate, QUOTE_STATUS_LABEL } from "@/lib/format";

interface Props {
  clientId: string | null;
  clientName: string;
  onOpenChange: (open: boolean) => void;
}

export function ClientHistoryDialog({ clientId, clientName, onOpenChange }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["client-history", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data: quotes, error } = await supabase
        .from("quotes")
        .select("id, numero, status, total, data_emissao, items:quote_items(descricao, codigo, marca, quantidade)")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return quotes ?? [];
    },
  });

  const quotes = data ?? [];
  const count = quotes.length;
  const revenue = quotes.reduce((s, q) => s + Number(q.total ?? 0), 0);
  const ticket = count > 0 ? revenue / count : 0;

  const topItems = (() => {
    const map = new Map<string, number>();
    quotes.forEach((q) => {
      (q.items ?? []).forEach((it) => {
        const label =
          it.descricao?.trim() || it.codigo?.trim() || it.marca?.trim() || "(sem descrição)";
        map.set(label, (map.get(label) ?? 0) + Number(it.quantidade ?? 0));
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  })();

  return (
    <Dialog open={!!clientId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Histórico · {clientName}</DialogTitle>
          <DialogDescription>
            Orçamentos, ticket médio e itens mais cotados deste cliente.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Orçamentos", value: String(count) },
                { label: "Valor total", value: formatBRL(revenue) },
                { label: "Ticket médio", value: formatBRL(ticket) },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-2xl border border-border/60 p-3 text-center"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {m.label}
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold">{m.value}</p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Itens mais cotados
              </h3>
              {topItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem itens registrados.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {topItems.map(([label, qtd]) => (
                    <li key={label} className="flex justify-between gap-3">
                      <span className="truncate">{label}</span>
                      <span className="font-mono text-muted-foreground">{qtd}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Últimos orçamentos
              </h3>
              {quotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum orçamento para este cliente ainda.
                </p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {quotes.slice(0, 10).map((q) => (
                    <li key={q.id} className="flex items-center justify-between gap-3 py-2">
                      <Link
                        to="/orcamentos/$id"
                        params={{ id: q.id }}
                        className="font-mono text-xs font-semibold text-primary hover:underline"
                      >
                        #{String(q.numero).padStart(5, "0")}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(q.data_emissao)}
                      </span>
                      <span className="text-xs">
                        {QUOTE_STATUS_LABEL[q.status] ?? q.status}
                      </span>
                      <span className="font-mono text-xs font-semibold">
                        {formatBRL(q.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
