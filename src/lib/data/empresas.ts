// Empresas (tabela companies): o mesmo registro serve ao Comercial e a Clientes.
import { agoraIso, dados, numeroOuNull, objeto, supabase, textoOuNull, type Linha } from "./client";

export const ESTAGIOS_CRM = ["lead", "oportunidade", "cliente"] as const;
export type EstagioCrm = (typeof ESTAGIOS_CRM)[number];

export interface NovaEmpresa {
  id: string;
  nome: string;
  segmento?: string | null;
  cidade?: string | null;
  site?: string | null;
  nota_google?: number | null;
  avaliacoes?: number | null;
  categoria?: string | null;
  estagio_crm: string;
  estagio_funil?: number | null;
  status?: string | null;
  origem?: string | null;
  valor_projeto?: number | null;
  recorrencia?: number | null;
  fechado_em?: string | null;
  raw_source?: Record<string, unknown>;
}

export interface Empresa {
  id: string;
  nome: string;
  segmento: string | null;
  cidade: string | null;
  site: string | null;
  nota_google: number | null;
  avaliacoes: number | null;
  categoria: string | null;
  estagio_crm: EstagioCrm;
  estagio_funil: number | null;
  status: string | null;
  origem: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
  valor_projeto: number | null;
  recorrencia: number | null;
  fechado_em: string | null;
}

export interface CamposEmpresa {
  nome?: string;
  segmento?: string | null;
  cidade?: string | null;
  site?: string | null;
  status?: string | null;
  valor_projeto?: number | null;
  recorrencia?: number | null;
  fechado_em?: string | null;
  estagio_funil?: number | null;
}

// Nome do campo no app para a coluna do Postgres.
const COLUNA: Record<keyof CamposEmpresa, string> = {
  nome: "name",
  segmento: "segment",
  cidade: "city",
  site: "website",
  status: "status",
  valor_projeto: "project_value",
  recorrencia: "recurring_value",
  fechado_em: "closed_on",
  estagio_funil: "funnel_stage",
};

function validarEstagio(estagio: string): asserts estagio is EstagioCrm {
  if (!(ESTAGIOS_CRM as readonly string[]).includes(estagio)) throw new Error(`estagio_crm inválido: ${estagio}`);
}

export function mapearEmpresa(l: Linha): Empresa {
  return {
    id: String(l.id),
    nome: String(l.name),
    segmento: textoOuNull(l.segment),
    cidade: textoOuNull(l.city),
    site: textoOuNull(l.website),
    nota_google: numeroOuNull(l.google_rating),
    avaliacoes: numeroOuNull(l.review_count),
    categoria: textoOuNull(l.category),
    estagio_crm: String(l.crm_stage) as EstagioCrm,
    estagio_funil: numeroOuNull(l.funnel_stage),
    status: textoOuNull(l.status),
    origem: textoOuNull(l.source),
    criado_em: textoOuNull(l.created_at),
    atualizado_em: textoOuNull(l.updated_at),
    valor_projeto: numeroOuNull(l.project_value),
    recorrencia: numeroOuNull(l.recurring_value),
    fechado_em: textoOuNull(l.closed_on),
  };
}

export function rawSource(l: Linha | null | undefined): Record<string, unknown> {
  return objeto(l?.raw_source);
}

// Estágio do funil (0 a 5) para estágio do CRM: 0 lead, 1 a 4 oportunidade, 5 cliente.
export function estagioCrmDoFunil(funil: number): EstagioCrm {
  if (funil >= 5) return "cliente";
  if (funil >= 1) return "oportunidade";
  return "lead";
}

export async function criarEmpresa(d: NovaEmpresa): Promise<{ id: string }> {
  validarEstagio(d.estagio_crm);
  const agora = agoraIso();
  const r = await supabase().from("companies").insert({
    id: d.id,
    name: d.nome,
    segment: d.segmento ?? null,
    city: d.cidade ?? null,
    website: d.site ?? null,
    google_rating: d.nota_google ?? null,
    review_count: d.avaliacoes ?? null,
    category: d.categoria ?? null,
    crm_stage: d.estagio_crm,
    funnel_stage: d.estagio_funil ?? null,
    status: d.status ?? null,
    source: d.origem ?? null,
    project_value: d.valor_projeto ?? null,
    recurring_value: d.recorrencia ?? null,
    closed_on: d.fechado_em ?? (d.estagio_crm === "cliente" ? agora.slice(0, 10) : null),
    raw_source: d.raw_source ?? {},
    created_at: agora,
    updated_at: agora,
  });
  dados(r, "criar empresa");
  return { id: d.id };
}

