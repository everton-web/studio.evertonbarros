import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { deleteFile, lerArquivo } from "@/lib/data";

export const dynamic = "force-dynamic";

const INLINE = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf", "text/plain", "text/csv"]);

// GET → baixar/abrir um arquivo. Proxy autenticado: o bucket é privado e o
// navegador nunca recebe credencial nem URL do Storage.
export async function GET(_req: Request, { params }: { params: Promise<{ name: string[] }> }) {
  if (!(await isAuthed())) return new Response("unauthorized", { status: 401 });
  const name = (await params).name[0];
  try {
    const arq = await lerArquivo(name);
    if (!arq) return new Response("not found", { status: 404 });
    // Só abre no navegador o que não executa script; o resto vira download.
    const inline = INLINE.has(arq.tipo);
    return new Response(arq.bytes, {
      headers: {
        "Content-Type": arq.tipo,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}

// DELETE → remover
export async function DELETE(_req: Request, { params }: { params: Promise<{ name: string[] }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const name = (await params).name[0];
  try {
    const ok = await deleteFile(name);
    if (!ok) return NextResponse.json({ ok: false, error: "não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "não encontrado" }, { status: 404 });
  }
}
