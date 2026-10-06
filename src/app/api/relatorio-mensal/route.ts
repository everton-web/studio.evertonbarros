import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import {
  gerarRelatorioMensal,
  gerarRelatoriosAtivos,
  listarParaHoje,
  marcarEnviado,
  mesAtual,
  revogarToken,
  rotacionarToken,
  validarMes,
} from "@/lib/data";

// Lista do Hoje: clientes ativos, situação do relatório do mês e botão de WhatsApp.
export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  return NextResponse.json(await listarParaHoje());
}

// Porta única de geração (agendador e disparo manual). Nada é enviado ao cliente
// e nada vai para o git: o link é servido pela própria plataforma.
export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  let body: { action?: string; empresaId?: string; mes?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* corpo vazio = gerar todos */
  }
  const mes = body.mes ? String(body.mes) : mesAtual();
  if (!validarMes(mes)) return NextResponse.json({ ok: false, error: "mês inválido" }, { status: 400 });
  const empresaId = String(body.empresaId || "");
  const acao = body.action || "gerar";

  try {
    if (acao === "gerar") {
      if (empresaId) {
        const r = await gerarRelatorioMensal(empresaId, mes);
        return NextResponse.json({ ok: true, mes, geradas: [r], falhas: [] });
      }
      return NextResponse.json({ ok: true, ...(await gerarRelatoriosAtivos(mes)) });
    }
    if (acao === "rotacionar" || acao === "revogar" || acao === "enviado") {
      if (!empresaId) return NextResponse.json({ ok: false, error: "cliente ausente" }, { status: 400 });
      const feito =
        acao === "rotacionar" ? await rotacionarToken(empresaId, mes) : acao === "revogar" ? await revogarToken(empresaId, mes) : await marcarEnviado(empresaId, mes);
      return NextResponse.json({ ok: feito }, { status: feito ? 200 : 404 });
    }
    return NextResponse.json({ ok: false, error: "ação desconhecida" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erro" }, { status: 400 });
  }
}
