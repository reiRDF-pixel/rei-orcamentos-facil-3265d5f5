import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/orcamentos")({
  component: () => (
    <ModulePlaceholder
      title="Orçamentos"
      description="Crie, envie e acompanhe todos os orçamentos da sua equipe."
      nextSteps={[
        "Criar novo orçamento com cliente, máquina e itens",
        "Gerar PDF com identidade da Rei dos Filtros",
        "Enviar por WhatsApp e acompanhar aprovação",
      ]}
    />
  ),
});
