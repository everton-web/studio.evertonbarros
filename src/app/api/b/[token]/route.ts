import { NextResponse } from "next/server";
import { responderBriefing } from "@/lib/data";

// Resposta pública do briefing: sem login, protegida pelo token único do link.
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "json inválido" }, { status: 400 });
  }
  if (b.website) return NextResponse.json({ ok: true }); // isca anti-robô: finge sucesso
  try {
    const r = await responderBriefing(token, (b.respostas as Record<string, unknown>) || {});
    if (r === "ok") return NextResponse.json({ ok: true });
    if (r === "inexistente") return NextResponse.json({ ok: false, error: "link inválido" }, { status: 404 });
    if (r === "ja-respondido") return NextResponse.json({ ok: false, error: "este briefing já foi respondido" }, { status: 409 });
    return NextResponse.json({ ok: false, error: "preencha ao menos uma resposta" }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "não foi possível salvar agora" }, { status: 500 });
  }
}
