import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { kanbanOp } from "@/lib/data";

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const body = await req.json();
  if (!body.action) return NextResponse.json({ ok: false, error: "ação ausente" }, { status: 400 });
  try {
    await kanbanOp(body);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erro no kanban" }, { status: 400 });
  }
}
