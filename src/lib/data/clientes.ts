// Clientes: empresas com crm_stage = 'cliente', com card e gaveta de detalhe.
// Valor, recorrência, site e fechamento das antigas fichas de 40 Comercial/Clientes
// são mesclados nas colunas da empresa pelo importador.
import { hostDoSite } from "../formato";
import { lerRegistrosCliente } from "./financeiro";
import { briefingDaEmpresa, type BriefingInfo } from "./briefings";
import { cofreConfigurado, listarCredenciais, type CredencialResumo } from "./credenciais";
import { contratosDaEmpresa, type ContratoInfo } from "./contratos";
import { atualizarEmpresa, criarEmpresa, lerEmpresa, listarPorEstagio, type Empresa } from "./empresas";
import { lerHits, type HitSite } from "./rastreamento";
import { lerSaude, type SaudeSite } from "./saude";
import { slug } from "./client";

export type CardCliente = {
  id: string;
  nome: string;
  segmento: string;
  cidade: string;
  status: string;
  fechadoEm: string | null;
  valorProjeto: number | null;
  recorrencia: number | null;
  site: string | null;
  pageviews: number | null;
};

export type AlertaSaude = { tipo: "fora_do_ar" | "formulario" | "certificado"; dias?: number };

export type Cobranca = {
  id: string;
  descricao: string;
  valor: number;
  status: "pago" | "pendente";
  data: string | null;
  pagoEm: string | null;
  vencimento: string | null;
  tipo: "projeto" | "recorrencia";
};

export type DetalheCliente = CardCliente & {
  saude: (SaudeSite & { alertas: AlertaSaude[] }) | null;
  pixel: HitSite | null;
  clarityUrl: string;
  financeiro: {
    cobrancas: Cobranca[];
    proximosVencimentos: Cobranca[];
    totalPago: number;
    divergencia: { pago: number; esperado: number } | null;
  };
  briefing: BriefingInfo | null;
  cofreAtivo: boolean;
  credenciais: CredencialResumo[];
  contratos: ContratoInfo[];
};

function pixelDe(site: string | null, hits: Record<string, HitSite>): HitSite | null {
  const host = hostDoSite(site);
  if (!host) return null;
  const chave = Object.keys(hits).find((k) => hostDoSite(k) === host);
  const h = chave ? hits[chave] : null;
  return h && h.n > 0 ? { n: h.n, primeiro: h.primeiro, ultimo: h.ultimo } : null;
}

function montarCard(e: Empresa, pixel: HitSite | null): CardCliente {
  return {
    id: e.id,
    nome: e.nome,
    segmento: e.segmento || "",
    cidade: e.cidade || "",
    status: e.status || "",
    fechadoEm: e.fechado_em,
    valorProjeto: e.valor_projeto,
    recorrencia: e.recorrencia,
    site: e.site,
    pageviews: pixel ? pixel.n : null,
  };
}

export async function listarClientes(): Promise<CardCliente[]> {
  const [empresas, hits] = await Promise.all([listarPorEstagio(["cliente"]), lerHits()]);
  const out = empresas.map((e) => montarCard(e, pixelDe(e.site, hits)));
  // ativos na frente, depois ordem alfabética
  const inativo = (c: CardCliente) => (c.status === "encerrado" || c.status === "arquivado" ? 1 : 0);
  return out.sort((a, b) => inativo(a) - inativo(b) || a.nome.localeCompare(b.nome));
}

// "1/10/2026, 14:32:10" ou "01/10/2026 14:32:10" para ISO. Sem data legível, null.
function brParaIso(s: string | undefined): string | null {
  if (!s) return null;
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const p = (n: string) => n.padStart(2, "0");
  return `${m[3]}-${p(m[2])}-${p(m[1])}T${p(m[4] || "0")}:${m[5] || "00"}:00`;
}

