import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { exportarRelatorio } from "@/lib/relatorio";
import { publicarRelatorio } from "@/lib/publicar-relatorio";

// POST { id, slug? } → grava o JSON público em reports e marca como publicado.
// O site lê em GET /api/relatorio/publico/<slug>. Sem git e sem disco.
export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  let body: { id?: string; slug?: string } = {};
  try { body = await req.json(); } catch { /* vazio */ }
  try {
    const r = await exportarRelatorio(String(body.id || ""), body.slug);
    await publicarRelatorio(r.slug);
    return NextResponse.json({ ok: true, slug: r.slug, url: r.url, publicado: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "erro ao exportar relatório" }, { status: 400 });
  }
}

// GET ?slug=<slug> → checa server-side se a página já está no ar.
// O site não manda CORS, então o navegador não consegue checar direto.
export async function GET(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const slug = new URL(req.url).searchParams.get("slug") || "";
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ ok: false, status: null });
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch("https://evertonbrito.com/relatorio/" + slug, { signal: ctrl.signal });
    clearTimeout(timer);
    return NextResponse.json({ ok: r.ok, status: r.status });
  } catch {
    clearTimeout(timer);
    return NextResponse.json({ ok: false, status: null });
  }
}
