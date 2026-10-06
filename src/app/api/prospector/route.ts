import { NextResponse } from "next/server";
import { isAuthed, safeEqual } from "@/lib/auth";
import { prospectar, statusProspector } from "@/lib/prospeccao";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Agendamento (cron do hPanel) entra com ?token=PROSPECTOR_TOKEN; o painel entra logado.
const TOKEN = process.env.PROSPECTOR_TOKEN || "";
function tokenOk(req: Request): boolean {
  const t = new URL(req.url).searchParams.get("token") || "";
  return !!TOKEN && !!t && safeEqual(t, TOKEN);
}

export async function GET(req: Request) {
  if (!(await isAuthed()) && !tokenOk(req)) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const u = new URL(req.url);
  // GET com run=1 é o gatilho do cron (curl simples); sem run, só o status.
  if (u.searchParams.get("run") === "1") {
    const resumo = await prospectar({
      nicho: u.searchParams.get("nicho") || undefined,
      cidade: u.searchParams.get("cidade") || undefined,
      limite: Number(u.searchParams.get("limite")) || undefined,
    });
    return NextResponse.json({ ok: true, resumo });
  }
  return NextResponse.json(statusProspector());
}

export async function POST(req: Request) {
  if (!(await isAuthed()) && !tokenOk(req)) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  let body: { nicho?: string; cidade?: string; limite?: number; frentes?: string[] } = {};
  try { body = await req.json(); } catch { /* usa padrões */ }
  try {
    const resumo = await prospectar(body);
    return NextResponse.json({ ok: true, resumo });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erro" }, { status: 500 });
  }
}
