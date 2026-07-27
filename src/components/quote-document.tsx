import logoAsset from "@/assets/rei-dos-filtros-logo.jpg.asset.json";
import { formatBRL, formatDate, QUOTE_STATUS_LABEL } from "@/lib/format";
import { getPdfTemplate, type PdfTemplateId } from "@/lib/pdf-templates";

export interface QuoteDocumentData {
  quote: {
    numero: number;
    status: string;
    data_emissao: string;
    validade_dias: number;
    subtotal: number | string;
    desconto_percentual: number | string;
    desconto_valor: number | string;
    frete: number | string;
    total: number | string;
    condicao_pagamento: string | null;
    tipo_frete: string | null;
    prazo_entrega: string | null;
    observacoes: string | null;
    pdf_template: string | null;
  };
  client: {
    razao_social?: string | null;
    nome_fantasia?: string | null;
    cnpj_cpf?: string | null;
    endereco?: string | null;
    numero?: string | null;
    cidade?: string | null;
    estado?: string | null;
    phone?: string | null;
    contato_nome?: string | null;
  } | null;
  machine: {
    marca?: string | null;
    modelo?: string | null;
    numero_serie?: string | null;
    ano?: number | null;
  } | null;
  items: Array<{
    id?: string;
    codigo: string | null;
    codigo_interno?: string | null;
    marca?: string | null;
    descricao: string;
    quantidade: number | string;
    preco_unitario: number | string;
    total: number | string;
    ordem: number;
  }>;
  company: {
    razao_social?: string | null;
    nome_fantasia?: string | null;
    cnpj?: string | null;
    endereco?: string | null;
    numero?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
    cep?: string | null;
    phone?: string | null;
    email?: string | null;
    logo_url?: string | null;
  } | null;
  vendedorNome?: string | null;
  vendedor?: {
    full_name?: string | null;
    nome_pdf?: string | null;
    cargo?: string | null;
    email?: string | null;
    phone_comercial?: string | null;
    whatsapp?: string | null;
    phone?: string | null;
    signature_url?: string | null;
    avatar_url?: string | null;
    logo_url?: string | null;
    empresa_nome?: string | null;
    endereco?: string | null;
    cep?: string | null;
    cidade?: string | null;
    estado?: string | null;
    site?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    linkedin?: string | null;
    mensagem_padrao?: string | null;
    pix_key?: string | null;
  } | null;
}

interface Props extends QuoteDocumentData {
  templateId?: PdfTemplateId;
  variant?: "client" | "internal";
}

