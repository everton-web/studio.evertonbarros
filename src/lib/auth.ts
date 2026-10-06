import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const DEV_SECRET = "agencia-secret-dev-change-me";
const RAW_SECRET = process.env.AGENCIA_SECRET;
const IS_PROD = process.env.NODE_ENV === "production";

if (!RAW_SECRET || RAW_SECRET === DEV_SECRET) {
  if (IS_PROD) {
    throw new Error(
      "[auth] AGENCIA_SECRET ausente ou usando o valor de desenvolvimento. Defina um segredo forte em produção.",
    );
  }
  console.warn("[auth] AVISO: segredo de desenvolvimento em uso. Defina AGENCIA_SECRET.");
}
const SECRET = RAW_SECRET || DEV_SECRET;

const RAW_PASS = process.env.AGENCIA_PASS;
if (!RAW_PASS && IS_PROD) {
  throw new Error("[auth] AGENCIA_PASS ausente. Defina AGENCIA_USER e AGENCIA_PASS no .env.local.");
}

export const AUTH_USER = process.env.AGENCIA_USER || "everton";
export const AUTH_PASS = RAW_PASS || "dev";

// comparação em tempo constante (evita timing attacks em usuário/senha)
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function sign(v: string) {
  return createHmac("sha256", SECRET).update(v).digest("hex");
}

export function createToken(ms: number = 7 * 24 * 3600 * 1000): string {
  const exp = Date.now() + ms; // validade do login (padrão 7 dias)
  const payload = `${AUTH_USER}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string): boolean {
  const [user, exp, sig] = token.split(".");
  if (!user || !exp || !sig || user !== AUTH_USER) return false;
  const expected = sign(`${user}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b) && Date.now() < Number(exp);
  } catch {
    return false;
  }
}

export async function isAuthed(): Promise<boolean> {
  const c = await cookies();
  const t = c.get("agencia_token")?.value;
  return t ? verifyToken(t) : false;
}
