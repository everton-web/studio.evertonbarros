import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { gravarAnaliseNaFicha, leadBase } from "@/lib/data";
import { analisarLead, salvarAnalise, lerAnalise, resumoMd } from "@/lib/analise";

// GET /api/analise?id=<lead> → última análise salva (ou null)
export async function GET(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") || "";
  return NextResponse.json({ ok: true, analise: await lerAnalise(id) });
}

// POST { id } → roda a análise agora, salva e devolve
export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  let body: { id?: string } = {};
  try { body = await req.json(); } catch { /* vazio */ }
  const lead = await leadBase(String(body.id || ""));
  if (!lead) return NextResponse.json({ ok: false, error: "lead não encontrado" }, { status: 404 });
  try {
    const analise = await analisarLead(lead);
    await salvarAnalise(analise);
    await gravarAnaliseNaFicha(lead.id, resumoMd(analise), analise.pontuacao, analise);
    return NextResponse.json({ ok: true, analise });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erro na análise" }, { status: 500 });
  }
}
