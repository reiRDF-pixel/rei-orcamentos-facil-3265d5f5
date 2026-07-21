import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Bem-vindo!");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao autenticar";
      toast.error(message.includes("Invalid login") ? "Email ou senha incorretos" : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <BrandLogo className="h-16" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            Sistema interno de orçamentos
          </p>
        </div>

        <Card className="rounded-3xl border-border/60 p-8 shadow-elegant">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Entrar</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acesse com seu email e senha da empresa.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@reidosfiltros.com.br"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-xl"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-primary text-primary-foreground shadow-lifted hover:bg-primary-hover"
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Entrar
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acesso restrito à equipe Rei dos Filtros.
          <br />
          Solicite ao administrador a criação da sua conta na tela de Usuários.
        </p>

        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← Voltar
          </Link>
        </div>
      </div>
    </div>
  );
}
