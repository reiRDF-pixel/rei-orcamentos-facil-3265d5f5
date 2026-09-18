import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lookupCnpj, isValidCnpj, onlyDigits, type CnpjData } from "@/lib/cnpj.functions";

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Recebe os dados encontrados na Receita Federal. */
  onFound: (data: CnpjData) => void;
  /** Quando false (Pessoa Física), a busca automática fica desativada. */
  lookupEnabled?: boolean;
  label?: string;
}

export function CnpjLookupField({
  value,
  onChange,
  onFound,
  lookupEnabled = true,
  label = "CNPJ / CPF",
}: Props) {
  const lookup = useServerFn(lookupCnpj);
  const [loading, setLoading] = useState(false);
  const lastLookedUp = useRef<string | null>(null);

  const digits = onlyDigits(value);
  const canLookup = lookupEnabled && isValidCnpj(digits);

  const run = async (cnpj: string) => {
    if (loading) return;
    setLoading(true);
    lastLookedUp.current = cnpj;
    try {
      const res = await lookup({ data: { cnpj } });
      if (res.data) {
        onFound(res.data);
        toast.success("Dados encontrados na Receita Federal");
      } else {
        toast.error(res.error ?? "Não foi possível buscar o CNPJ");
      }
    } catch {
      toast.error("Serviço indisponível, preencha manualmente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            const d = onlyDigits(e.target.value);
            if (lookupEnabled && isValidCnpj(d) && lastLookedUp.current !== d) void run(d);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canLookup) {
              e.preventDefault();
              void run(digits);
            }
          }}
        />
        {lookupEnabled && (
          <Button
            type="button"
            variant="outline"
            disabled={!canLookup || loading}
            onClick={() => void run(digits)}
            className="shrink-0 gap-2"
            title="Buscar dados na Receita Federal"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            <span className="hidden sm:inline">Buscar dados</span>
          </Button>
        )}
      </div>
      {lookupEnabled && (
        <p className="text-xs text-muted-foreground">
          Digite o CNPJ completo para preencher os dados automaticamente.
        </p>
      )}
    </div>
  );
}
