import { NextResponse } from "next/server";
import { AUTH_USER, AUTH_PASS, createToken, safeEqual } from "@/lib/auth";

// Limite de tentativas por IP (em memória, instância única).
const MAX_TENTATIVAS = 8;
const JANELA_MS = 10 * 60 * 1000;
const tentativas = new Map<string, { n: number; reset: number }>();

function ipDe(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : req.headers.get("x-real-ip") || "local").trim();
}

export async function POST(req: Request) {
  const ip = ipDe(req);
  const agora = Date.now();
  const reg = tentativas.get(ip);
  if (reg && agora < reg.reset && reg.n >= MAX_TENTATIVAS) {
    return NextResponse.json(
      { ok: false, error: "Muitas tentativas. Tente novamente em alguns minutos." },
      { status: 429 },
    );
  }
  if (tentativas.size > 5000) tentativas.clear();

  let user = "";
  let pass = "";
  let lembrar = false;
  try { ({ user, pass, lembrar } = await req.json()); } catch {
    return NextResponse.json({ ok: false, error: "Requisição inválida" }, { status: 400 });
  }

  if (!safeEqual(String(user || ""), AUTH_USER) || !safeEqual(String(pass || ""), AUTH_PASS)) {
    if (!reg || agora >= reg.reset) tentativas.set(ip, { n: 1, reset: agora + JANELA_MS });
    else reg.n += 1;
    return NextResponse.json({ ok: false, error: "Usuário ou senha incorretos" }, { status: 401 });
  }

  tentativas.delete(ip);
  const https =
    req.headers.get("x-forwarded-proto") === "https" ||
    new URL(req.url).protocol === "https:";

  const res = NextResponse.json({ ok: true });
  // "Deixar conectado": 60 dias no aparelho; sem marcar, cookie de sessão (fecha o navegador, sai) com validade de 12h
  const DIAS_60 = 60 * 24 * 3600;
  res.cookies.set("agencia_token", createToken((lembrar ? DIAS_60 : 12 * 3600) * 1000), {
    httpOnly: true,
    secure: https,
    path: "/",
    sameSite: "lax",
    ...(lembrar ? { maxAge: DIAS_60 } : {}),
  });
  return res;
}