export async function cobrancasDoCliente(id: string): Promise<Cobranca[]> {
  const regs = await lerRegistrosCliente(id);
  return regs
    .filter((r) => r.ok)
    .map((r) => ({
      id: r.id,
      descricao: r.descricao,
      valor: r.valor * (r.quantidade || 1),
      status: (r.paid ? "pago" : "pendente") as "pago" | "pendente",
      data: brParaIso(r.data),
      pagoEm: brParaIso(r.paidAt),
      vencimento: r.vencimento || null,
      tipo: (r.tipo === "recorrencia" ? "recorrencia" : "projeto") as "projeto" | "recorrencia",
    }))
    .sort((a, b) => (b.data || "").localeCompare(a.data || ""));
}

function alertasDaSaude(s: SaudeSite): AlertaSaude[] {
  const a: AlertaSaude[] = [];
  if (s.no_ar === false) a.push({ tipo: "fora_do_ar" });
  if (s.formulario === "falha") a.push({ tipo: "formulario" });
  if (s.certificado_dias !== null && s.certificado_dias <= 15) a.push({ tipo: "certificado", dias: s.certificado_dias });
  return a;
}

export async function detalheCliente(id: string): Promise<DetalheCliente | null> {
  const e = await lerEmpresa(id);
  if (!e || e.estagio_crm !== "cliente") return null;
  const [hits, saudes, cobrancas, briefing, credenciais, contratos] = await Promise.all([
    lerHits(),
    lerSaude(),
    cobrancasDoCliente(id),
    briefingDaEmpresa(id),
    listarCredenciais(id),
    contratosDaEmpresa(id),
  ]);
  const pixel = pixelDe(e.site, hits);
  const card = montarCard(e, pixel);
  const s = saudes.find((x) => x.slug === id) || null;

  const totalPago = cobrancas.filter((c) => c.status === "pago" && c.tipo === "projeto").reduce((t, c) => t + c.valor, 0);
  const temProjeto = cobrancas.some((c) => c.tipo === "projeto");
  const divergencia =
    temProjeto && card.valorProjeto !== null && Math.abs(totalPago - card.valorProjeto) > 0.5
      ? { pago: totalPago, esperado: card.valorProjeto }
      : null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(hoje.getTime() + 30 * 86400000);
  const proximos = cobrancas
    .filter((c) => c.status === "pendente" && c.vencimento)
    .filter((c) => {
      const [y, m, d] = c.vencimento!.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      return dt >= hoje && dt <= limite;
    })
    .sort((a, b) => (a.vencimento || "").localeCompare(b.vencimento || ""));

  return {
    ...card,
    saude: s ? { ...s, alertas: alertasDaSaude(s) } : null,
    pixel,
    clarityUrl: "https://clarity.microsoft.com/",
    financeiro: { cobrancas, proximosVencimentos: proximos, totalPago, divergencia },
    briefing,
    cofreAtivo: cofreConfigurado(),
    credenciais,
    contratos,
  };
}

// ---------- escrita ----------
export async function criarClienteNovo(d: {
  nome: string;
  segmento?: string;
  cidade?: string;
  site?: string;
  valor_projeto?: number | null;
  recorrencia?: number | null;
}): Promise<{ id: string }> {
  let id = slug(d.nome, "cliente");
  if (await lerEmpresa(id)) id = `${id}-${Date.now().toString(36)}`;
  return criarEmpresa({
    id,
    nome: d.nome,
    segmento: d.segmento || null,
    cidade: d.cidade || null,
    site: d.site || null,
    estagio_crm: "cliente",
    status: "ativo",
    origem: "cliente",
    valor_projeto: d.valor_projeto ?? null,
    recorrencia: d.recorrencia ?? null,
  });
}

export async function editarCliente(
  id: string,
  d: { nome?: string; segmento?: string | null; cidade?: string | null; site?: string | null; valor_projeto?: number | null; recorrencia?: number | null },
): Promise<boolean> {
  const e = await lerEmpresa(id);
  if (!e || e.estagio_crm !== "cliente") return false;
  return atualizarEmpresa(id, d);
}

// Resumo da faixa de métricas: ativos e novos no mês.
export function resumoClientes(cards: CardCliente[]): { ativos: number; novosNoMes: number } {
  const mes = new Date().toISOString().slice(0, 7);
  return {
    ativos: cards.filter((c) => c.status !== "encerrado" && c.status !== "arquivado").length,
    novosNoMes: cards.filter((c) => (c.fechadoEm || "").slice(0, 7) === mes).length,
  };
}
