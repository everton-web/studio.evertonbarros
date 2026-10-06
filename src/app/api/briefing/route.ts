import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { lerDocumento } from "@/lib/data";

// Abre o material de uma demanda (briefing, posts para aprovar) direto do app.
// Os .md de docs/ do projeto são importados para workspace_documents com a
// chave "docs/<caminho>"; só sai documento dessa área, e só com sessão.
export async function GET(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ ok: false }, { status: 401 });
  const caminho = (new URL(req.url).searchParams.get("path") || "").replace(/\\/g, "/").replace(/^\.\//, "");
  if (!caminho.endsWith(".md") || !caminho.startsWith("docs/") || caminho.split("/").includes("..")) {
    return NextResponse.json({ ok: false, error: "caminho não permitido" }, { status: 400 });
  }
  const doc = await lerDocumento(caminho);
  if (!doc) return NextResponse.json({ ok: false, error: "arquivo não encontrado" }, { status: 404 });
  return new NextResponse(doc.content_markdown, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
