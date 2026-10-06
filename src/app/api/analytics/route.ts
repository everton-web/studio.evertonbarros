import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { atualizarCampanha, criarCampanha, listarCampanhas, removerCampanha, type CamposCampanha } from "@/lib/data";

export type { Campanha } from "@/lib/data";

const status = (v: unknown) => (v === "pausada" ? "pausada" : "ativa");

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  return NextResponse.json({ campanhas: await listarCampanhas() });
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ ok: false, error: "ação ausente" }, { status: 400 });

  if (body.action === "add") {
    const nome = String(body.nome || "").trim();
    if (!nome) return NextResponse.json({ ok: false, error: "nome ausente" }, { status: 400 });
    const campanha = await criarCampanha({
      nome,
      canal: String(body.canal || "meta"),
      investimento: Number(body.investimento) || 0,
      cliques: Number(body.cliques) || 0,
      conversoes: Number(body.conversoes) || 0,
      status: status(body.status),
    });
    return NextResponse.json({ ok: true, campanha }, { status: 201 });
  }
  if (body.action === "update" || body.action === "update-status") {
    const campos: CamposCampanha = {};
    if (body.action === "update-status") {
      campos.status = status(body.status);
    } else {
      if (body.nome !== undefined) campos.nome = String(body.nome).trim();
      if (body.canal !== undefined) campos.canal = String(body.canal);
      if (body.investimento !== undefined) campos.investimento = Number(body.investimento) || 0;
      if (body.cliques !== undefined) campos.cliques = Number(body.cliques) || 0;
      if (body.conversoes !== undefined) campos.conversoes = Number(body.conversoes) || 0;
      if (body.status !== undefined) campos.status = status(body.status);
    }
    const campanha = await atualizarCampanha(String(body.id || ""), campos);
    if (!campanha) return NextResponse.json({ ok: false, error: "campanha não encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true, campanha });
  }
  if (body.action === "delete") {
    await removerCampanha(String(body.id || ""));
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "ação desconhecida" }, { status: 400 });
}
