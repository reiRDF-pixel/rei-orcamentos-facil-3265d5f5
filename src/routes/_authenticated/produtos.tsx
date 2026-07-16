import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/produtos")({
  component: () => (
    <ModulePlaceholder
      title="Produtos"
      description="Catálogo de filtros e lubrificantes disponíveis para orçamento."
      nextSteps={[
        "Cadastrar produto (código, marca, descrição, preço)",
        "Controlar unidade de medida e estoque",
        "Importar catálogo em massa via planilha",
      ]}
    />
  ),
});