export function QuoteDocument({
  quote,
  client,
  machine,
  items,
  company,
  vendedorNome,
  vendedor,
  templateId,
  variant = "client",
}: Props) {
  const tpl = getPdfTemplate(templateId ?? (quote.pdf_template as PdfTemplateId | null));
  const logoUrl = vendedor?.logo_url || company?.logo_url || logoAsset.url;
  const displayName = vendedor?.nome_pdf || vendedor?.full_name || vendedorNome;
  const isInternal = variant === "internal";

  return (
    <div
      style={{
        background: "#ffffff",
        color: "#0f172a",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <header
        style={{
          background: tpl.headerBg,
          color: tpl.headerText,
          padding: "28px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <img
            src={logoUrl}
            alt="Rei dos Filtros"
            style={{
              height: 64,
              width: "auto",
              background: "#fff",
              padding: 6,
              borderRadius: 8,
            }}
          />

          <div>
            <p
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 2,
                opacity: 0.85,
                margin: 0,
              }}
            >
              {isInternal ? "Uso interno · Separação / Faturamento" : "Orçamento"}
            </p>
            <h1
              style={{ fontFamily: "monospace", fontSize: 28, fontWeight: 800, margin: "4px 0 0" }}
            >
              Orçamento #{String(quote.numero).padStart(5, "0")}
            </h1>
            <p style={{ fontSize: 11, opacity: 0.85, margin: "4px 0 0" }}>
              Emissão: {formatDate(quote.data_emissao)} · Validade: {quote.validade_dias} dias
            </p>
            <span
              style={{
                display: "inline-block",
                marginTop: 6,
                padding: "2px 8px",
                background: tpl.accent,
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                borderRadius: 999,
              }}
            >
              {QUOTE_STATUS_LABEL[quote.status] ?? quote.status}
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, lineHeight: 1.4 }}>
          <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>
            {company?.nome_fantasia || company?.razao_social || "Rei dos Filtros"}
          </p>
          {company?.cnpj && <p style={{ margin: 0, opacity: 0.9 }}>CNPJ {company.cnpj}</p>}
          {company?.endereco && (
            <p style={{ margin: 0, opacity: 0.9 }}>
              {company.endereco}
              {company.numero ? `, ${company.numero}` : ""}
            </p>
          )}
          {(company?.bairro || company?.cidade) && (
            <p style={{ margin: 0, opacity: 0.9 }}>
              {company.bairro ? `${company.bairro} - ` : ""}
              {company.cidade}
              {company.estado ? `/${company.estado}` : ""}
              {company.cep ? ` · ${company.cep}` : ""}
            </p>
          )}
          {company?.phone && <p style={{ margin: 0, opacity: 0.9 }}>Tel: {company.phone}</p>}
          {company?.email && <p style={{ margin: 0, opacity: 0.9 }}>{company.email}</p>}
        </div>
      </header>

      <div style={{ padding: 32 }}>
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            marginBottom: 24,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1,
                color: tpl.accent,
                margin: 0,
              }}
            >
              CLIENTE
            </p>
            <p style={{ fontWeight: 600, margin: "4px 0 0" }}>
              {client?.nome_fantasia || client?.razao_social || "—"}
            </p>
            {client?.cnpj_cpf && (
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>{client.cnpj_cpf}</p>
            )}
            {client?.endereco && (
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                {client.endereco}
                {client.numero ? `, ${client.numero}` : ""} - {client.cidade}
                {client.estado ? `/${client.estado}` : ""}
              </p>
            )}
            {client?.phone && (
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>{client.phone}</p>
            )}
          </div>
          {machine && (machine.marca || machine.modelo) && (
            <div>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 1,
                  color: tpl.accent,
                  margin: 0,
                }}
              >
                MÁQUINA
              </p>
              <p style={{ fontWeight: 600, margin: "4px 0 0" }}>
                {machine.marca} {machine.modelo}
              </p>
              {machine.numero_serie && (
                <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                  Série: {machine.numero_serie}
                </p>
              )}
              {machine.ano && (
                <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Ano: {machine.ano}</p>
              )}
            </div>
          )}
        </section>

        {isInternal && (quote.condicao_pagamento || quote.prazo_entrega) && (
          <div
            style={{
              marginBottom: 16,
              border: `2px solid ${tpl.accent}`,
              borderRadius: 10,
              padding: "10px 14px",
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              fontSize: 12,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 1,
                  color: tpl.accent,
                  margin: 0,
                  textTransform: "uppercase",
                }}
              >
                Condição de pagamento
              </p>
              <p style={{ margin: "2px 0 0", fontWeight: 600 }}>
                {quote.condicao_pagamento || "—"}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 1,
                  color: tpl.accent,
                  margin: 0,
                  textTransform: "uppercase",
                }}
              >
                Prazo de entrega
              </p>
              <p style={{ margin: "2px 0 0", fontWeight: 600 }}>{quote.prazo_entrega || "—"}</p>
            </div>
            <div>
              <p
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 1,
                  color: tpl.accent,
                  margin: 0,
                  textTransform: "uppercase",
                }}
              >
                Frete
              </p>
              <p style={{ margin: "2px 0 0", fontWeight: 600 }}>{quote.tipo_frete || "—"}</p>
            </div>
          </div>
        )}

        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 16 }}
        >
          <thead>
            <tr style={{ background: tpl.tableHeaderBg, color: tpl.tableHeaderText }}>
              <th
                style={{
                  padding: "8px 10px",
                  textAlign: "left",
                  fontSize: 10,
                  textTransform: "uppercase",
                }}
              >
                {isInternal ? "Cód. cliente" : "Código"}
              </th>
              {isInternal && (
                <th
                  style={{
                    padding: "8px 10px",
                    textAlign: "left",
                    fontSize: 10,
                    textTransform: "uppercase",
                  }}
                >
                  Nosso cód.
                </th>
              )}
              <th
                style={{
                  padding: "8px 10px",
                  textAlign: "left",
                  fontSize: 10,
                  textTransform: "uppercase",
                }}
              >
                Marca
              </th>
              <th
                style={{
                  padding: "8px 10px",
                  textAlign: "left",
                  fontSize: 10,
                  textTransform: "uppercase",
                }}
              >
                Item
              </th>
              <th
                style={{
                  padding: "8px 10px",
                  textAlign: "right",
                  fontSize: 10,
                  textTransform: "uppercase",
                }}
              >
                Qtd
              </th>
              <th
                style={{
                  padding: "8px 10px",
                  textAlign: "right",
                  fontSize: 10,
                  textTransform: "uppercase",
                }}
              >
                Preço un.
              </th>
              <th
                style={{
                  padding: "8px 10px",
                  textAlign: "right",
                  fontSize: 10,
                  textTransform: "uppercase",
                }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((i, idx) => (
              <tr key={i.id ?? idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#64748b" }}>
                  {i.codigo || "—"}
                </td>
                {isInternal && (
                  <>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#0f172a" }}>
                      {i.codigo_interno || "—"}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#475569" }}>{i.marca || "—"}</td>
                  </>
                )}
                <td style={{ padding: "8px 10px" }}>{i.descricao}</td>
                <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>
                  {i.quantidade}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>
                  {formatBRL(Number(i.preco_unitario))}
                </td>
                <td
                  style={{
                    padding: "8px 10px",
                    textAlign: "right",
                    fontFamily: "monospace",
                    fontWeight: 600,
                  }}
                >
                  {formatBRL(Number(i.total))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>


        <div style={{ marginLeft: "auto", maxWidth: 320, fontSize: 12 }}>
          <Row
            label="Qtd total de itens"
            value={String(items.reduce((s, i) => s + (Number(i.quantidade) || 0), 0))}
          />
          <Row label="Subtotal" value={formatBRL(Number(quote.subtotal))} />
          {Number(quote.desconto_percentual) > 0 && (
            <Row
              label={`Desconto (${quote.desconto_percentual}%)`}
              value={`- ${formatBRL(
                (Number(quote.subtotal) * Number(quote.desconto_percentual)) / 100,
              )}`}
            />
          )}
          {Number(quote.desconto_valor) > 0 && (
            <Row label="Desconto (valor)" value={`- ${formatBRL(Number(quote.desconto_valor))}`} />
          )}
          {Number(quote.frete) > 0 && <Row label="Frete" value={formatBRL(Number(quote.frete))} />}
          <div
            style={{
              marginTop: 8,
              display: "flex",
              justifyContent: "space-between",
              background: tpl.totalBg,
              color: tpl.totalText,
              padding: "12px 16px",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            <span>TOTAL</span>
            <span style={{ fontFamily: "monospace" }}>{formatBRL(Number(quote.total))}</span>
          </div>
        </div>

        {(quote.condicao_pagamento ||
          quote.tipo_frete ||
          quote.prazo_entrega ||
          quote.observacoes) && (
          <section
            style={{ marginTop: 28, borderTop: "1px solid #e2e8f0", paddingTop: 20, fontSize: 12 }}
          >
            {quote.condicao_pagamento && (
              <p style={{ margin: "4px 0" }}>
                <b style={{ color: tpl.accent }}>Condição de pagamento:</b>{" "}
                {quote.condicao_pagamento}
              </p>
            )}
            {quote.tipo_frete && (
              <p style={{ margin: "4px 0" }}>
                <b style={{ color: tpl.accent }}>Frete:</b> {quote.tipo_frete}
              </p>
            )}
            {quote.prazo_entrega && (
              <p style={{ margin: "4px 0" }}>
                <b style={{ color: tpl.accent }}>Prazo de entrega:</b> {quote.prazo_entrega}
              </p>
            )}
            {quote.observacoes && (
              <div style={{ marginTop: 8 }}>
                <p style={{ fontWeight: 700, color: tpl.accent, margin: 0 }}>Observações</p>
                <p style={{ whiteSpace: "pre-wrap", color: "#475569", margin: "4px 0 0" }}>
                  {quote.observacoes}
                </p>
              </div>
            )}
          </section>
        )}

        {vendedor && (vendedor.mensagem_padrao || vendedor.pix_key) && (
          <section
            style={{ marginTop: 24, borderTop: "1px solid #e2e8f0", paddingTop: 16, fontSize: 12 }}
          >
            {vendedor.mensagem_padrao && (
              <p style={{ margin: "4px 0", whiteSpace: "pre-wrap", color: "#475569" }}>
                {vendedor.mensagem_padrao}
              </p>
            )}
            {vendedor.pix_key && (
              <p style={{ margin: "4px 0" }}>
                <b style={{ color: tpl.accent }}>Chave PIX:</b> {vendedor.pix_key}
              </p>
            )}
          </section>
        )}

        <section
          style={{
            marginTop: 28,
            borderTop: `2px solid ${tpl.accent}`,
            paddingTop: 16,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            fontSize: 11,
            color: "#475569",
          }}
        >
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1,
                color: tpl.accent,
                margin: 0,
              }}
            >
              VENDEDOR RESPONSÁVEL
            </p>
            {displayName && (
              <p style={{ margin: "6px 0 0", fontWeight: 700, color: "#0f172a", fontSize: 13 }}>
                {displayName}
              </p>
            )}
            {vendedor?.cargo && <p style={{ margin: 0 }}>{vendedor.cargo}</p>}
            {vendedor?.empresa_nome && <p style={{ margin: 0 }}>{vendedor.empresa_nome}</p>}
            {(vendedor?.cidade || vendedor?.estado) && (
              <p style={{ margin: 0 }}>
                {vendedor.cidade}
                {vendedor.estado ? `/${vendedor.estado}` : ""}
              </p>
            )}
            {vendedor?.whatsapp && <p style={{ margin: 0 }}>WhatsApp: {vendedor.whatsapp}</p>}
            {vendedor?.phone_comercial && (
              <p style={{ margin: 0 }}>Telefone: {vendedor.phone_comercial}</p>
            )}
            {vendedor?.email && <p style={{ margin: 0 }}>{vendedor.email}</p>}
            {vendedor?.site && <p style={{ margin: 0 }}>{vendedor.site}</p>}
          </div>
          <div style={{ textAlign: "right" }}>
            {vendedor?.signature_url && (
              <img
                src={vendedor.signature_url}
                alt="Assinatura"
                style={{ maxHeight: 70, maxWidth: 220, marginLeft: "auto" }}
              />
            )}
            <div style={{ marginTop: 6, borderTop: "1px solid #cbd5e1", paddingTop: 4 }}>
              Assinatura
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        color: "#64748b",
        padding: "2px 0",
      }}
    >
      <span>{label}</span>
      <span style={{ fontFamily: "monospace", color: "#0f172a" }}>{value}</span>
    </div>
  );
}
