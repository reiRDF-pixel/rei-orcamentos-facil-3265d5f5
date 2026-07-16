import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/empresa")({
  component: () => (
    <ModulePlaceholder
      title="Configurações da Empresa"
      description="Dados institucionais que aparecem nos orçamentos."
      nextSteps={[
        "Informar CNPJ, razão social e endereço completo",
        "Upload da logo oficial (usada no PDF do orçamento)",
        "Definir telefones, e-mail e dados bancários",
      ]}
    />
  ),
});
