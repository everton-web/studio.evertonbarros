import { NextResponse } from "next/server";
import { registrarHit } from "@/lib/data";

// Pixel 1x1 transparente: rastreia a instalação do trecho nos sites do ecossistema.
// Cada hit incrementa o contador do site em tracking_sites (incremento atômico no banco).
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

// Throttle anti-abuso: 1 contagem por IP+site a cada 5s (recarregar não infla).
// Fica em memória do processo; rate limit compartilhado é uma etapa própria.
const JANELA_MS = 5000;
const vistos = new Map<string, number>();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const site = (url.searchParams.get("site") || "desconhecido").slice(0, 80).replace(/[^a-z0-9._-]/gi, "");
  if (site) {
    const fwd = req.headers.get("x-forwarded-for");
    const ip = (fwd ? fwd.split(",")[0] : req.headers.get("x-real-ip") || "local").trim();
    const chave = `${ip}|${site}`;
    const agora = Date.now();
    if (vistos.size > 5000) vistos.clear();
    if ((vistos.get(chave) || 0) + JANELA_MS <= agora) {
      vistos.set(chave, agora);
      try {
        await registrarHit(site);
      } catch {
        /* banco indisponível: o pixel nunca quebra o site do cliente */
      }
    }
  }
  return new NextResponse(GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, max-age=0",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
