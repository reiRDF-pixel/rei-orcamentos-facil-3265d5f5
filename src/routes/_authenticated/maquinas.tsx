import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/maquinas")({
  component: () => (
    <ModulePlaceholder
      title="Máquinas"
      description="Cadastro de máquinas vinculadas aos clientes com histórico técnico."
      nextSteps={[
        "Cadastrar marca, modelo, série e ano",
        "Vincular filtros e lubrificantes compatíveis",
        "Consultar histórico de orçamentos por máquina",
      ]}
    />
  ),
});
