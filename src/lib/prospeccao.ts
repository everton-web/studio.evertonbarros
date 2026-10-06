// Prospecção automática nas 3 frentes (sem Google, site quebrado, site ruim).
// 1. Um modelo do OpenRouter com busca na web lista negócios do segmento na cidade.
// 2. Código (sem IA) confere cada um: domínio existe? site abre? está quebrado? auditoria.
// 3. Só entra no funil quem tem problema real e algum canal de contato.
// Roda na Hostinger, sem PC nem CLI. Chave: OPENROUTER_API_KEY (só servidor).
import { lookup, resolveNs } from "node:dns/promises";
import { analisarLead, resumoMd, salvarAnalise } from "@/lib/analise";
import { gravarAnaliseNaFicha, listarLeads, pipelineOp } from "@/lib/data";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";
// Ordem de preferência; os gratuitos mudam com o tempo, então a lista real é filtrada
// pelo catálogo do OpenRouter na hora. OPENROUTER_MODELS (separado por vírgula) substitui.
const PREFERIDOS = (process.env.OPENROUTER_MODELS ||
  "google/gemma-4-31b-it:free,nvidia/nemotron-3-super-120b-a12b:free,nvidia/nemotron-3-ultra-550b-a55b:free,google/gemma-4-26b-a4b-it:free")
  .split(",").map((s) => s.trim()).filter(Boolean);

export type Frente = "sem-gmn" | "site-quebrado" | "site-ruim";
export const FRENTES: Frente[] = ["sem-gmn", "site-quebrado", "site-ruim"];
export const FRENTE_LABEL: Record<Frente, string> = {
  "sem-gmn": "Google Meu Negócio sem site ou incompleto",
  "site-quebrado": "Site quebrado ou fora do ar",
  "site-ruim": "Site no ar, mas mal construído",
};

export const NICHOS: Record<string, string> = {
  odontologia: "clínicas odontológicas e dentistas",
  "clinicas-medicas": "clínicas médicas",
  estetica: "clínicas de estética",
  advocacia: "escritórios de advocacia",
  contabilidade: "escritórios de contabilidade",
  imobiliarias: "imobiliárias",
  restaurantes: "restaurantes",
  "hoteis-pousadas": "hotéis e pousadas",
  academias: "academias",
  "pet-shops": "pet shops e clínicas veterinárias",
  "construcao-reformas": "empresas de construção e reformas",
  "escolas-cursos": "escolas e cursos livres",
};

type Candidato = { nome: string; site: string; telefone: string; instagram: string; nota: number | null; avaliacoes: number | null };
export type Resultado = {
  fonte: string; modelo: string; candidatos: number; auditados: number; adicionados: string[];
  descartados: { nome: string; motivo: string }[]; erros: { nome: string; motivo: string }[];
  porFrente: Record<Frente, number>; aviso: string; tempo: number; regiao: string; cidades: string[];
};

export const progresso = { ativo: false, fase: "", feito: 0, total: 0 };

