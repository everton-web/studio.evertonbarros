import { NextResponse } from "next/server";
import { processarWebhook } from "@/lib/infinitepay";

// Webhook público da InfinitePay (pagamento aprovado).
// Responder rápido (200) — docs: 200 = ok, 400 = manda de novo.
export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "json inválido" }, { status: 400 });
  }
  try {
    const { novidade, registro } = await processarWebhook(body);
    return NextResponse.json({ ok: true, novidade, erro: registro?.erro });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "erro" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, mensagem: "webhook infinitepay: envie POST com o payload da InfinitePay" });
}