import { createFileRoute } from "@tanstack/react-router";
import { DataPageHeader } from "@/components/data-page-header";
import { VendorProfileForm } from "@/components/vendor-profile-form";
import { SalesRepsManager } from "@/components/sales-reps-manager";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/meu-perfil")({
  component: MeuPerfilPage,
});

function MeuPerfilPage() {
  const { user, loading } = useAuth();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <DataPageHeader
        eyebrow="Configurações"
        title="Meu perfil"
        description="Seus dados alimentam por padrão o cabeçalho e o rodapé do orçamento. Se mais de uma pessoa usa este login, cadastre vendedores separados abaixo."
      />
      {loading || !user ? (
        <Skeleton className="h-96 w-full rounded-3xl" />
      ) : (
        <>
          <SalesRepsManager userId={user.id} />
          <VendorProfileForm userId={user.id} ownProfile />
        </>
      )}
    </div>
  );
}
