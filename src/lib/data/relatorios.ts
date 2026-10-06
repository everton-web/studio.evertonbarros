// Relatórios na tabela reports (colunas extras na migration 0002):
//   kind = "mensal":       relatório do cliente servido em /r/<token>
//   kind = "lead_publico": diagnóstico público do lead, identificado por slug
// A busca pública do mensal usa só link_token_hash. O token e reconstituido no
// servidor a partir do id e da versao, sem texto puro no banco.
import { randomUUID } from "node:crypto";
import { agoraIso, dados, objeto, slug as slugDe, supabase, type Linha } from "./client";
import { hashTokenPublico, tokenPublico } from "./public-tokens";
import { DOC, lerConfig } from "./documentos";
import { whatsappPorEmpresa } from "./contatos";
import { contarLeadsDeFormulario } from "./leads";
import { lerHits } from "./rastreamento";
import { lerSaude, type SaudeSite } from "./saude";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export const URL_BASE = (process.env.RELATORIO_BASE_URL || "https://app.evertonbrito.com").replace(/\/+$/, "");
const CLARITY_PAINEL = "https://clarity.microsoft.com/projects";

export type ConteudoRelatorio = {
  versao: 1;
  empresa: { nome: string; cidade: string | null; site: string | null };
  mes: string;
  mesRotulo: string;
  geradoEm: string;
  pixel: { paginas: number | null; ultimo: string | null; fonte: string };
  saude: {
    noAr: boolean | null;
    formulario: string | null;
    certificadoDias: number | null;
    verificadoEm: string | null;
    alerta: boolean;
  };
  leads: { total: number; fonte: string };
  clarity: { url: string; apiConfirmada: boolean };
  searchConsole: { autorizado: boolean };
  enviadoEm: string | null;
};

export type ResultadoGeracao = { empresaId: string; nome: string; mes: string; criado: boolean };

