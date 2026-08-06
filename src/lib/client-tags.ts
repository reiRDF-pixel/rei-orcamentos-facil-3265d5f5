/** Etiquetas padrão para segmentar clientes. */
export const CLIENT_TAGS = [
  { value: "frota", label: "Frota" },
  { value: "revenda", label: "Revenda" },
  { value: "oficina", label: "Oficina" },
  { value: "transportadora", label: "Transportadora" },
  { value: "agro", label: "Agro" },
  { value: "construcao", label: "Construção" },
] as const;

export type ClientTag = (typeof CLIENT_TAGS)[number]["value"];

export function clientTagLabel(value: string): string {
  return CLIENT_TAGS.find((t) => t.value === value)?.label ?? value;
}
