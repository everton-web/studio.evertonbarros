import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { pipelineOp } from "@/lib/data";

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  let body: Record<string, any>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "json inválido" }, { status: 400 });
  }
  if (!body.action) return NextResponse.json({ ok: false, error: "ação ausente" }, { status: 400 });
  if (body.action !== "add" && !body.id) {
    return NextResponse.json({ ok: false, error: "lead ausente" }, { status: 400 });
  }
  try {
    const out = await pipelineOp(body as any);
    return NextResponse.json({ ok: true, ...out });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "erro" }, { status: 500 });
  }
}