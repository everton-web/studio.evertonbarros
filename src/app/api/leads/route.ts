import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/auth";
import { pipelineOp } from "@/lib/data";

// Token compartilhado para sites externos enviarem leads (env LEADS_TOKEN).
// Não depende de cookie — qualquer formulário do ecossistema pode apontar pra cá.
const TOKEN = process.env.LEADS_TOKEN || "";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: cors(),
  });
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function POST(req: Request) {
  let body: Record<string, any>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "json inválido" }, { status: 400, headers: cors() });
  }
  if (!TOKEN || !safeEqual(String(body.token || ""), TOKEN)) {
    return NextResponse.json({ ok: false, error: "token inválido" }, { status: 401, headers: cors() });
  }
  const nome = String(body.nome || "").trim();
  const contacto = String(body.contato || body.whatsapp || body.contact || "").trim();
  if (!nome) {
    return NextResponse.json({ ok: false, error: "nome ausente" }, { status: 400, headers: cors() });
  }
  const origem = String(body.origem || "site").trim();
  const category = origins[origem] || "site";
  const porque = [
    String(body.mensagem || body.message || "").trim(),
    `Formulário de ${origem}${body.project ? ` · projeto: ${String(body.project).trim()}` : ""}`,
  ].filter(Boolean).join(" · ") || `Lead do formulário de ${origem} (categoria ${category})`;

  try {
    const out = await pipelineOp({
      action: "add",
      nome,
      segmento: String(body.segmento || body.project || "").trim() || "cliente em potencial",
      cidade: String(body.cidade || "").trim(),
      nota: String(body.nota || "").trim(),
      site: String(body.site || "").trim(),
      contato: contacto,
      whatsapp: String(body.whatsapp || contacto).trim(),
      email: String(body.email || "").trim(),
      categoria: category,
      porque,
    });
    return NextResponse.json({ ok: true, ...out }, { status: 201, headers: cors() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "erro" }, { status: 500, headers: cors() });
  }
}

// categorias por origem (o lead cai no pipeline já categorizado)
const origins: Record<string, string> = {
  "evertonbrito.com": "site",
  "site": "site",
  "indicacao": "indicacao",
  "saas": "saas",
  "maps": "maps",
  "whatsapp": "whatsapp",
};
