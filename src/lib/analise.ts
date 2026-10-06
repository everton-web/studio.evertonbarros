// Análise de presença digital de um lead — o "raio-x" que o Everton lê antes de abordar.
// Fontes:
//   1. Site do lead (HTML) — redes sociais, WhatsApp, e-mail, telefone, SEO, rastreamento, celular.
//   2. Google Meu Negócio via Places API (GOOGLE_PLACES_KEY) — nota, avaliações, horário, fotos,
//      categorias, avaliações recentes. Sem chave: usa nota/avaliações da ficha + link do Maps.
// Resultado salvo em lead_analyses (Supabase) + resumo na ficha do lead.

import { lerAnaliseLead, salvarAnaliseLead } from "@/lib/data";

const PLACES_KEY = process.env.GOOGLE_PLACES_KEY || "";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

export type Prioridade = "alta" | "media" | "baixa";
export type Area = "google" | "site" | "redes" | "rastreio" | "contato";
export type Falta = { area: Area; prioridade: Prioridade; item: string; porque: string };

export type Analise = {
  id: string;
  nome: string;
  geradoEm: string;
  pontuacao: number; // 0–100: quanto da presença digital está de pé
  google: {
    fonte: "places" | "ficha";
    nota: number | null;
    avaliacoes: number | null;
    endereco: string;
    telefone: string;
    categorias: string[];
    horario: string[];
    fotos: number | null;
    status: string;
    siteNoPerfil: string;
    ultimaAvaliacao: string;
    avaliacoesRecentes: { autor: string; nota: number; quando: string; texto: string }[];
    mapsUrl: string;
  };
  site: {
    url: string;
    ok: boolean;
    status: number | null;
    ms: number | null;
    https: boolean;
    titulo: string;
    descricao: string;
    celular: boolean;
    ogImagem: boolean;
    schemaLocal: boolean;
    formulario: boolean;
    plataforma: string;
    anoRodape: number | null;
    soJavascript: boolean;
    rastreio: { ga4: boolean; gtm: boolean; pixel: boolean; clarity: boolean };
  } | null;
  redes: { instagram: string; facebook: string; tiktok: string; linkedin: string; youtube: string; whatsapp: string };
  contatos: { emails: string[]; telefones: string[] };
  links: { maps: string; buscaGoogle: string; buscaInstagram: string; whatsapp: string };
  faltas: Falta[];
  fortes: string[];
};

type LeadBase = { id: string; nome: string; cidade?: string; site?: string; nota?: number; avaliacoes?: number; whatsapp?: string; contato?: string; email?: string };

const soDigitos = (s: string) => (s || "").replace(/\D/g, "");
function waDe(numero: string) {
  let n = soDigitos(numero);
  if (!n) return "";
  if (n.length <= 11) n = "55" + n; // número nacional → DDI Brasil
  return `https://wa.me/${n}`;
}
const q = (s: string) => encodeURIComponent(s.trim());

async function buscarHtml(url: string): Promise<{ html: string; status: number; ms: number; final: string }> {
  const ini = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9" } });
    const html = res.ok ? (await res.text()).slice(0, 1_500_000) : "";
    return { html, status: res.status, ms: Date.now() - ini, final: res.url || url };
  } finally { clearTimeout(t); }
}

// ---------- extração de redes e contatos do HTML ----------
function primeiro(html: string, re: RegExp, filtro?: (u: string) => boolean): string {
  for (const m of html.matchAll(re)) {
    const u = m[0].replace(/&amp;/g, "&").replace(/["'<>\s].*$/, "").replace(/[),.;]+$/, "");
    if (!filtro || filtro(u)) return u.startsWith("http") ? u : `https://${u}`;
  }
  return "";
}
const NAO_PERFIL = /\/(sharer|share|intent|plugins|dialog|tr\?|p\/|reel\/|explore|accounts|embed)/i;

function extrairRedes(html: string) {
  return {
    instagram: primeiro(html, /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[A-Za-z0-9_.]{2,30}\/?/gi, (u) => !NAO_PERFIL.test(u)),
    facebook: primeiro(html, /(?:https?:\/\/)?(?:www\.|m\.)?facebook\.com\/[A-Za-z0-9_.\-/]{3,80}/gi, (u) => !NAO_PERFIL.test(u) && !/facebook\.com\/(tr|plugins)/.test(u)),
    tiktok: primeiro(html, /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.]{2,30}/gi),
    linkedin: primeiro(html, /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9_\-%.]{2,80}/gi),
    youtube: primeiro(html, /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:@|channel\/|c\/|user\/)[A-Za-z0-9_\-.]{2,60}/gi),
    whatsapp: primeiro(html, /(?:https?:\/\/)?(?:wa\.me\/\d{10,15}|api\.whatsapp\.com\/send\/?\?phone=\d{10,15}|web\.whatsapp\.com\/send\/?\?phone=\d{10,15})/gi),
  };
}

