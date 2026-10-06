import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { inboxAdd } from "@/lib/data";

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const { text } = await req.json();
  if (!text || !text.trim()) return NextResponse.json({ ok: false, error: "texto vazio" }, { status: 400 });
  await inboxAdd(text.trim());
  return NextResponse.json({ ok: true });
}
