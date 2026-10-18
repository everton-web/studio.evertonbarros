// Validação dos canais de contato de um lead: WhatsApp e Instagram.
//
// WhatsApp: o que dá para checar sem API paga é o formato (celular brasileiro, com o 9)
// e se o próprio negócio publica esse número como WhatsApp no site. Saber se o número
// está registrado no WhatsApp exige uma API de WhatsApp (Evolution, Z-API, Cloud API).
// O wa.me não serve para isso: responde igual para qualquer número.
//
// Instagram: o perfil é checado por HTTP, mas o Instagram costuma mandar o servidor para a
// tela de login, então a checagem muitas vezes fica "não confirmado". Por isso a prova
// principal é o próprio site do negócio linkar o perfil.

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

export function soDigitos(v: string): string {
  return String(v || "").replace(/\D/g, "");
}

// Telefone brasileiro (fixo ou celular), normalizado com 55. Qualquer outra coisa vira "".
export function foneBR(v: string): string {
  let d = soDigitos(v);
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (!/^[1-9][1-9]/.test(d)) return "";
  if (d.length === 10 && /[6-9]/.test(d[2])) d = d.slice(0, 2) + "9" + d.slice(2);
  if (d.length === 10 && /[2-5]/.test(d[2])) return "55" + d;
  if (d.length === 11 && d[2] === "9") return "55" + d;
  return "";
}

// Celular: 55 + DDD + 9 + 8 dígitos. Fixo: 55 + DDD + 8 dígitos (WhatsApp não funciona em fixo).
export function ehCelular(numero: string): boolean {
  return numero.length === 13 && numero[4] === "9";
}

export type StatusWhatsapp =
  | "sem-numero"
  | "fixo"               // número fixo: não serve para WhatsApp
  | "celular-valido"     // celular no formato certo, vindo do Google Maps
  | "confirmado-no-site"; // o próprio site publica este número como WhatsApp

export function validarWhatsapp(telefoneMaps: string, linkWhatsappSite: string): { numero: string; status: StatusWhatsapp } {
  const doSite = foneBR(linkWhatsappSite.match(/(?:wa\.me\/|phone=)\+?(\d{10,15})/)?.[1] || "");
  if (doSite && ehCelular(doSite)) return { numero: doSite, status: "confirmado-no-site" };

  const doMaps = foneBR(telefoneMaps);
  if (!doMaps) return { numero: "", status: "sem-numero" };
  if (!ehCelular(doMaps)) return { numero: doMaps, status: "fixo" };
  return { numero: doMaps, status: "celular-valido" };
}

// ---------- Instagram ----------
const RESERVADOS = new Set(["p", "reel", "reels", "explore", "accounts", "tv", "stories", "direct", "sharer", "share", "intent", "plugins", "developer", "about", "legal"]);

export function handleDoInstagram(url: string): string {
  const h = url.match(/instagram\.com\/([A-Za-z0-9_.]{2,30})\/?/i)?.[1] || "";
  return RESERVADOS.has(h.toLowerCase()) ? "" : h;
}

export type StatusInstagram = "ativo" | "nao-existe" | "nao-confirmado";

export async function validarInstagram(url: string): Promise<{ handle: string; status: StatusInstagram }> {
  const handle = handleDoInstagram(url);
  if (!handle) return { handle: "", status: "nao-existe" };
  try {
    const r = await fetch(`https://www.instagram.com/${handle}/`, {
      headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9" },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (r.status === 404) return { handle, status: "nao-existe" };
    // Redirecionado para login: o Instagram não deixou ver, então não dá para afirmar nada.
    if (r.url.includes("/accounts/login")) return { handle, status: "nao-confirmado" };
    if (!r.ok) return { handle, status: "nao-confirmado" };
    const html = await r.text();
    if (/Sorry, this page isn't available|Esta p[aá]gina n[aã]o est[aá] dispon[ií]vel/i.test(html)) return { handle, status: "nao-existe" };
    const escapado = handle.replace(/\./g, "\\.");
    const confirma = new RegExp(`og:title[^>]*@${escapado}\\b|"username":"${escapado}"`, "i").test(html);
    return { handle, status: confirma ? "ativo" : "nao-confirmado" };
  } catch {
    return { handle, status: "nao-confirmado" };
  }
}
