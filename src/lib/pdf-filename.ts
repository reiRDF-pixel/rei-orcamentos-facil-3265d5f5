/** Builds a friendly PDF file name: orcamento-00042-nome-do-cliente[-interno].pdf */
export function slugifyName(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);
}

export function quotePdfFileName(options: {
  numero: number | string | null | undefined;
  clientName?: string | null;
  suffix?: string;
}): string {
  const numero = String(options.numero ?? 0).padStart(5, "0");
  const client = slugifyName(options.clientName);
  const parts = ["orcamento", numero];
  if (client) parts.push(client);
  const base = parts.join("-");
  return `${base}${options.suffix ?? ""}.pdf`;
}
