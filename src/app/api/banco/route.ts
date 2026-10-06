import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { contagensEmpresas, listarEmpresas } from "@/lib/data";

// Leitura autenticada das empresas. Somente leitura, nunca expõe credenciais nem senha.
export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const [empresas, contagens] = await Promise.all([listarEmpresas(), contagensEmpresas()]);
  return NextResponse.json({ ok: true, empresas, contagens });
}
