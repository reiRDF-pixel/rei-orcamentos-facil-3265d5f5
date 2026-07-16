import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/orcamentos/novo")({
  component: () => (
    <ModulePlaceholder
      title="Novo Orçamento"
      description="Formulário completo para montar um orçamento profissional."
      nextSteps={[
        "Selecionar cliente e máquina",
        "Adicionar itens (filtros e lubrificantes) com preços",
        "Definir condições de pagamento e prazo de validade",
      ]}
    />
  ),
});
