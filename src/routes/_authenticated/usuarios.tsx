import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: () => (
    <ModulePlaceholder
      title="Usuários"
      description="Gestão dos funcionários que acessam o sistema."
      nextSteps={[
        "Cadastrar novo funcionário (nome, email, senha inicial)",
        "Definir papel: administrador ou vendedor",
        "Ativar/desativar acesso sem perder o histórico",
      ]}
    />
  ),
});