function extrairContatos(html: string) {
  const texto = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const emails = [...new Set([...texto.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)].map((m) => m[0].toLowerCase()))]
    .filter((e) => !/\.(png|jpe?g|webp|svg|gif)$/.test(e) && !/(sentry|example|wixpress|domain\.com|email\.com|seuemail)/.test(e)).slice(0, 4);
  // só telefone formatado (parênteses, hífen, espaço ou tel:) — número cru em JS costuma ser data/hash
  const telefones = [...new Set([...texto.matchAll(/(?:tel:)?\(?\b(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-.\s]?\d{4}\b/g)]
    .map((m) => m[0]).filter((t) => /^tel:|[()\-\s.]/.test(t)).map((t) => t.replace(/^tel:/, "").trim()))].slice(0, 4);
  return { emails, telefones };
}

function textoVisivel(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Sites em JavaScript (Vite/React sem SSR) guardam links e telefones dentro do bundle:
// baixa até 3 scripts do próprio domínio para achar Instagram/WhatsApp/telefone.
async function scriptsDoSite(html: string, base: string): Promise<string> {
  const srcs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1])
    .map((u) => { try { return new URL(u, base).toString(); } catch { return ""; } })
    .filter((u) => u && new URL(u).host === new URL(base).host).slice(0, 3);
  let out = "";
  for (const u of srcs) {
    try { const r = await buscarHtml(u); out += "\n" + r.html.slice(0, 2_000_000); } catch { /* segue */ }
  }
  return out;
}

