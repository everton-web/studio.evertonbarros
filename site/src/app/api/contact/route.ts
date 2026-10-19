import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const WEBAPP_URL = process.env.GOOGLE_SHEETS_WEBAPP_URL;
// webhook para a agência (SaaS): o lead cai direto no pipeline com categoria "site"
const AGENCIA_LEADS_URL = process.env.AGENCIA_LEADS_URL;
const AGENCIA_LEADS_TOKEN = process.env.AGENCIA_LEADS_TOKEN;

type Payload = {
  name?: unknown;
  contact?: unknown;
  project?: unknown;
  email?: unknown;
  lang?: unknown;
};

const str = (v: unknown, max = 500) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

export async function POST(request: NextRequest) {
  if (!WEBAPP_URL) {
    return Response.json(
      { ok: false, error: "not_configured" },
      { status: 503 },
    );
  }

  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const name = str(body.name, 120);
  const contact = str(body.contact, 160);
  const project = str(body.project, 200);

  if (!name || !contact) {
    return Response.json(
      { ok: false, error: "missing_fields" },
      { status: 400 },
    );
  }

  const payload = {
    name,
    contact,
    project,
    lang: body.lang === "en" ? "en" : "pt",
    source: "evertonbrito.com",
    userAgent: request.headers.get("user-agent") ?? "",
  };

  try {
    const res = await fetch(WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return Response.json(
        { ok: false, error: "upstream_error" },
        { status: 502 },
      );
    }

    // O Apps Script devolve HTML (ex.: erro de permissão) com HTTP 200.
    // Só consideramos sucesso quando o corpo é JSON com `ok: true`.
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return Response.json(
        { ok: false, error: "invalid_response" },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { ok?: boolean };

    if (data.ok !== true) {
      return Response.json({ ok: false, error: "sheet_error" }, { status: 502 });
    }

    // +++ lead no SaaS (não bloqueia o form se a agência estiver fora) +++
    if (AGENCIA_LEADS_URL && AGENCIA_LEADS_TOKEN) {
      try {
        await fetch(`${AGENCIA_LEADS_URL}/api/leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: AGENCIA_LEADS_TOKEN,
            origem: "evertonbrito.com",
            nome: name,
            contato: contact,
            whatsapp: contact,
            email: str(body.email),
            project,
            mensagem: `Lead do formulário de contato do portfólio (${body.lang === "en" ? "en" : "pt"})`,
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        }).catch(() => {});
      } catch { /* não derruba o envio do form */ }
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "network_error" }, { status: 502 });
  }
}
