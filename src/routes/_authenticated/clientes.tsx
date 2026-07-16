import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/clientes")({
  component: () => (
    <ModulePlaceholder
      title="Clientes"
      description="Cadastro manual de clientes com CNPJ, contatos e endereço."
      nextSteps={[
        "Cadastrar cliente PJ/PF manualmente",
        "Salvar múltiplos contatos por cliente",
        "Vincular máquinas de cada cliente",
      ]}
    />
  ),
});
