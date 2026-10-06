import { NextResponse } from "next/server";
import { relatorioLeadPublicado } from "@/lib/data";

export const dynamic = "force-dynamic";

// Leitura pública do diagnóstico do lead, consumida pelo site em
// evertonbrito.com/relatorio/<slug>. Só devolve o que já foi publicado; o
// conteúdo é o JSON enxuto de src/lib/relatorio.ts, sem contato nem dado sensível.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const rel = await relatorioLeadPublicado(slug);
    if (!rel) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
    return NextResponse.json(rel, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return NextResponse.json({ error: "indisponível" }, { status: 503 });
  }
}
