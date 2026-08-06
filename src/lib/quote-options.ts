/** Opções de frete usadas no editor e exibidas no PDF. */
export const TIPO_FRETE_OPTIONS = [
  {
    value: "FRETE FOB (DESTINATÁRIO)",
    label: "FRETE FOB (DESTINATÁRIO) — frete pago pelo cliente",
  },
  {
    value: "FRETE CIF (REMETENTE)",
    label: "FRETE CIF (REMETENTE) — frete pago pela empresa",
  },
  { value: "SEM FRETE", label: "SEM FRETE" },
] as const;

/** Converte valores antigos ("FRETE FOB") para os novos rótulos explicados. */
export function normalizeTipoFrete(value: string | null | undefined): string {
  const raw = (value ?? "").trim().toUpperCase();
  if (!raw) return "SEM FRETE";
  if (TIPO_FRETE_OPTIONS.some((o) => o.value === raw)) return raw;
  if (raw.includes("FOB")) return "FRETE FOB (DESTINATÁRIO)";
  if (raw.includes("CIF")) return "FRETE CIF (REMETENTE)";
  return "SEM FRETE";
}