export async function lerLinhaEmpresa(id: string): Promise<Linha | null> {
  const r = await supabase().from("companies").select("*").eq("id", id).maybeSingle();
  return dados<Linha | null>(r, "ler empresa");
}

export async function lerEmpresa(id: string): Promise<Empresa | null> {
  const l = await lerLinhaEmpresa(id);
  return l ? mapearEmpresa(l) : null;
}

export async function listarEmpresas(): Promise<Empresa[]> {
  const r = await supabase().from("companies").select("*").order("name");
  return (dados<Linha[]>(r, "listar empresas") ?? []).map(mapearEmpresa);
}

export async function listarPorEstagio(estagios: EstagioCrm[]): Promise<Empresa[]> {
  const r = await supabase().from("companies").select("*").in("crm_stage", estagios).order("name");
  return (dados<Linha[]>(r, "listar empresas por estágio") ?? []).map(mapearEmpresa);
}

// Muda o estágio do CRM. Ao virar cliente, grava a data de fechamento uma vez só.
export async function mudarEstagio(id: string, estagio_crm: string): Promise<{ id: string; estagio_crm: EstagioCrm }> {
  validarEstagio(estagio_crm);
  const atual = await lerEmpresa(id);
  const agora = agoraIso();
  const patch: Record<string, unknown> = { crm_stage: estagio_crm, updated_at: agora };
  if (estagio_crm === "cliente" && atual && !atual.fechado_em) patch.closed_on = agora.slice(0, 10);
  dados(await supabase().from("companies").update(patch).eq("id", id), "mudar estágio");
  return { id, estagio_crm };
}

// Atualiza só os campos informados. Nunca mexe no estágio do CRM (use mudarEstagio).
export async function atualizarEmpresa(id: string, campos: CamposEmpresa): Promise<boolean> {
  const patch: Record<string, unknown> = {};
  for (const k of Object.keys(COLUNA) as (keyof CamposEmpresa)[]) {
    if (campos[k] !== undefined) patch[COLUNA[k]] = campos[k];
  }
  if (Object.keys(patch).length === 0) return false;
  patch.updated_at = agoraIso();
  const r = await supabase().from("companies").update(patch).eq("id", id).select("id");
  return (dados<Linha[]>(r, "atualizar empresa") ?? []).length > 0;
}

// Grava colunas arbitrárias (uso interno da camada de dados).
export async function gravarColunasEmpresa(id: string, colunas: Record<string, unknown>): Promise<void> {
  dados(await supabase().from("companies").update({ ...colunas, updated_at: agoraIso() }).eq("id", id), "gravar empresa");
}

// Remove a empresa e, por cascata, contatos, credenciais, contratos e relatórios.
export async function excluirEmpresa(id: string): Promise<boolean> {
  const r = await supabase().from("companies").delete().eq("id", id).select("id");
  return (dados<Linha[]>(r, "excluir empresa") ?? []).length > 0;
}

export async function contagensEmpresas(): Promise<{
  empresas: number;
  porEstagio: Record<string, number>;
  porOrigem: Record<string, number>;
}> {
  const r = await supabase().from("companies").select("crm_stage, source");
  const linhas = dados<Linha[]>(r, "contar empresas") ?? [];
  const porEstagio: Record<string, number> = { lead: 0, oportunidade: 0, cliente: 0 };
  const porOrigem: Record<string, number> = {};
  for (const l of linhas) {
    const e = String(l.crm_stage);
    if (e in porEstagio) porEstagio[e] += 1;
    const o = l.source == null ? "sem origem" : String(l.source);
    porOrigem[o] = (porOrigem[o] || 0) + 1;
  }
  return { empresas: linhas.length, porEstagio, porOrigem };
}