function analisarHtml(html: string, url: string, status: number, ms: number) {
  const pega = (re: RegExp) => (html.match(re)?.[1] || "").replace(/\s+/g, " ").trim();
  const anos = [...html.matchAll(/(?:©|&copy;|copyright)[^<]{0,40}?(20\d{2})/gi)].map((m) => Number(m[1]));
  const gen = pega(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i);
  const plataforma = /wp-content|wordpress/i.test(html) ? "WordPress"
    : /wix\.com|wixstatic/i.test(html) ? "Wix"
    : /squarespace/i.test(html) ? "Squarespace"
    : /shopify/i.test(html) ? "Shopify"
    : /_next\/|__NEXT_DATA__/i.test(html) ? "Next.js"
    : gen ? gen.split(" ")[0] : "HTML";
  return {
    url, ok: status >= 200 && status < 400, status, ms,
    https: url.startsWith("https://"),
    titulo: pega(/<title[^>]*>([^<]{0,200})<\/title>/i),
    descricao: pega(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{0,300})/i) || pega(/<meta[^>]+content=["']([^"']{0,300})["'][^>]+name=["']description["']/i),
    celular: /<meta[^>]+name=["']viewport["']/i.test(html),
    ogImagem: /<meta[^>]+property=["']og:image["']/i.test(html),
    schemaLocal: /"@type"\s*:\s*"(LocalBusiness|Dentist|Restaurant|MedicalBusiness|Store|Hotel|LodgingBusiness|ProfessionalService|[A-Za-z]*Business)"/i.test(html),
    formulario: /<form[\s>]/i.test(html),
    plataforma,
    anoRodape: anos.length ? Math.max(...anos) : null,
    soJavascript: textoVisivel(html).length < 250 && /<script[^>]+type=["']module["']|<div id=["'](root|app|__next)["']><\/div>/i.test(html),
    rastreio: {
      ga4: /gtag\(|googletagmanager\.com\/gtag|G-[A-Z0-9]{6,}/.test(html),
      gtm: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]{4,}/.test(html),
      pixel: /connect\.facebook\.net\/[^"']*fbevents|fbq\(/.test(html),
      clarity: /clarity\.ms/.test(html),
    },
  };
}

// ---------- Google Meu Negócio (Places API) ----------
async function googlePlaces(nome: string, cidade: string) {
  const busca = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q(`${nome} ${cidade || "Salvador BA"}`)}&language=pt-BR&key=${PLACES_KEY}`);
  const bd = (await busca.json()) as { results?: { place_id: string }[]; status?: string; error_message?: string };
  if (bd.status && bd.status !== "OK" && bd.status !== "ZERO_RESULTS") throw new Error(`Places: ${bd.status} ${bd.error_message || ""}`.trim());
  const id = bd.results?.[0]?.place_id;
  if (!id) return null;
  const campos = "name,rating,user_ratings_total,formatted_address,formatted_phone_number,website,opening_hours,photos,types,url,business_status,reviews";
  const r = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${id}&fields=${campos}&language=pt-BR&reviews_sort=newest&key=${PLACES_KEY}`);
  const d = ((await r.json()) as { result?: any }).result || {};
  const reviews = (d.reviews || []) as { author_name: string; rating: number; time: number; relative_time_description: string; text: string }[];
  const maisNova = reviews.reduce((a, b) => Math.max(a, b.time || 0), 0);
  return {
    nota: typeof d.rating === "number" ? d.rating : null,
    avaliacoes: typeof d.user_ratings_total === "number" ? d.user_ratings_total : null,
    endereco: d.formatted_address || "",
    telefone: d.formatted_phone_number || "",
    categorias: ((d.types || []) as string[]).filter((t) => !["point_of_interest", "establishment"].includes(t)).map((t) => t.replace(/_/g, " ")),
    horario: (d.opening_hours?.weekday_text || []) as string[],
    fotos: Array.isArray(d.photos) ? d.photos.length : 0, // a API devolve no máx. 10 referências
    status: d.business_status || "",
    siteNoPerfil: d.website || "",
    ultimaAvaliacao: maisNova ? new Date(maisNova * 1000).toISOString().slice(0, 10) : "",
    avaliacoesRecentes: reviews.slice(0, 3).map((x) => ({ autor: x.author_name, nota: x.rating, quando: x.relative_time_description, texto: (x.text || "").slice(0, 220) })),
    mapsUrl: d.url || "",
  };
}

// ---------- diagnóstico ----------
function diagnosticar(a: Omit<Analise, "faltas" | "fortes" | "pontuacao">) {
  const faltas: Falta[] = [];
  const fortes: string[] = [];
  const g = a.google;
  const s = a.site;
  const f = (area: Area, prioridade: Prioridade, item: string, porque: string) => faltas.push({ area, prioridade, item, porque });

  // Google Meu Negócio
  if (g.nota != null) {
    if (g.nota >= 4.7) fortes.push(`Nota ${g.nota.toLocaleString("pt-BR")} no Google: reputação é argumento de venda`);
    else if (g.nota < 4.3) f("google", "alta", `Nota ${g.nota.toLocaleString("pt-BR")} no Google`, "Abaixo de 4,3 o cliente compara e escolhe o concorrente. Pedir avaliação a cada atendimento e responder as negativas.");
  } else f("google", "media", "Nota do Google não confirmada", "Abra o perfil no Maps e confira se ele existe e está verificado.");
  if (g.avaliacoes != null) {
    if (g.avaliacoes < 30) f("google", "alta", `Só ${g.avaliacoes} avaliações`, "Poucas avaliações passam pouca confiança. Meta: 50+ com rotina de pedir avaliação (QR code / link no WhatsApp).");
    else if (g.avaliacoes >= 100) fortes.push(`${g.avaliacoes} avaliações: prova social forte`);
  }
  if (g.fonte === "places") {
    if (!g.horario.length) f("google", "alta", "Perfil sem horário de funcionamento", "O Google mostra 'horário desconhecido' e o cliente desiste de ligar/ir.");
    if ((g.fotos ?? 0) < 10) f("google", "media", `Poucas fotos no perfil (${g.fotos ?? 0})`, "Perfis com 10+ fotos recebem mais cliques em rotas e ligações. Fotos da fachada, equipe e serviço.");
    if (!g.siteNoPerfil) f("google", "alta", "Perfil do Google sem site", "Quem pesquisa não tem para onde clicar: perde a venda para quem tem.");
    else if (a.site && !a.site.ok) f("google", "alta", "O site do perfil do Google está fora do ar", "O botão 'Site' do Google leva a um erro: pior do que não ter.");
    if (!g.telefone) f("google", "alta", "Perfil sem telefone", "O botão 'Ligar' some do Google.");
    if (g.status && g.status !== "OPERATIONAL") f("google", "alta", `Status no Google: ${g.status}`, "O Google indica que o negócio não está operando normalmente.");
    if (g.ultimaAvaliacao) {
      const dias = Math.round((Date.now() - new Date(g.ultimaAvaliacao).getTime()) / 86400000);
      if (dias > 90) f("google", "media", `Última avaliação há ${dias} dias`, "Perfil parado perde posição no Maps. Rotina de pedir avaliação mantém o perfil vivo.");
    }
  } else {
    f("google", "baixa", "Dados completos do Google não puxados", "Sem a chave do Google Places, horário, fotos e avaliações recentes precisam ser conferidos à mão no link do Maps.");
  }

  // Site
  if (!s) f("site", "alta", "Não tem site", "Depende só do Google e das redes: sem página própria para converter quem pesquisa.");
  else if (!s.ok) f("site", "alta", `Site fora do ar (HTTP ${s.status ?? "sem resposta"})`, "Quem clica encontra erro: perda direta de clientes e de posição no Google.");
  else {
    if (!s.https) f("site", "alta", "Site sem HTTPS (cadeado)", "O navegador marca como 'Não seguro' e afasta o cliente.");
    if (!s.celular) f("site", "alta", "Site não adaptado ao celular", "A maioria das buscas locais é pelo celular; a página fica ilegível.");
    if (s.ms != null && s.ms > 4000) f("site", "media", `Site lento (${(s.ms / 1000).toFixed(1)}s para responder)`, "Acima de 3s metade dos visitantes desiste antes de carregar.");
    if (!s.titulo || s.titulo.length < 15) f("site", "media", "Título da página fraco ou ausente", "É o texto azul que aparece no Google: sem ele, ninguém entende o que o negócio faz.");
    if (!s.descricao) f("site", "media", "Sem descrição para o Google (meta description)", "O Google inventa um resumo aleatório no resultado da busca.");
    if (!s.schemaLocal) f("site", "baixa", "Sem marcação de negócio local (schema)", "Ajuda o Google a ligar o site ao perfil do Maps (endereço, horário, nota).");
    if (!s.ogImagem) f("site", "baixa", "Link sem imagem ao compartilhar", "No WhatsApp/Instagram o link aparece sem foto: menos cliques.");
    if (s.soJavascript) f("site", "media", "Conteúdo do site só aparece via JavaScript", "O Google lê uma página quase vazia: o site perde posição na busca. Precisa de pré-renderização (SSR).");
    if (!s.formulario && !a.redes.whatsapp) f("contato", "alta", "Site sem formulário e sem botão de WhatsApp", "O visitante interessado não tem como chamar em um clique.");
    if (s.anoRodape && s.anoRodape < new Date().getFullYear() - 1) f("site", "media", `Rodapé parado em ${s.anoRodape}`, "Passa a impressão de site abandonado.");
    if (s.ok && s.https && s.celular) fortes.push(`Site no ar, com HTTPS e versão para celular (${s.plataforma})`);
  }

  // Rastreamento
  if (s?.ok) {
    const r = s.rastreio;
    if (!r.ga4 && !r.gtm) f("rastreio", "media", "Sem Google Analytics", "O dono não sabe quantas pessoas visitam nem de onde vêm.");
    if (!r.pixel) f("rastreio", "media", "Sem Pixel da Meta", "Não dá para anunciar para quem já visitou o site (remarketing no Instagram).");
    if (r.ga4 || r.gtm || r.pixel) fortes.push("Já tem algum rastreamento instalado");
  }

  // Redes e contato
  if (!a.redes.instagram) f("redes", "media", "Instagram não encontrado no site", "Se existe, não está linkado; se não existe, é o canal nº 1 do público local.");
  if (!a.redes.whatsapp && !soDigitos(a.links.whatsapp) && !faltas.some((x) => x.item.includes("WhatsApp"))) f("contato", "alta", "Sem WhatsApp visível", "É o canal onde o cliente de Salvador fecha. Botão flutuante no site e no Instagram.");
  if (a.redes.whatsapp) fortes.push("WhatsApp linkado no site");
  if (a.redes.instagram) fortes.push("Instagram linkado no site");

  // pontuação: parte do máximo e desconta por prioridade
  const peso: Record<Prioridade, number> = { alta: 12, media: 6, baixa: 2 };
  const pontuacao = Math.max(0, Math.min(100, 100 - faltas.reduce((t, x) => t + peso[x.prioridade], 0)));
  const ordem: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 };
  faltas.sort((x, y) => ordem[x.prioridade] - ordem[y.prioridade]);
  return { faltas, fortes, pontuacao };
}

// ---------- API pública ----------
export async function analisarLead(lead: LeadBase): Promise<Analise> {
  const cidade = lead.cidade || "Salvador BA";
  const numero = lead.whatsapp || lead.contato || "";

  // Google
  let google: Analise["google"] = {
    fonte: "ficha", nota: lead.nota || null, avaliacoes: lead.avaliacoes || null,
    endereco: "", telefone: numero, categorias: [], horario: [], fotos: null, status: "",
    siteNoPerfil: lead.site || "", ultimaAvaliacao: "", avaliacoesRecentes: [],
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${q(`${lead.nome} ${cidade}`)}`,
  };
  if (PLACES_KEY) {
    try {
      const p = await googlePlaces(lead.nome, cidade);
      if (p) google = { ...google, ...p, fonte: "places", mapsUrl: p.mapsUrl || google.mapsUrl };
    } catch { /* segue com a ficha */ }
  }

  // Site
  const siteUrl = (google.siteNoPerfil || lead.site || "").trim();
  let site: Analise["site"] = null;
  let redes = { instagram: "", facebook: "", tiktok: "", linkedin: "", youtube: "", whatsapp: "" };
  let contatos = { emails: lead.email ? [lead.email] : [], telefones: [] as string[] };
  if (siteUrl) {
    const url = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
    try {
      const r = await buscarHtml(url);
      site = analisarHtml(r.html, r.final, r.status, r.ms);
      if (r.html) {
        const tudo = site.soJavascript ? r.html + (await scriptsDoSite(r.html, r.final)) : r.html;
        redes = extrairRedes(tudo);
        const c = extrairContatos(tudo);
        contatos = { emails: [...new Set([...contatos.emails, ...c.emails])], telefones: c.telefones };
      }
    } catch {
      site = { ...analisarHtml("", url, 0, 0), ok: false, status: null, ms: null };
    }
  }

  const waNum = redes.whatsapp ? soDigitos(redes.whatsapp.split(/phone=|wa\.me\//).pop() || "") : soDigitos(numero);
  const base = {
    id: lead.id, nome: lead.nome, geradoEm: new Date().toISOString(),
    google, site, redes, contatos,
    links: {
      maps: google.mapsUrl,
      buscaGoogle: `https://www.google.com/search?q=${q(`${lead.nome} ${cidade}`)}`,
      buscaInstagram: redes.instagram || `https://www.google.com/search?q=${q(`site:instagram.com "${lead.nome}"`)}`,
      whatsapp: waDe(waNum),
    },
  };
  const diag = diagnosticar(base);
  return { ...base, ...diag };
}

export async function salvarAnalise(a: Analise) {
  await salvarAnaliseLead(a.id, a.pontuacao, a, a.geradoEm);
}

export async function lerAnalise(id: string): Promise<Analise | null> {
  return lerAnaliseLead<Analise>(id);
}

// resumo em markdown para a ficha do lead (lido no Obsidian e pelos agentes)
export function resumoMd(a: Analise) {
  const data = a.geradoEm.slice(0, 10);
  const redes = Object.entries(a.redes).filter(([, v]) => v).map(([k, v]) => `[${k}](${v})`).join(" · ") || "nenhuma encontrada no site";
  const faltas = a.faltas.map((x) => `- **${x.prioridade.toUpperCase()}** · ${x.item} · ${x.porque}`).join("\n") || "- nada crítico";
  const fortes = a.fortes.map((x) => `- ${x}`).join("\n") || "-";
  return `## Análise de presença (${data})

**Presença digital:** ${a.pontuacao}/100 · Google: ${a.google.fonte === "places" ? "dados do Places" : "dados da ficha"} · [Maps](${a.links.maps})${a.links.whatsapp ? ` · [WhatsApp](${a.links.whatsapp})` : ""}
**Redes:** ${redes}

### O que falta
${faltas}

### Pontos fortes
${fortes}
`;
}
