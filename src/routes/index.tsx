import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sistema de Orçamentos — Rei dos Filtros" },
      {
        name: "description",
        content: "Sistema interno da Rei dos Filtros para criação e gestão de orçamentos comerciais.",
      },
      { property: "og:title", content: "Sistema de Orçamentos — Rei dos Filtros" },
      {
        property: "og:description",
        content: "Acesso ao sistema interno de orçamentos da Rei dos Filtros.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
