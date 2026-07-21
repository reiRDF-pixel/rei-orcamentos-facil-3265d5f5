import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Shield, User, Pencil, Plus, Loader2 } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { DataPageHeader } from "@/components/data-page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { VendorProfileForm } from "@/components/vendor-profile-form";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createUserByAdmin } from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
});

function UsuariosPage() {
  const { isAdmin, loading } = useIsAdmin();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    full_name: "",
    email: "",
    password: "",
    make_admin: false,
  });
  const createUserFn = useServerFn(createUserByAdmin);

  const createUser = useMutation({
    mutationFn: async () => {
      await createUserFn({ data: newUser });
    },
    onSuccess: () => {
      toast.success("Usuário criado");
      setCreateOpen(false);
      setNewUser({ full_name: "", email: "", password: "", make_admin: false });
      qc.invalidateQueries({ queryKey: ["users-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
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

  if (loading)
    return (
      <div className="p-8">
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    );

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
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <DataPageHeader
          eyebrow="Administração"
          title="Usuários"
          description="Funcionários com acesso ao sistema. Admins criam novos usuários e ajustam permissões aqui."
        />
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary-hover"
        >
          <Plus className="size-4" /> Novo usuário
        </Button>
      </div>

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
                      <td className="px-6 py-3 text-xs text-muted-foreground">
                        {formatDate(u.created_at)}
                      </td>
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
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId(u.id)}
                            title="Editar perfil"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleRole.mutate({ userId: u.id, makeAdmin: !admin })}
                          >
                            {admin ? "Rebaixar" : "Tornar admin"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Sheet open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Editar perfil do vendedor</SheetTitle>
          </SheetHeader>
          {editingId && (
            <div className="mt-6">
              <VendorProfileForm userId={editingId} />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nome completo</Label>
              <Input
                id="new-name"
                value={newUser.full_name}
                onChange={(e) => setNewUser((s) => ({ ...s, full_name: e.target.value }))}
                placeholder="João da Silva"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser((s) => ({ ...s, email: e.target.value }))}
                placeholder="usuario@reidosfiltros.com.br"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Senha inicial</Label>
              <Input
                id="new-password"
                type="text"
                value={newUser.password}
                onChange={(e) => setNewUser((s) => ({ ...s, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
              />
              <p className="text-xs text-muted-foreground">
                Compartilhe a senha com o usuário; ele poderá trocá-la depois.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="new-admin"
                checked={newUser.make_admin}
                onCheckedChange={(v) =>
                  setNewUser((s) => ({ ...s, make_admin: v === true }))
                }
              />
              <Label htmlFor="new-admin" className="cursor-pointer text-sm">
                Tornar administrador
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createUser.mutate()}
              disabled={createUser.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              {createUser.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Criar usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
