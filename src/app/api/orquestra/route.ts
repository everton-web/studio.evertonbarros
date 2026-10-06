import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import {
  listarDemandas,
  criarDemanda,
  atualizarStatus,
  atualizarPersona,
  lerDemanda,
  mensagensSala,
  postarSala,
  estadoAgentes,
} from "@/lib/data";
import type { DemandaStatus } from "@/lib/data";

const STATUS_MAP: Record<string, DemandaStatus> = {
  // legados (fila.json)
  pendente: "fila",
  rodando: "em_andamento",
  ok: "concluida",
  erro: "bloqueada",
  // atuais
  fila: "fila",
  em_andamento: "em_andamento",
  aguardando_everton: "aguardando_everton",
  bloqueada: "bloqueada",
  aguardando_cliente: "aguardando_cliente",
  concluida: "concluida",
  cancelada: "cancelada",
};

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  return NextResponse.json({
    fila: await listarDemandas(),
    sala: await mensagensSala(),
    agentes: await estadoAgentes(),
  });
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ ok: false, error: "ação ausente" }, { status: 400 });

  if (body.action === "nova") {
    const texto = String(body.texto || "").trim();
    if (!texto) return NextResponse.json({ ok: false, error: "texto vazio" }, { status: 400 });
    const demanda = await criarDemanda({
      titulo: texto,
      persona: body.atribuido || "orion",
      origem: "kanban",
      prazo: body.prazo,
    });
    return NextResponse.json({ ok: true, demanda }, { status: 201 });
  }

  if (body.action === "atribuir") {
    const id = String(body.id || "");
    const atual = await lerDemanda(id);
    if (!atual) return NextResponse.json({ ok: false, error: "demanda não encontrada" }, { status: 404 });

    let demanda = atual;
    if (body.agente) {
      // REGRA DURA: só reatribui persona se a demanda não estiver em_andamento.
      const r = await atualizarPersona(id, String(body.agente));
      if (r) demanda = r;
    }
    if (body.status) {
      const alvo = STATUS_MAP[String(body.status)];
      if (alvo) {
        const r = await atualizarStatus(id, alvo, { quem: "app" });
        if (r) demanda = r;
      }
    }
    return NextResponse.json({ ok: true, demanda });
  }

  if (body.action === "remover") {
    const d = await atualizarStatus(String(body.id), "cancelada", { quem: "app", nota: "cancelada pelo app" });
    if (!d) return NextResponse.json({ ok: false, error: "demanda não encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "sala") {
    const m = await postarSala({ de: String(body.de || "everton"), texto: String(body.texto || "").trim(), para: body.para });
    return NextResponse.json({ ok: true, mensagem: m });
  }

  if (body.action === "aprovar") {
    const d = await atualizarStatus(String(body.id), "concluida", { quem: "everton", nota: "aprovada" });
    if (!d) return NextResponse.json({ ok: false, error: "demanda não encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "devolver") {
    const d = await atualizarStatus(String(body.id), "em_andamento", { quem: "everton", nota: "devolvida" });
    if (!d) return NextResponse.json({ ok: false, error: "demanda não encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "status") {
    const id = String(body.id || "");
    const alvo = STATUS_MAP[String(body.status)];
    if (!id || !alvo) return NextResponse.json({ ok: false, error: "id ou status inválido" }, { status: 400 });
    const d = await atualizarStatus(id, alvo, { quem: "app" });
    if (!d) return NextResponse.json({ ok: false, error: "demanda não encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  // no-ops de compat (não tocam mais em fila.json)
  if (body.action === "health") {
    return NextResponse.json({ ok: true, motores: {} });
  }
  if (body.action === "limpar") {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "ação desconhecida" }, { status: 400 });
}
