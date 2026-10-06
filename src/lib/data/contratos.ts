// Contrato rápido: gera o texto a partir dos dados do cliente e guarda tudo na
// tabela contracts (texto em content_markdown, sem arquivo em disco).
import { brl, dataLonga } from "../formato";
import { agoraIso, dados, numeroOuNull, supabase, textoOuNull, type Linha } from "./client";
import { contatosDaEmpresa } from "./contatos";
import { lerEmpresa } from "./empresas";

export type ContratoInfo = {
  id: string;
  valor: number | null;
  tipoPagamento: string | null;
  parcelas: number | null;
  inicio: string | null;
  duracaoMeses: number | null;
  criadoEm: string | null;
};

export type DadosContrato = {
  valor?: number | null;
  tipo_pagamento?: string;
  parcelas?: number | null;
  inicio?: string;
  duracao_meses?: number | null;
};

const TIPOS: Record<string, string> = {
  pix: "à vista por Pix",
  cartao: "no cartão de crédito",
  parcelado: "parcelado",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapear(l: Linha): ContratoInfo {
  return {
    id: String(l.id),
    valor: numeroOuNull(l.value),
    tipoPagamento: textoOuNull(l.payment_type),
    parcelas: numeroOuNull(l.installments),
    inicio: textoOuNull(l.starts_on),
    duracaoMeses: numeroOuNull(l.duration_months),
    criadoEm: textoOuNull(l.created_at),
  };
}

export async function contratosDaEmpresa(empresaId: string): Promise<ContratoInfo[]> {
  const r = await supabase()
    .from("contracts")
    .select("id, value, payment_type, installments, starts_on, duration_months, created_at")
    .eq("company_id", empresaId)
    .order("created_at", { ascending: false });
  return (dados<Linha[]>(r, "listar contratos") ?? []).map(mapear);
}

function montarTexto(nome: string, cidade: string | null, contato: string, valor: number | null, tipo: string, d: DadosContrato): string {
  const cond = tipo === "parcelado" && d.parcelas && d.parcelas > 1 ? `parcelado em ${d.parcelas} vezes` : TIPOS[tipo] || TIPOS.pix;
  const inicio = d.inicio ? dataLonga(d.inicio) : "a combinar";
  const prazo = d.duracao_meses
    ? `${d.duracao_meses} ${d.duracao_meses === 1 ? "mês" : "meses"}`
    : "Prazo de entrega combinado por escrito";
  return [
    "# Contrato de prestação de serviços",
    "",
    "> Rascunho gerado pela plataforma. Revise os dados entre colchetes antes de enviar.",
    "",
    `**Contratante:** ${nome}${contato ? `, representada por ${contato}` : ""}${cidade ? `, ${cidade}` : ""}.`,
    "**Contratada:** Marca Digital, de Everton Brito [CPF ou CNPJ e endereço].",
    "",
    "## 1. Objeto",
    "Criação, publicação e manutenção básica do site da Contratante, conforme o briefing respondido por ela.",
    "",
    "## 2. Valor e pagamento",
    `O valor do projeto é ${valor ? brl(valor) : "[valor a definir]"}, pago ${cond}. O início do projeto é ${inicio}.`,
    "",
    "## 3. Prazo",
    `${prazo}, contados do pagamento da primeira parcela e do envio dos materiais pela Contratante.`,
    "",
    "## 4. Responsabilidades",
    "A Contratada entrega o site publicado, responsivo e com formulário de contato funcionando. A Contratante fornece textos, imagens e acessos necessários e responde às solicitações em até 3 dias úteis.",
    "",
    "## 5. Propriedade e acessos",
    "Após a quitação, o site e o domínio ficam em nome da Contratante. Os acessos ficam guardados de forma protegida e só são usados para manutenção do projeto.",
    "",
    "## 6. Alterações e cancelamento",
    "Ajustes pequenos estão incluídos até a aprovação final. Mudanças de escopo são combinadas por escrito e podem alterar valor e prazo. O cancelamento após o início do trabalho preserva o valor da parte já executada.",
    "",
    "## 7. Foro",
    "Fica eleito o foro de Salvador, Bahia, para resolver qualquer questão deste contrato.",
    "",
    `${cidade || "[cidade]"}, ${dataLonga(agoraIso().slice(0, 10))}.`,
    "",
    "________________________________",
    "Contratante",
    "",
    "________________________________",
    "Contratada",
    "",
  ].join("\n");
}

export async function gerarContrato(empresaId: string, d: DadosContrato): Promise<ContratoInfo> {
  const e = await lerEmpresa(empresaId);
  if (!e) throw new Error("cliente não encontrado");
  const contato = (await contatosDaEmpresa(empresaId)).find((c) => c.nome)?.nome || "";
  const tipo = d.tipo_pagamento && TIPOS[d.tipo_pagamento] ? d.tipo_pagamento : "pix";
  const valor = d.valor ?? e.valor_projeto ?? null;
  const r = await supabase()
    .from("contracts")
    .insert({
      company_id: empresaId,
      value: valor,
      payment_type: tipo,
      installments: d.parcelas ?? null,
      starts_on: d.inicio || null,
      duration_months: d.duracao_meses ?? null,
      content_markdown: montarTexto(e.nome, e.cidade, contato, valor, tipo, d),
      created_at: agoraIso(),
    })
    .select("id, value, payment_type, installments, starts_on, duration_months, created_at")
    .single();
  return mapear(dados<Linha>(r, "gerar contrato"));
}

// Texto do contrato. O contrato precisa pertencer à empresa pedida.
export async function textoDoContrato(empresaId: string, contratoId: string): Promise<string | null> {
  if (!UUID.test(contratoId)) return null;
  const r = await supabase().from("contracts").select("content_markdown").eq("id", contratoId).eq("company_id", empresaId).maybeSingle();
  const l = dados<Linha | null>(r, "ler contrato");
  return l?.content_markdown == null ? null : String(l.content_markdown);
}

export async function removerContrato(empresaId: string, contratoId: string): Promise<boolean> {
  if (!UUID.test(contratoId)) return false;
  const r = await supabase().from("contracts").delete().eq("id", contratoId).eq("company_id", empresaId).select("id");
  return (dados<Linha[]>(r, "remover contrato") ?? []).length > 0;
}
