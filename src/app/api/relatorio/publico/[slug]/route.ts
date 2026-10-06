import { NextResponse } from "next/server";
import { relatorioLeadPublicado } from "@/lib/data";

export const dynamic = "force-dynamic";

const ALLOWED_ORIGINS = new Set([
  "https://evertonbrito.com",
  "https://www.evertonbrito.com",
]);

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  return {
    ...(origin && ALLOWED_ORIGINS.has(origin)
      ? { "Access-Control-Allow-Origin": origin }
      : {}),
    Vary: "Origin",
  };
}

// Leitura pública do diagnóstico do lead, consumida pelo site em
// evertonbrito.com/relatorio/<slug>. Só devolve o que já foi publicado; o
// conteúdo é o JSON enxuto de src/lib/relatorio.ts, sem contato nem dado sensível.
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const rel = await relatorioLeadPublicado(slug);
    if (!rel) {
      return NextResponse.json(
        { error: "não encontrado" },
        { status: 404, headers: corsHeaders(request) },
      );
    }
    return NextResponse.json(rel, {
      headers: {
        ...corsHeaders(request),
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "indisponível" },
      { status: 503, headers: corsHeaders(request) },
    );
  }
}

export function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders(request),
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Accept, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
