import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CnpjData = {
  razao_social: string;
  nome_fantasia: string;
  email: string;
  phone: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
};

export function onlyDigits(value: string): string {
  return (value || "").replace(/\D/g, "");
}

export function isValidCnpj(value: string): boolean {
  const c = onlyDigits(value);
  if (c.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(c)) return false;
  const calc = (len: number) => {
    let sum = 0;
    let pos = len - 7;
    for (let i = 0; i < len; i++) {
      sum += Number(c[i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}

function fromBrasilApi(j: Record<string, unknown>): CnpjData {
  const ddd = str(j["ddd_telefone_1"]);
  return {
    razao_social: str(j["razao_social"]),
    nome_fantasia: str(j["nome_fantasia"]),
    email: str(j["email"]).toLowerCase(),
    phone: ddd,
    cep: onlyDigits(str(j["cep"])),
    endereco: [str(j["descricao_tipo_de_logradouro"]), str(j["logradouro"])]
      .filter(Boolean)
      .join(" "),
    numero: str(j["numero"]),
    complemento: str(j["complemento"]),
    bairro: str(j["bairro"]),
    cidade: str(j["municipio"]),
    estado: str(j["uf"]).toUpperCase().slice(0, 2),
  };
}

function fromReceitaWs(j: Record<string, unknown>): CnpjData {
  return {
    razao_social: str(j["nome"]),
    nome_fantasia: str(j["fantasia"]),
    email: str(j["email"]).toLowerCase(),
    phone: str(j["telefone"]).split("/")[0]?.trim() ?? "",
    cep: onlyDigits(str(j["cep"])),
    endereco: str(j["logradouro"]),
    numero: str(j["numero"]),
    complemento: str(j["complemento"]),
    bairro: str(j["bairro"]),
    cidade: str(j["municipio"]),
    estado: str(j["uf"]).toUpperCase().slice(0, 2),
  };
}

export const lookupCnpj = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cnpj: string }) => ({ cnpj: onlyDigits(input?.cnpj ?? "") }))
  .handler(async ({ data }): Promise<{ data: CnpjData | null; error: string | null }> => {
    if (!isValidCnpj(data.cnpj)) {
      return { data: null, error: "CNPJ inválido" };
    }

    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${data.cnpj}`, {
        headers: { accept: "application/json" },
      });
      if (res.ok) {
        const json = (await res.json()) as Record<string, unknown>;
        return { data: fromBrasilApi(json), error: null };
      }
      if (res.status === 404) return { data: null, error: "CNPJ não encontrado" };
    } catch (err) {
      console.error("[cnpj] brasilapi failed", err);
    }

    try {
      const res = await fetch(`https://receitaws.com.br/v1/cnpj/${data.cnpj}`, {
        headers: { accept: "application/json" },
      });
      if (res.ok) {
        const json = (await res.json()) as Record<string, unknown>;
        if (str(json["status"]).toUpperCase() === "ERROR") {
          return { data: null, error: "CNPJ não encontrado" };
        }
        return { data: fromReceitaWs(json), error: null };
      }
    } catch (err) {
      console.error("[cnpj] receitaws failed", err);
    }

    return { data: null, error: "Serviço indisponível, preencha manualmente" };
  });
