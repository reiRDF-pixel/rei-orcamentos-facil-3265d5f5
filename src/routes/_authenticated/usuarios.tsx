import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shield, User, Pencil } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { DataPageHeader } from "@/components/data-page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { VendorProfileForm } from "@/components/vendor-profile-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
});

function UsuariosPage() {
  const { isAdmin, loading } = useIsAdmin();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    enabled: isAdmin,
    queryKey: ["users-list"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("user_roles").select("*"),
      ]);
      const profiles = profilesRes.data ?? [];
      const roles = rolesRes.data ?? [];
      return profiles.map((p) => ({
        ...p,
        roles: roles.filter((r) => r.user_id === p.id).map((r) => r.role),
      }));
    },
  });

  const toggleRole = useMutation({
    mutationFn: async ({
      userId,
      makeAdmin,
    }: {
      userId: string;
      makeAdmin: boolean;
    }) => {
      if (makeAdmin) {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });
        if (error && !error.message.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Permissão atualizada");
      qc.invalidateQueries({ queryKey: ["users-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <div className="p-8"><Skeleton className="h-40 w-full rounded-3xl" /></div>;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <Card className="rounded-3xl p-10 shadow-elegant">
          <Shield className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-bold">Acesso restrito</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Somente administradores podem gerenciar usuários.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <DataPageHeader
        eyebrow="Administração"
        title="Usuários"
        description="Funcionários com acesso ao sistema. Novos usuários criam a conta em /auth; um admin ajusta a permissão aqui."
      />

      <Card className="overflow-hidden rounded-3xl border-border/60 shadow-elegant">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : !users || users.length === 0 ? (
          <div className="p-14 text-center text-sm text-muted-foreground">
            Nenhum usuário cadastrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-bold">Nome</th>
                  <th className="px-6 py-3 font-bold">Email</th>
                  <th className="px-6 py-3 font-bold">Criado em</th>
                  <th className="px-6 py-3 font-bold">Papel</th>
                  <th className="px-6 py-3 font-bold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const admin = u.roles.includes("admin");
                  return (
                    <tr key={u.id} className="hover:bg-muted/30">
                      <td className="px-6 py-3 font-semibold">{u.full_name || "—"}</td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">{u.email}</td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">{formatDate(u.created_at)}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
                            admin ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {admin ? <Shield className="size-3" /> : <User className="size-3" />}
                          {admin ? "Administrador" : "Vendedor"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toggleRole.mutate({ userId: u.id, makeAdmin: !admin })
                          }
                        >
                          {admin ? "Rebaixar" : "Tornar admin"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