// ---------- utilitários ----------
function slugNome(nome: string): string {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function hostnameDe(url: string): string {
  try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
}
// Telefone brasileiro válido (fixo ou celular), normalizado com 55. Qualquer outra coisa vira "".
function foneBR(v: string): string {
  let d = String(v || "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (!/^[1-9][1-9]/.test(d)) return "";
  if (d.length === 10 && /[6-9]/.test(d[2])) d = d.slice(0, 2) + "9" + d.slice(2);
  if (d.length === 10 && /[2-5]/.test(d[2])) return "55" + d;
  if (d.length === 11 && d[2] === "9") return "55" + d;
  return "";
}
// Sites que não são "o site da empresa" (rede social, diretório, marketplace).
const NAO_E_SITE = /(instagram|facebook|linkedin|youtube|tiktok|wa\.me|whatsapp|linktr\.ee|google\.com|goo\.gl|doctoralia|boaconsulta|ifood|tripadvisor|booking\.com|guiamais|apontador|telelistas|solutudo|cylex|econodata|cnpj)/i;

// ---------- 1. busca (OpenRouter + web) ----------
async function modelosDisponiveis(): Promise<string[]> {
  try {
    const r = await fetch("https://openrouter.ai/api/v1/models", { signal: AbortSignal.timeout(8000) });
    const ids = new Set(((await r.json()).data as { id: string }[]).map((m) => m.id));
    const ok = PREFERIDOS.filter((m) => ids.has(m));
    if (ok.length) return ok;
    return [...ids].filter((id) => id.endsWith(":free")).slice(0, 4);
  } catch {
    return PREFERIDOS;
  }
}

function extrairJson(texto: string): unknown[] {
  const bloco = texto.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? texto;
  const ini = bloco.indexOf("[");
  const fim = bloco.lastIndexOf("]");
  if (ini < 0 || fim <= ini) return [];
  try { const v = JSON.parse(bloco.slice(ini, fim + 1)); return Array.isArray(v) ? v : []; } catch { return []; }
}

async function buscarCandidatos(nicho: string, cidade: string, limite: number, erros: Resultado["erros"]): Promise<{ lista: Candidato[]; modelo: string }> {
  if (!OPENROUTER_KEY) throw new Error("OPENROUTER_API_KEY não configurada no servidor");
  const prompt =
    `Pesquise na web ${limite * 2} ${NICHOS[nicho] || nicho} reais e em funcionamento em ${cidade}, Brasil. ` +
    "Prefira negócios pequenos e médios, independentes (não franquias nem redes nacionais), " +
    "incluindo os que aparecem em guias, diretórios e no Google Maps com site simples, antigo ou sem site. " +
    "Para cada um, traga só dados que você encontrou nas fontes: nome, site próprio (deixe vazio se não tiver ou se for só Instagram), " +
    "telefone com DDD, perfil do Instagram, nota e número de avaliações no Google se aparecerem. Não invente nada. " +
    'Responda APENAS um array JSON: [{"nome":"","site":"","telefone":"","instagram":"","nota":null,"avaliacoes":null}]';

  for (const modelo of await modelosDisponiveis()) {
    try {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(45000),
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://app.evertonbrito.com",
          "X-Title": "Plataforma Marca Digital",
        },
        body: JSON.stringify({
          model: modelo,
          messages: [{ role: "user", content: prompt }],
          plugins: [{ id: "web", max_results: 8 }],
          temperature: 0.2,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message || `HTTP ${r.status}`);
      const lista = extrairJson(String(j.choices?.[0]?.message?.content || ""))
        .map((x) => x as Record<string, unknown>)
        .map((x) => ({
          nome: String(x.nome || "").trim(),
          site: String(x.site || "").trim(),
          telefone: foneBR(String(x.telefone || "")),
          instagram: String(x.instagram || "").trim(),
          nota: Number(x.nota) > 0 && Number(x.nota) <= 5 ? Number(x.nota) : null,
          avaliacoes: Number(x.avaliacoes) > 0 ? Math.round(Number(x.avaliacoes)) : null,
        }))
        .filter((c) => c.nome.length > 2)
        .map((c) => ({ ...c, site: c.site && !NAO_E_SITE.test(c.site) ? (c.site.startsWith("http") ? c.site : `https://${c.site}`) : "" }));
      if (lista.length) return { lista, modelo };
      erros.push({ nome: modelo, motivo: "resposta sem lista válida" });
    } catch (e) {
      erros.push({ nome: modelo, motivo: e instanceof Error ? e.message.slice(0, 120) : "falha" });
    }
  }
  return { lista: [], modelo: "" };
}

// ---------- 2. checagens por código ----------
async function estadoDominio(url: string): Promise<"aponta" | "registrado" | "inexistente"> {
  const host = hostnameDe(url);
  if (!host) return "inexistente";
  try { await lookup(host); return "aponta"; } catch { /* segue */ }
  const partes = host.split(".");
  const sufixoDuplo = /^(com|net|org|edu|gov|art|adv|eng|med|odo|blog|eco|ind|inf|tur|psi|vet|arq|co|ac)\.[a-z]{2}$/.test(partes.slice(-2).join("."));
  const registravel = partes.slice(-(sufixoDuplo ? 3 : 2)).join(".");
  if (registravel.split(".").length < (sufixoDuplo ? 3 : 2)) return "inexistente";
  try { if ((await resolveNs(registravel)).length) return "registrado"; } catch { /* sem NS */ }
  return "inexistente";
}

const SINAIS_QUEBRADO: [RegExp, string][] = [
  [/account (has been )?suspended|conta suspensa/i, "hospedagem suspensa"],
  [/domain (is )?(for sale|expired|parked)|este dom[ií]nio (est[aá] )?(à|a) venda|parked domain|domain parking|dom[ií]nio expirado/i, "domínio estacionado ou expirado"],
  [/error establishing a database connection|erro ao estabelecer (uma )?conex[aã]o com o banco/i, "erro de banco de dados (WordPress)"],
  [/<title>\s*index of \//i, "listagem de pasta (site não publicado)"],
  [/site em constru[cç][aã]o|under construction|coming soon|em manuten[cç][aã]o|maintenance mode/i, "site em construção ou manutenção"],
  [/welcome to nginx|apache2 (ubuntu|debian) default page|<h1>it works!<\/h1>/i, "página padrão do servidor"],
  [/<b>(fatal error|parse error|warning)<\/b>|uncaught exception/i, "erro de programação visível"],
];

type Diagnostico = { estado: "ok" | "quebrado" | "offline" | "inexistente"; motivo: string; html: string };

async function diagnosticarSite(url: string): Promise<Diagnostico> {
  const dns = await estadoDominio(url);
  if (dns === "inexistente") return { estado: "inexistente", motivo: "domínio não existe", html: "" };
  if (dns === "registrado") return { estado: "quebrado", motivo: "domínio registrado, mas sem site apontado", html: "" };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9" } });
    if (res.status >= 500) return { estado: "quebrado", motivo: `erro do servidor (HTTP ${res.status})`, html: "" };
    if (res.status === 404 || res.status === 410) return { estado: "quebrado", motivo: `página inicial não encontrada (HTTP ${res.status})`, html: "" };
    if (res.status >= 400) return { estado: "quebrado", motivo: `erro HTTP ${res.status}`, html: "" };
    const html = await res.text();
    for (const [re, motivo] of SINAIS_QUEBRADO) if (re.test(html)) return { estado: "quebrado", motivo, html };
    const texto = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (texto.length < 120 && !/<script/i.test(html)) return { estado: "quebrado", motivo: "página praticamente vazia", html };
    return { estado: "ok", motivo: "", html };
  } catch (e) {
    if (ctrl.signal.aborted) return { estado: "offline", motivo: "site não respondeu (tempo esgotado)", html: "" };
    const err = e as { cause?: { code?: string }; code?: string; message?: string };
    const m = String(err?.cause?.code || err?.code || err?.message || "");
    if (/CERT|SSL|TLS|SELF_SIGNED|UNABLE_TO_VERIFY/i.test(m)) return { estado: "quebrado", motivo: "certificado de segurança inválido", html: "" };
    return { estado: "offline", motivo: `site fora do ar (${m.slice(0, 40) || "sem resposta"})`, html: "" };
  } finally { clearTimeout(t); }
}

type Contatos = { whatsapp?: string; telefone?: string; email?: string };
function extrairContatos(html: string): Contatos {
  const wa = html.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\/?\?phone=)(\+?\d{10,13})/i)?.[1];
  const tel = html.match(/href=["']tel:([+\d\s().-]{8,20})["']/i)?.[1];
  const email = html.match(/href=["']mailto:([^"'?\s]+@[^"'?\s]+)/i)?.[1];
  return {
    whatsapp: (wa && foneBR(wa)) || undefined,
    telefone: (tel && foneBR(tel)) || undefined,
    email: email && !/example|seudominio|email@/i.test(email) ? email.toLowerCase() : undefined,
  };
}

function auditar(html: string): { problemas: string[]; contatos: Contatos } {
  const contatos = extrairContatos(html);
  const low = html.toLowerCase();
  const problemas: string[] = [];
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) problemas.push("sem meta viewport (quebra no celular)");
  if (!/wa\.me\/|api\.whatsapp\.com|whatsapp/i.test(low)) problemas.push("sem botão de WhatsApp visível");
  if (!/tel:/i.test(low) && !contatos.whatsapp) problemas.push("sem telefone clicável");
  if (!/<title>/i.test(low)) problemas.push("sem título de página");
  const ano = (html.match(/©\s*(20\d\d)|(20\d\d)\s*©/) || [])[1];
  if (ano && Number(ano) < 2023) problemas.push(`conteúdo datado (${ano})`);
  if (/wix\.com|google\.com\/sites|webnode|site123|gratis/i.test(low)) problemas.push("plataforma gratuita ou terceirizada");
  if (!/<meta[^>]+name=["']description["']/i.test(html)) problemas.push("sem descrição para o Google");
  if (!/googletagmanager\.com|gtag\(|google-analytics\.com|fbq\(|connect\.facebook\.net\/[^"']*fbevents/i.test(html)) problemas.push("sem rastreamento (Analytics ou pixel)");
  if (!/<meta[^>]+property=["']og:(title|image)["']/i.test(html)) problemas.push("sem prévia para compartilhar no WhatsApp");
  if (!/<h1[\s>]/i.test(html)) problemas.push("sem título principal (H1)");
  if (/jquery[.-]1\.|jquery[.-]2\.|bootstrap[.-][23]\./i.test(low)) problemas.push("código antigo (bibliotecas desatualizadas)");
  return { problemas, contatos };
}

// ---------- 3. orquestrador ----------
export async function prospectar(op: { nicho?: string; cidade?: string; limite?: number; frentes?: string[] } = {}): Promise<Resultado> {
  const t0 = Date.now();
  const frentes = new Set<Frente>((op.frentes || FRENTES).filter((x): x is Frente => (FRENTES as string[]).includes(x)));
  if (!frentes.size) FRENTES.forEach((x) => frentes.add(x));
  const nicho = op.nicho && NICHOS[op.nicho] ? op.nicho : "odontologia";
  const cidade = (op.cidade || "Salvador, BA").trim().slice(0, 80);
  const limite = Math.min(12, Math.max(1, op.limite || 8));

  const res: Resultado = {
    fonte: "OpenRouter + busca na web", modelo: "", candidatos: 0, auditados: 0, adicionados: [], descartados: [], erros: [],
    porFrente: { "sem-gmn": 0, "site-quebrado": 0, "site-ruim": 0 }, aviso: "", tempo: 0, regiao: cidade, cidades: [cidade],
  };
  Object.assign(progresso, { ativo: true, fase: "buscando empresas", feito: 0, total: 0 });

  try {
    const { lista, modelo } = await buscarCandidatos(nicho, cidade, limite, res.erros);
    res.modelo = modelo;
    res.candidatos = lista.length;
    if (!lista.length) {
      res.aviso = `Nenhum modelo retornou empresas de "${NICHOS[nicho]}" em ${cidade}. Veja os erros abaixo; se for limite dos modelos gratuitos, tente de novo em alguns minutos.`;
      return res;
    }

    const existentes = await listarLeads();
    const nomes = new Set(existentes.map((l) => slugNome(l.nome)));
    const dominios = new Set(existentes.map((l) => hostnameDe(l.site)).filter(Boolean));
    Object.assign(progresso, { fase: "auditando", total: lista.length });

    const add = async (c: Candidato, frente: Frente, porque: string, contatos: Contatos = {}) => {
      const fone = c.telefone || contatos.whatsapp || contatos.telefone || "";
      const extra = [c.nota ? `nota Google ${String(c.nota).replace(".", ",")}` : "", c.avaliacoes ? `${c.avaliacoes} avaliações` : "", c.instagram ? `Instagram: ${c.instagram}` : ""].filter(Boolean).join(" · ");
      const novo = await pipelineOp({
        action: "add", nome: c.nome, segmento: nicho, cidade,
        nota: c.nota ? String(c.nota).replace(".", ",") : "", avaliacoes: c.avaliacoes ? String(c.avaliacoes) : "",
        site: c.site, contato: fone, whatsapp: contatos.whatsapp || fone, email: contatos.email || "",
        categoria: "ia", frente,
        porque: `${FRENTE_LABEL[frente]}. ${porque} Encontrado via busca na web${extra ? ` · ${extra}` : ""}.`,
      });
      res.adicionados.push(c.nome);
      res.porFrente[frente]++;
      nomes.add(slugNome(c.nome));
      return novo as { id?: string };
    };

    // Lotes pequenos em paralelo: a requisição tem tempo limitado na hospedagem.
    for (let i = 0; i < lista.length && res.adicionados.length < limite; i += 4) {
      await Promise.allSettled(lista.slice(i, i + 4).map(async (c) => {
        try {
          if (nomes.has(slugNome(c.nome))) { res.descartados.push({ nome: c.nome, motivo: "já está no funil" }); return; }
          const host = hostnameDe(c.site);
          if (host && dominios.has(host)) { res.descartados.push({ nome: c.nome, motivo: "domínio já está no funil" }); return; }

          // Frente 1: sem site próprio
          if (!c.site) {
            if (!frentes.has("sem-gmn")) { res.descartados.push({ nome: c.nome, motivo: "sem site (frente não selecionada)" }); return; }
            if (!c.telefone) { res.descartados.push({ nome: c.nome, motivo: "sem site e sem telefone: sem como abordar" }); return; }
            await add(c, "sem-gmn", "Não tem site próprio; a presença depende do Google e das redes.");
            return;
          }

          const diag = await diagnosticarSite(c.site);
          res.auditados++;
          progresso.feito = res.auditados;
          if (diag.estado === "inexistente") { res.descartados.push({ nome: c.nome, motivo: `${diag.motivo} (possível dado inventado)` }); return; }

          // Frente 2: site quebrado ou fora do ar
          if (diag.estado !== "ok") {
            if (!frentes.has("site-quebrado")) { res.descartados.push({ nome: c.nome, motivo: `${diag.motivo} (frente não selecionada)` }); return; }
            if (!c.telefone) { res.descartados.push({ nome: c.nome, motivo: `${diag.motivo}, mas sem telefone para abordar` }); return; }
            await add(c, "site-quebrado", `Site: ${diag.motivo}.`);
            return;
          }

          // Frente 3: site no ar, mas mal construído
          if (!frentes.has("site-ruim")) { res.descartados.push({ nome: c.nome, motivo: "site no ar (frente não selecionada)" }); return; }
          const aud = auditar(diag.html);
          const temContato = !!(c.telefone || aud.contatos.whatsapp || aud.contatos.telefone || aud.contatos.email);
          if (!temContato) { res.descartados.push({ nome: c.nome, motivo: "nenhum telefone, WhatsApp ou e-mail" }); return; }
          // "Sem telefone clicável" e "sem descrição" sozinhos não justificam abordagem.
          const fortes = aud.problemas.filter((p) => !/sem telefone clicável|sem descrição/.test(p));
          let a: Awaited<ReturnType<typeof analisarLead>> | null = null;
          try {
            a = await analisarLead({
              id: slugNome(c.nome), nome: c.nome, cidade, site: c.site,
              nota: c.nota || 0, avaliacoes: c.avaliacoes || 0,
              whatsapp: aud.contatos.whatsapp || c.telefone, contato: c.telefone, email: aud.contatos.email || "",
            });
          } catch { /* sem análise, decide só pela auditoria */ }
          const pts = a?.pontuacao ?? 100;
          const entra = fortes.length >= 2 || pts <= 60 || (fortes.length >= 1 && pts <= 75);
          if (!entra) {
            res.descartados.push({ nome: c.nome, motivo: `site razoável · presença ${a ? pts + "/100" : "?"}${aud.problemas.length ? ` (${aud.problemas.join("; ")})` : ""}` });
            return;
          }
          const novo = await add(c, "site-ruim", `${a ? `Presença ${pts}/100. ` : ""}Auditoria: ${aud.problemas.join("; ")}.`, aud.contatos);
          // Reaproveita a análise já calculada na ficha nova.
          if (novo?.id && a) {
            try {
              a.id = novo.id;
              await salvarAnalise(a);
              await gravarAnaliseNaFicha(novo.id, resumoMd(a), a.pontuacao, a);
            } catch { /* a análise pode ser refeita na ficha */ }
          }
        } catch (e) {
          res.erros.push({ nome: c.nome, motivo: e instanceof Error ? e.message : "erro" });
        }
      }));
    }
    return res;
  } finally {
    res.tempo = Math.round((Date.now() - t0) / 1000);
    Object.assign(progresso, { ativo: false, fase: "" });
  }
}

export function statusProspector() {
  return { openrouter: !!OPENROUTER_KEY, modelos: PREFERIDOS, progresso };
}
