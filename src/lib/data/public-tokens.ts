import "server-only";

import { createHash, createHmac } from "node:crypto";

const DEV_SECRET = "agencia-secret-dev-change-me";

function segredo(): string {
  const valor = process.env.AGENCIA_SECRET;
  if ((!valor || valor === DEV_SECRET) && process.env.NODE_ENV === "production") {
    throw new Error("AGENCIA_SECRET forte e obrigatorio para gerar links publicos");
  }
  return valor || DEV_SECRET;
}

export function tokenPublico(escopo: "briefing" | "relatorio", id: string, versao: number): string {
  return createHmac("sha256", segredo())
    .update(`${escopo}:${id}:${versao}`)
    .digest("base64url");
}

export function hashTokenPublico(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
