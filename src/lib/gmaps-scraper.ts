// Cliente da API do gosom/google-maps-scraper (kit vzbaggio/google-maps-scraper-kit).
// O scraper precisa de Docker, então roda num servidor à parte (VPS). Esta plataforma só
// fala com ele pelo servidor: GMAPS_SCRAPER_URL aponta para a API atrás de um proxy com
// autenticação. A API do kit não tem login próprio; nunca a exponha direto na internet.

const BASE = (process.env.GMAPS_SCRAPER_URL || "").replace(/\/+$/, "");
const TOKEN = process.env.GMAPS_SCRAPER_TOKEN || "";

export type Lugar = {
  nome: string; site: string; telefone: string; categoria: string; endereco: string;
  nota: number | null; avaliacoes: number | null; emails: string[]; link: string; placeId: string;
};

export function scraperConfigurado(): boolean {
  return !!BASE;
}

async function chamar(caminho: string, init: RequestInit = {}, timeoutMs = 20000): Promise<Response> {
  if (!BASE) throw new Error("GMAPS_SCRAPER_URL não configurada");
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  return fetch(`${BASE}${caminho}`, { ...init, headers, signal: AbortSignal.timeout(timeoutMs) });
}

// Latitude e longitude da cidade (o scraper exige coordenadas).
export async function geocodificar(cidade: string): Promise<{ lat: string; lon: string }> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(cidade)}`;
  const r = await fetch(url, {
    headers: { "User-Agent": "agencia-app/1.0", "Accept-Language": "pt-BR" },
    signal: AbortSignal.timeout(10000),
  });
  const j = (await r.json().catch(() => [])) as { lat: string; lon: string }[];
  if (!j[0]) throw new Error(`cidade não encontrada: ${cidade}`);
  return { lat: j[0].lat, lon: j[0].lon };
}

// Cria o job, espera terminar e devolve os lugares do Google Maps já sem duplicatas.
export async function buscarNoMaps(op: { termo: string; cidade: string; depth: number; tempoMax: number }): Promise<Lugar[]> {
  const { lat, lon } = await geocodificar(op.cidade);
  const criado = await chamar("/api/v1/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `prospeccao-${Date.now()}`,
      keywords: [`${op.termo} em ${op.cidade}`],
      lang: "pt",
      zoom: 14,
      lat,
      lon,
      radius: 10000,
      depth: op.depth,
      email: true,
      fast_mode: false,
      max_time: op.tempoMax,
    }),
  });
  if (!criado.ok) throw new Error(`scraper recusou o job (HTTP ${criado.status})`);
  const { id } = (await criado.json()) as { id: string };

  try {
    const limite = Date.now() + (op.tempoMax + 60) * 1000;
    for (;;) {
      await new Promise((r) => setTimeout(r, 5000));
      const s = await chamar(`/api/v1/jobs/${id}`);
      const { Status } = (await s.json().catch(() => ({}))) as { Status?: string };
      if (Status === "ok") break;
      if (Status === "failed") throw new Error("o scraper falhou (pode ser bloqueio temporário do IP pelo Google)");
      if (Date.now() > limite) throw new Error("tempo esgotado esperando o scraper");
    }
    const csv = await (await chamar(`/api/v1/jobs/${id}/download`, {}, 60000)).text();
    return lerLugares(csv);
  } finally {
    // libera o disco do servidor do scraper; falha aqui não importa
    chamar(`/api/v1/jobs/${id}`, { method: "DELETE" }).catch(() => {});
  }
}

// ---------- CSV ----------
// Lê CSV com aspas e quebras de linha dentro de campos. Sem dependências.
export function lerCsv(texto: string): Record<string, string>[] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ",") { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo); campo = "";
      linhas.push(linha); linha = [];
    } else campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  const [cabecalho, ...corpo] = linhas.filter((l) => l.some((x) => x !== ""));
  if (!cabecalho) return [];
  const colunas = cabecalho.map((h) => h.trim());
  return corpo.map((l) => Object.fromEntries(colunas.map((h, i) => [h, l[i] ?? ""])));
}

function numero(v: string | undefined): number | null {
  const n = Number(String(v || "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function lerLugares(csv: string): Lugar[] {
  const vistos = new Set<string>();
  const lugares: Lugar[] = [];
  for (const r of lerCsv(csv)) {
    const nome = (r.title || "").trim();
    if (!nome) continue;
    const chave = r.place_id || r.cid || nome.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const av = numero(r.review_count);
    lugares.push({
      nome,
      site: (r.website || "").trim(),
      telefone: (r.phone || "").trim(),
      categoria: (r.category || "").trim(),
      endereco: (r.address || "").trim(),
      nota: numero(r.review_rating),
      avaliacoes: av ? Math.round(av) : null,
      emails: (r.emails || "")
        .replace(/[\[\]"']/g, "")
        .split(/[\s,;|]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(e)),
      link: (r.link || "").trim(),
      placeId: (r.place_id || "").trim(),
    });
  }
  return lugares;
}
