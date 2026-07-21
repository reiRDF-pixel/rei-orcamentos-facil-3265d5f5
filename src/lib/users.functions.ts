import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CreateUserPayload = {
  email: string;
  password: string;
  full_name: string;
  make_admin?: boolean;
};

function normalize(input: CreateUserPayload): CreateUserPayload {
  const email = input.email?.trim().toLowerCase();
  const password = input.password ?? "";
  const full_name = input.full_name?.trim() ?? "";
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("Email inválido");
  if (password.length < 6) throw new Error("A senha deve ter ao menos 6 caracteres");
  if (!full_name) throw new Error("Informe o nome completo");
  return { email, password, full_name, make_admin: !!input.make_admin };
}

export const createUserByAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateUserPayload) => normalize(input))
  .handler(async ({ data, context }) => {
    // Authorize: caller must be admin
    const { data: rolesRow, error: rolesErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (rolesErr) throw new Error(rolesErr.message);
    const isAdmin = (rolesRow ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw new Error("Apenas administradores podem criar usuários");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error) throw new Error(error.message);
    const newId = created.user?.id;
    if (!newId) throw new Error("Falha ao criar usuário");

    if (data.make_admin) {
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newId, role: "admin" });
      if (roleErr && !roleErr.message.includes("duplicate")) throw new Error(roleErr.message);
    }

    return { id: newId };
  });