export function mesAtual(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function validarMes(mes: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
}

export function rotuloMes(mes: string): string {
  const [a, m] = mes.split("-");
  return `${MESES[Number(m) - 1] ?? ""} de ${a}`;
}

export function tokenValido(token: string): boolean {
  return /^[A-Za-z0-9_-]{20,64}$/.test(token);
}

const primeiroDia = (mes: string) => `${mes}-01`;

function tokenDaLinha(l: Linha): string {
  return tokenPublico("relatorio", String(l.id), Number(l.token_version) || 1);
}

function hostDe(site: string | null): string {
  if (!site) return "";
  try {
    return new URL(/^https?:\/\//i.test(site) ? site : `https://${site}`).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Chaves que identificam o cliente nas fontes (pixel, saúde, formulário).
function chavesDe(e: { id: string; nome: string; site: string | null }): string[] {
  return [...new Set([e.id, hostDe(e.site), slugDe(e.nome, "")].filter(Boolean))];
}

type ConfigCliente = { searchConsoleAutorizado?: boolean; clarityUrl?: string };

// Autorizações e links por cliente: { "<id da empresa>": { searchConsoleAutorizado, clarityUrl } }.
async function lerConfigCliente(empresaId: string): Promise<ConfigCliente> {
  const c = objeto((await lerConfig(DOC.configRelatorio))[empresaId]);
  return c as ConfigCliente;
}

function urlClarity(v: unknown): string {
  return typeof v === "string" && /^https:\/\/clarity\.microsoft\.com\//.test(v) ? v : CLARITY_PAINEL;
}

type LinhaEmpresa = { id: string; nome: string; cidade: string | null; site: string | null };

async function montarConteudo(e: LinhaEmpresa, mes: string, enviadoEm: string | null): Promise<ConteudoRelatorio> {
  const chaves = chavesDe(e);
  const [hits, saudes, leads, cfg] = await Promise.all([lerHits(), lerSaude(), contarLeadsDeFormulario(chaves), lerConfigCliente(e.id)]);
  const chaveHit = chaves.find((k) => hits[k]);
  const hit = chaveHit ? hits[chaveHit] : null;
  const nomeSlug = slugDe(e.nome, "");
  const s: SaudeSite | undefined = saudes.find((x) => chaves.includes(x.slug) || slugDe(x.cliente, "") === nomeSlug);
  const alerta = !!s && (s.no_ar === false || (s.certificado_dias != null && s.certificado_dias <= 14) || s.formulario === "falha");
  return {
    versao: 1,
    empresa: { nome: e.nome, cidade: e.cidade, site: e.site },
    mes,
    mesRotulo: rotuloMes(mes),
    geradoEm: agoraIso(),
    pixel: { paginas: hit ? hit.n : null, ultimo: hit ? hit.ultimo : null, fonte: "pixel próprio da plataforma" },
    saude: {
      noAr: s ? s.no_ar : null,
      formulario: s ? s.formulario : null,
      certificadoDias: s ? s.certificado_dias : null,
      verificadoEm: s ? s.verificado_em || null : null,
      alerta,
    },
    leads: { total: leads, fonte: "formulário do site" },
    clarity: { url: urlClarity(cfg.clarityUrl), apiConfirmada: false },
    searchConsole: { autorizado: cfg.searchConsoleAutorizado === true },
    enviadoEm,
  };
}

async function clienteAtivo(empresaId: string): Promise<LinhaEmpresa | null> {
  const r = await supabase().from("companies").select("id, name, city, website").eq("id", empresaId).eq("crm_stage", "cliente").maybeSingle();
  const l = dados<Linha | null>(r, "ler cliente");
  return l ? { id: String(l.id), nome: String(l.name), cidade: l.city == null ? null : String(l.city), site: l.website == null ? null : String(l.website) } : null;
}

async function linhaMensal(empresaId: string, mes: string): Promise<Linha | null> {
  const r = await supabase()
    .from("reports")
    .select("*")
    .eq("kind", "mensal")
    .eq("company_id", empresaId)
    .eq("report_month", primeiroDia(mes))
    .maybeSingle();
  return dados<Linha | null>(r, "ler relatório");
}

function conteudo(l: Linha | null): ConteudoRelatorio | null {
  const c = objeto(l?.content);
  return Object.keys(c).length ? (c as unknown as ConteudoRelatorio) : null;
}

// Gera (ou atualiza) o relatório do mês. Idempotente: rodar de novo atualiza o
// conteúdo e mantém o link; link revogado volta com token novo.
export async function gerarRelatorioMensal(empresaId: string, mes: string = mesAtual()): Promise<ResultadoGeracao> {
  if (!validarMes(mes)) throw new Error("mês inválido");
  const e = await clienteAtivo(empresaId);
  if (!e) throw new Error("cliente ativo não encontrado");
  const atual = await linhaMensal(empresaId, mes);
  const enviadoEm = conteudo(atual)?.enviadoEm ?? null;
  const c = await montarConteudo(e, mes, enviadoEm);
  const agora = agoraIso();
  if (atual) {
    const patch: Record<string, unknown> = { content: c, generated_at: agora };
    const candidato = tokenDaLinha(atual);
    if (String(atual.link_token_hash || "") !== hashTokenPublico(candidato)) {
      const versao = (Number(atual.token_version) || 0) + 1;
      patch.token_version = versao;
      patch.link_token_hash = hashTokenPublico(tokenPublico("relatorio", String(atual.id), versao));
    }
    dados(await supabase().from("reports").update(patch).eq("id", String(atual.id)), "atualizar relatório");
    return { empresaId, nome: e.nome, mes, criado: false };
  }
  const id = randomUUID();
  const t = tokenPublico("relatorio", id, 1);
  dados(
    await supabase().from("reports").insert({
      id,
      kind: "mensal",
      company_id: empresaId,
      report_month: primeiroDia(mes),
      content: c,
      link_token_hash: hashTokenPublico(t),
      token_version: 1,
      generated_at: agora,
    }),
    "criar relatório",
  );
  return { empresaId, nome: e.nome, mes, criado: true };
}

// Gera para todos os clientes ativos. Uma falha isolada não derruba as demais.
export async function gerarRelatoriosAtivos(mes: string = mesAtual()) {
  const r = await supabase().from("companies").select("id").eq("crm_stage", "cliente").order("name");
  const geradas: ResultadoGeracao[] = [];
  const falhas: { empresaId: string; erro: string }[] = [];
  for (const l of dados<Linha[]>(r, "listar clientes") ?? []) {
    const id = String(l.id);
    try {
      geradas.push(await gerarRelatorioMensal(id, mes));
    } catch (err) {
      falhas.push({ empresaId: id, erro: err instanceof Error ? err.message : "erro" });
    }
  }
  return { mes, geradas, falhas };
}

async function trocarToken(empresaId: string, mes: string, ativo: boolean): Promise<boolean> {
  const atual = await linhaMensal(empresaId, mes);
  if (!atual) return false;
  const versao = (Number(atual.token_version) || 0) + 1;
  const hash = ativo ? hashTokenPublico(tokenPublico("relatorio", String(atual.id), versao)) : null;
  const r = await supabase()
    .from("reports")
    .update({ link_token_hash: hash, token_version: versao })
    .eq("kind", "mensal")
    .eq("company_id", empresaId)
    .eq("report_month", primeiroDia(mes))
    .select("id");
  return (dados<Linha[]>(r, "trocar token") ?? []).length > 0;
}

// O link antigo passa a responder 404, o novo funciona.
export function rotacionarToken(empresaId: string, mes: string): Promise<boolean> {
  return trocarToken(empresaId, mes, true);
}

// Revoga o link: 404 até gerar de novo ou rotacionar.
export function revogarToken(empresaId: string, mes: string): Promise<boolean> {
  return trocarToken(empresaId, mes, false);
}

// Busca pública. Qualquer token que não sirva devolve null (a página responde 404).
export async function relatorioPorToken(token: string): Promise<ConteudoRelatorio | null> {
  if (!tokenValido(token)) return null;
  const r = await supabase().from("reports").select("content").eq("kind", "mensal").eq("link_token_hash", hashTokenPublico(token)).maybeSingle();
  return conteudo(dados<Linha | null>(r, "ler relatório por token"));
}

export async function marcarEnviado(empresaId: string, mes: string): Promise<boolean> {
  const l = await linhaMensal(empresaId, mes);
  const c = conteudo(l);
  if (!l || !c) return false;
  const agora = agoraIso();
  c.enviadoEm = agora;
  dados(await supabase().from("reports").update({ content: c, sent_at: agora }).eq("id", String(l.id)), "marcar enviado");
  return true;
}

// ---------- lista do Hoje ----------
export type ItemHoje = {
  empresaId: string;
  nome: string;
  gerado: boolean;
  enviado: boolean;
  semWhatsapp: boolean;
  wa: string | null; // wa.me com número, mensagem e link prontos (só o sócio autenticado recebe)
  link: string | null;
};

function numeroWa(bruto: string | null | undefined): string | null {
  const d = (bruto || "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return d.length <= 11 ? `55${d}` : d;
}

export function mensagemWhatsapp(nome: string, mesRot: string, link: string): string {
  return `Oi! Tudo bem? Aqui é o Everton. Já saiu o relatório de ${mesRot} do site da ${nome}, com visitas, saúde do site e contatos recebidos. Dá uma olhada: ${link}`;
}

export async function listarParaHoje(mes: string = mesAtual()): Promise<{ mes: string; mesRotulo: string; itens: ItemHoje[] }> {
  const rc = await supabase().from("companies").select("id, name").eq("crm_stage", "cliente").order("name");
  const clientes = dados<Linha[]>(rc, "listar clientes") ?? [];
  const ids = clientes.map((c) => String(c.id));
  const relatorios = new Map<string, Linha>();
  if (ids.length) {
    const rr = await supabase()
      .from("reports")
      .select("id, company_id, content, link_token_hash, token_version")
      .eq("kind", "mensal")
      .eq("report_month", primeiroDia(mes))
      .in("company_id", ids);
    for (const l of dados<Linha[]>(rr, "listar relatórios do mês") ?? []) relatorios.set(String(l.company_id), l);
  }
  const whats = await whatsappPorEmpresa(ids);
  const rotulo = rotuloMes(mes);
  const itens = clientes.map((c): ItemHoje => {
    const id = String(c.id);
    const nome = String(c.name);
    const rel = relatorios.get(id) || null;
    const cont = conteudo(rel);
    const candidato = rel?.link_token_hash ? tokenDaLinha(rel) : null;
    const token = candidato && hashTokenPublico(candidato) === String(rel?.link_token_hash) ? candidato : null;
    const link = token ? `${URL_BASE}/r/${token}` : null;
    const num = numeroWa(whats.get(id));
    return {
      empresaId: id,
      nome,
      gerado: !!cont && !!token,
      enviado: !!cont?.enviadoEm,
      semWhatsapp: !num,
      link,
      wa: num && link ? `https://wa.me/${num}?text=${encodeURIComponent(mensagemWhatsapp(nome, rotulo, link))}` : null,
    };
  });
  return { mes, mesRotulo: rotulo, itens };
}

// ---------- relatório público do lead ----------
// Grava (ou atualiza) o conteúdo público pelo slug. Não publica: isso é
// publicarRelatorioLead, chamado logo depois pela rota.
export async function gravarRelatorioLead(empresaId: string, slug: string, conteudoPublico: object): Promise<void> {
  const agora = agoraIso();
  const r = await supabase().from("reports").select("id").eq("kind", "lead_publico").eq("slug", slug).maybeSingle();
  const atual = dados<Linha | null>(r, "ler relatório do lead");
  if (atual) {
    dados(
      await supabase().from("reports").update({ company_id: empresaId, content: conteudoPublico, generated_at: agora }).eq("id", String(atual.id)),
      "atualizar relatório do lead",
    );
    return;
  }
  dados(
    await supabase().from("reports").insert({
      kind: "lead_publico",
      slug,
      company_id: empresaId,
      report_month: agora.slice(0, 8) + "01",
      content: conteudoPublico,
      generated_at: agora,
    }),
    "criar relatório do lead",
  );
}

export async function publicarRelatorioLead(slug: string): Promise<boolean> {
  const r = await supabase().from("reports").update({ published_at: agoraIso() }).eq("kind", "lead_publico").eq("slug", slug).select("id");
  return (dados<Linha[]>(r, "publicar relatório do lead") ?? []).length > 0;
}

// Leitura pública: só devolve o que já foi publicado.
export async function relatorioLeadPublicado(slug: string): Promise<Record<string, unknown> | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const r = await supabase().from("reports").select("content").eq("kind", "lead_publico").eq("slug", slug).not("published_at", "is", null).maybeSingle();
  const l = dados<Linha | null>(r, "ler relatório público");
  return l ? objeto(l.content) : null;
}
