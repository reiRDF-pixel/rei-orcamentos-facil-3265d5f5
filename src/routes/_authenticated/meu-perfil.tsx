import { createFileRoute } from "@tanstack/react-router";
import { DataPageHeader } from "@/components/data-page-header";
import { VendorProfileForm } from "@/components/vendor-profile-form";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/meu-perfil")({
  component: MeuPerfilPage,
});

function MeuPerfilPage() {
  const { user, loading } = useAuth();

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <DataPageHeader
        eyebrow="Configurações"
        title="Meu perfil"
        description="Suas informações são carregadas automaticamente em cada orçamento e no PDF gerado."
      />
      {loading || !user ? (
        <Skeleton className="h-96 w-full rounded-3xl" />
      ) : (
        <VendorProfileForm userId={user.id} ownProfile />
      )}
    </div>
  );
}
