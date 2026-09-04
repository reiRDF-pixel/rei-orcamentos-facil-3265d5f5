import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  FileText,
  Users,
  Wrench,
  Package,
  LayoutDashboard,
  BarChart3,
  Plus,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { formatBRL } from "@/lib/format";

type Result = {
  id: string;
  label: string;
  hint?: string;
  group: "Orçamentos" | "Clientes" | "Máquinas" | "Produtos";
  to: string;
};

const NAV = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Orçamentos", to: "/orcamentos", icon: FileText },
  { label: "Relatórios", to: "/relatorios", icon: BarChart3 },
  { label: "Clientes", to: "/clientes", icon: Users },
  { label: "Máquinas", to: "/maquinas", icon: Wrench },
  { label: "Produtos", to: "/produtos", icon: Package },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 220);
    return () => clearTimeout(t);
  }, [term]);

  const { data: results = [] } = useQuery({
    queryKey: ["global-search", debounced],
    enabled: open && debounced.length >= 2,
    queryFn: async (): Promise<Result[]> => {
      const like = `%${debounced}%`;
      const numeric = /^\d+$/.test(debounced) ? Number(debounced) : null;

      const [clients, machines, products, quotes] = await Promise.all([
        supabase
          .from("clients")
          .select("id, razao_social, nome_fantasia, cidade")
          .or(`razao_social.ilike.${like},nome_fantasia.ilike.${like},cnpj_cpf.ilike.${like}`)
          .limit(5),
        supabase
          .from("machines")
          .select("id, marca, modelo, numero_serie")
          .or(`marca.ilike.${like},modelo.ilike.${like},numero_serie.ilike.${like}`)
          .limit(5),
        supabase
          .from("products")
          .select("id, codigo, descricao, preco_venda")
          .or(`codigo.ilike.${like},descricao.ilike.${like},marca.ilike.${like}`)
          .limit(5),
        numeric === null
          ? supabase
              .from("quotes")
              .select("id, numero, total, client:clients(razao_social, nome_fantasia)")
              .is("deleted_at", null)
              .order("created_at", { ascending: false })
              .limit(30)
          : supabase
              .from("quotes")
              .select("id, numero, total, client:clients(razao_social, nome_fantasia)")
              .is("deleted_at", null)
              .eq("numero", numeric)
              .limit(5),
      ]);

      const out: Result[] = [];

      const quoteRows = (quotes.data ?? []) as Array<{
        id: string;
        numero: number;
        total: number;
        client: { razao_social?: string; nome_fantasia?: string } | null;
      }>;
      const lower = debounced.toLowerCase();
      for (const q of quoteRows) {
        const name = q.client?.nome_fantasia || q.client?.razao_social || "Sem cliente";
        if (numeric === null && !name.toLowerCase().includes(lower)) continue;
        out.push({
          id: `q-${q.id}`,
          label: `#${String(q.numero).padStart(5, "0")} · ${name}`,
          hint: formatBRL(q.total),
          group: "Orçamentos",
          to: `/orcamentos/${q.id}`,
        });
        if (out.length >= 6) break;
      }

      for (const c of clients.data ?? []) {
        out.push({
          id: `c-${c.id}`,
          label: c.nome_fantasia || c.razao_social,
          hint: c.cidade ?? undefined,
          group: "Clientes",
          to: "/clientes",
        });
      }
      for (const m of machines.data ?? []) {
        out.push({
          id: `m-${m.id}`,
          label: `${m.marca} ${m.modelo}`,
          hint: m.numero_serie ?? undefined,
          group: "Máquinas",
          to: "/maquinas",
        });
      }
      for (const p of products.data ?? []) {
        out.push({
          id: `p-${p.id}`,
          label: `${p.codigo ? p.codigo + " · " : ""}${p.descricao}`,
          hint: formatBRL(p.preco_venda),
          group: "Produtos",
          to: "/produtos",
        });
      }
      return out;
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<Result["group"], Result[]>();
    for (const r of results) {
      const arr = map.get(r.group) ?? [];
      arr.push(r);
      map.set(r.group, arr);
    }
    return Array.from(map.entries());
  }, [results]);

  const go = (to: string) => {
    setOpen(false);
    setTerm("");
    navigate({ to });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 rounded-xl border-border/70 text-muted-foreground"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 text-[10px] font-semibold sm:inline">
          Ctrl K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          value={term}
          onValueChange={setTerm}
          placeholder="Buscar orçamentos, clientes, máquinas, produtos..."
        />
        <CommandList>
          <CommandEmpty>
            {term.trim().length < 2 ? "Digite ao menos 2 caracteres." : "Nada encontrado."}
          </CommandEmpty>

          {grouped.map(([group, items]) => (
            <CommandGroup key={group} heading={group}>
              {items.map((r) => (
                <CommandItem key={r.id} value={`${r.label} ${r.id}`} onSelect={() => go(r.to)}>
                  <span className="flex-1 truncate">{r.label}</span>
                  {r.hint && (
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">{r.hint}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

          <CommandSeparator />
          <CommandGroup heading="Ir para">
            <CommandItem value="novo orcamento criar" onSelect={() => go("/orcamentos/novo")}>
              <Plus className="size-4" />
              <span>Novo orçamento</span>
            </CommandItem>
            {NAV.map((n) => (
              <CommandItem key={n.to} value={n.label} onSelect={() => go(n.to)}>
                <n.icon className="size-4" />
                <span>{n.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
