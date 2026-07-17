export type PdfTemplateId = "azul" | "laranja" | "escuro" | "minimal";

export interface PdfTemplate {
  id: PdfTemplateId;
  label: string;
  /** Header background (solid or gradient) */
  headerBg: string;
  headerText: string;
  accent: string;
  tableHeaderBg: string;
  tableHeaderText: string;
  totalBg: string;
  totalText: string;
}

export const PDF_TEMPLATES: PdfTemplate[] = [
  {
    id: "azul",
    label: "Azul Royal",
    headerBg: "linear-gradient(135deg, #1e2fd4 0%, #3a4ff5 100%)",
    headerText: "#ffffff",
    accent: "#ff8c1a",
    tableHeaderBg: "#1e2fd4",
    tableHeaderText: "#ffffff",
    totalBg: "#1e2fd4",
    totalText: "#ffffff",
  },
  {
    id: "laranja",
    label: "Laranja Vibrante",
    headerBg: "linear-gradient(135deg, #ff8c1a 0%, #ffb347 100%)",
    headerText: "#ffffff",
    accent: "#1e2fd4",
    tableHeaderBg: "#ff8c1a",
    tableHeaderText: "#ffffff",
    totalBg: "#ff8c1a",
    totalText: "#ffffff",
  },
  {
    id: "escuro",
    label: "Corporativo Escuro",
    headerBg: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    headerText: "#ffffff",
    accent: "#ff8c1a",
    tableHeaderBg: "#0f172a",
    tableHeaderText: "#ffffff",
    totalBg: "#0f172a",
    totalText: "#ffffff",
  },
  {
    id: "minimal",
    label: "Minimalista Branco",
    headerBg: "#ffffff",
    headerText: "#0f172a",
    accent: "#1e2fd4",
    tableHeaderBg: "#f1f5f9",
    tableHeaderText: "#0f172a",
    totalBg: "#f1f5f9",
    totalText: "#0f172a",
  },
];

export function getPdfTemplate(id: string | null | undefined): PdfTemplate {
  return PDF_TEMPLATES.find((t) => t.id === id) ?? PDF_TEMPLATES[0];
}
