export const formatBRL = (value: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));

export const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR").format(d);
};

export const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
};

export const QUOTE_STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  expirado: "Expirado",
};

export const QUOTE_STATUS_CLASS: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviado: "bg-info/15 text-info",
  aprovado: "bg-success/15 text-success",
  recusado: "bg-destructive/15 text-destructive",
  expirado: "bg-warning/20 text-warning-foreground",
};
