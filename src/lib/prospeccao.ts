// Prospecção automática: o Google Maps traz os negócios reais do segmento na cidade, e só
// entra no funil quem tem site no ar com problema de UX/UI e WhatsApp e Instagram validados.
// 1. Scraper do Google Maps (kit vzbaggio/google-maps-scraper-kit): nome, site e telefone reais.
// 2. Código confere o site (no ar, sem erro) e dá nota de UX/UI (lib/ux-auditoria.ts).
// 3. Código valida o WhatsApp (celular, número publicado no site) e o Instagram (linkado no site, perfil).
// Sem IA na busca: nada é inventado, então não entram domínios que não existem nem sites quebrados.
import { lookup, resolveNs } from "node:dns/promises";
import { analisarLead, extrairRedes, resumoMd, salvarAnalise } from "@/lib/analise";
import { gravarAnaliseNaFicha, listarLeads, pipelineOp } from "@/lib/data";
import { buscarNoMaps, scraperConfigurado, type Lugar } from "@/lib/gmaps-scraper";
import { auditarUX } from "@/lib/ux-auditoria";
import { validarInstagram, validarWhatsapp } from "@/lib/validacao-contatos";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
// Nota de UX/UI abaixo disso, com falha de celular ou de conversão, o site entra no funil.
const NOTA_MINIMA_SITE = 70;

export const FRENTE = "site-ruim";
export const FRENTE_LABEL = "Site no ar, mas com problemas de UX e UI";

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

export type Resultado = {
  fonte: string; modelo: string; candidatos: number; auditados: number; adicionados: string[];
  descartados: { nome: string; motivo: string }[]; erros: { nome: string; motivo: string }[];
  porFrente: Record<typeof FRENTE, number>; aviso: string; tempo: number; regiao: string; cidades: string[];
};

export const progresso = { ativo: false, fase: "", feito: 0, total: 0 };

// ---------- utilitários ----------
function slugNome(nome: string): string {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function hostnameDe(url: string): string {
  try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
}
function extrairEmail(html: string): string {
  const m = html.match(/href=["']mailto:([^"'?\s]+@[^"'?\s]+)/i)?.[1];
  return m && !/example|seudominio|email@/i.test(m) ? m.toLowerCase() : "";
}

// ---------- 1. o site existe e abre? ----------
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

