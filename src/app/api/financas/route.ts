import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { criarLink, consultarStatus, lerHistorico, HANDLE, acharRegistro } from "@/lib/infinitepay";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  return NextResponse.json({ handle: HANDLE || null, historico: await lerHistorico() });
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  let body: Record<string, any>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "json inválido" }, { status: 400 });
  }

  if (body.action === "link") {
    if (!HANDLE) return NextResponse.json({ ok: false, error: "handle não configurado: INFINITEPAY_HANDLE no .env.local" }, { status: 400 });
    const descricao = String(body.descricao || "").trim();
    const valor = Number(String(body.valor || "").replace(",", "."));
    if (!descricao) return NextResponse.json({ ok: false, error: "descrição ausente" }, { status: 400 });
    if (!Number.isFinite(valor) || valor <= 0) return NextResponse.json({ ok: false, error: "valor inválido" }, { status: 400 });

    const r = await criarLink({
      cliente: body.cliente ? String(body.cliente).replace(/[^a-z0-9-]/gi, "").slice(0, 80) : undefined,
      vencimento: body.vencimento ? String(body.vencimento) : undefined,
      tipo: body.tipo === "recorrencia" ? "recorrencia" : undefined,
      descricao,
      valor,
      quantidade: Number(body.quantidade) || 1,
      order_nsu: String(body.order_nsu || "").trim() || undefined,
      customer: body.customer
        ? { nome: String(body.customer.nome || ""), email: String(body.customer.email || ""), telefone: String(body.customer.telefone || "") }
        : undefined,
    });
    return NextResponse.json({ ok: r.ok, registro: r, erro: r.erro }, { status: r.ok ? 201 : 502 });
  }

  if (body.action === "status") {
    const achado = body.order_nsu ? await acharRegistro(String(body.order_nsu)) : null;
    if (!achado) return NextResponse.json({ ok: false, error: "link não encontrado" }, { status: 404 });
    const st = await consultarStatus(achado.r);
    return NextResponse.json({ ok: !!st?.success, status: st });
  }

  return NextResponse.json({ ok: false, error: "ação desconhecida" }, { status: 400 });
}