// ---------- 2. orquestrador ----------
export async function prospectar(op: { nicho?: string; cidade?: string; limite?: number } = {}): Promise<Resultado> {
  if (progresso.ativo) throw new Error("já há uma prospecção rodando; aguarde ela terminar");
  if (!scraperConfigurado()) throw new Error("GMAPS_SCRAPER_URL não configurada: o scraper do Google Maps precisa estar no ar");
  const t0 = Date.now();
  const nicho = op.nicho && NICHOS[op.nicho] ? op.nicho : "odontologia";
  const cidade = (op.cidade || "Salvador, BA").trim().slice(0, 80);
  const limite = Math.min(12, Math.max(1, op.limite || 8));

  const res: Resultado = {
    fonte: "Google Maps (gosom/google-maps-scraper)", modelo: "", candidatos: 0, auditados: 0, adicionados: [], descartados: [], erros: [],
    porFrente: { "site-ruim": 0 }, aviso: "", tempo: 0, regiao: cidade, cidades: [cidade],
  };
  Object.assign(progresso, { ativo: true, fase: "buscando no Google Maps", feito: 0, total: 0 });

  try {
    const lugares = await buscarNoMaps({ termo: NICHOS[nicho], cidade, depth: 6, tempoMax: 180 });
    res.candidatos = lugares.length;
    if (!lugares.length) {
      res.aviso = `O Google Maps não trouxe ${NICHOS[nicho]} em ${cidade}. Tente outra cidade ou segmento.`;
      return res;
    }

    const existentes = await listarLeads();
    const nomes = new Set(existentes.map((l) => slugNome(l.nome)));
    const dominios = new Set(existentes.map((l) => hostnameDe(l.site)).filter(Boolean));
    Object.assign(progresso, { fase: "auditando", total: lugares.length });

    const descartar = (l: Lugar, motivo: string) => { res.descartados.push({ nome: l.nome, motivo }); };

    const add = async (l: Lugar, porque: string, canais: { whatsapp: string; email: string; instagram: string }) => {
      const extra = [l.nota ? `nota Google ${String(l.nota).replace(".", ",")}` : "", l.avaliacoes ? `${l.avaliacoes} avaliações` : "", l.endereco].filter(Boolean).join(" · ");
      const novo = await pipelineOp({
        action: "add", nome: l.nome, segmento: nicho, cidade,
        nota: l.nota ? String(l.nota).replace(".", ",") : "", avaliacoes: l.avaliacoes ? String(l.avaliacoes) : "",
        site: l.site, contato: canais.whatsapp, whatsapp: canais.whatsapp, email: canais.email, instagram: canais.instagram,
        categoria: "maps", frente: FRENTE,
        porque: `${FRENTE_LABEL}. ${porque} Encontrado no Google Maps${extra ? ` · ${extra}` : ""}.`,
      }) as { id?: string };
      res.adicionados.push(l.nome);
      res.porFrente[FRENTE]++;
      nomes.add(slugNome(l.nome));
      return novo;
    };

    const tratar = async (l: Lugar) => {
      if (nomes.has(slugNome(l.nome))) return descartar(l, "já está no funil");
      if (!l.site) return descartar(l, "sem site próprio no Google Maps");
      const host = hostnameDe(l.site);
      if (host && dominios.has(host)) return descartar(l, "domínio já está no funil");

      const diag = await diagnosticarSite(l.site);
      res.auditados++;
      progresso.feito = res.auditados;
      if (diag.estado !== "ok") return descartar(l, `site não abre: ${diag.motivo}`);

      const ux = auditarUX(diag.html, l.site);
      if (ux.pontuacao >= NOTA_MINIMA_SITE || !ux.temProblemaDeUso) {
        return descartar(l, `UX/UI ${ux.pontuacao}/100: site aceitável`);
      }

      const redes = extrairRedes(diag.html);
      if (!redes.instagram) return descartar(l, `UX/UI ${ux.pontuacao}/100, mas o site não linka Instagram`);
      const ig = await validarInstagram(redes.instagram);
      if (ig.status === "nao-existe") return descartar(l, "Instagram linkado no site não existe");

      const wa = validarWhatsapp(l.telefone, redes.whatsapp);
      if (wa.status === "sem-numero") return descartar(l, "WhatsApp: sem telefone no Google Maps");
      if (wa.status === "fixo") return descartar(l, "WhatsApp: o telefone é fixo, e fixo não tem WhatsApp");

      const email = l.emails[0] || extrairEmail(diag.html);
      const analise = await analisarLead({
        id: slugNome(l.nome), nome: l.nome, cidade, site: l.site,
        nota: l.nota || 0, avaliacoes: l.avaliacoes || 0,
        whatsapp: wa.numero, contato: wa.numero, email,
      }).catch(() => null);

      const problemas = ux.falhas.slice(0, 4).map((f) => f.rotulo).join("; ");
      const waTxt = wa.status === "confirmado-no-site"
        ? "número publicado como WhatsApp no próprio site"
        : "celular no formato válido (não confirmado no WhatsApp)";
      const igTxt = ig.status === "ativo" ? "perfil confirmado" : "linkado no site, perfil não confirmado pelo Instagram";
      const novo = await add(
        l,
        `UX/UI ${ux.pontuacao}/100. Problemas: ${problemas}. WhatsApp: ${waTxt}. Instagram: @${ig.handle}, ${igTxt}.` +
          (analise ? ` Presença digital ${analise.pontuacao}/100.` : ""),
        { whatsapp: wa.numero, email, instagram: redes.instagram },
      );
      // Reaproveita a análise já calculada na ficha nova.
      if (novo?.id && analise) {
        try {
          analise.id = novo.id;
          await salvarAnalise(analise);
          await gravarAnaliseNaFicha(novo.id, resumoMd(analise), analise.pontuacao, analise);
        } catch { /* a análise pode ser refeita na ficha */ }
      }
    };

    // Lotes pequenos em paralelo: a requisição tem tempo limitado na hospedagem.
    for (let i = 0; i < lugares.length && res.adicionados.length < limite; i += 4) {
      await Promise.allSettled(lugares.slice(i, i + 4).map(async (l) => {
        try { await tratar(l); } catch (e) { res.erros.push({ nome: l.nome, motivo: e instanceof Error ? e.message : "erro" }); }
      }));
    }
    return res;
  } finally {
    res.tempo = Math.round((Date.now() - t0) / 1000);
    Object.assign(progresso, { ativo: false, fase: "" });
  }
}

export function statusProspector() {
  return { scraper: scraperConfigurado(), progresso };
}
