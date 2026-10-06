// Camada de dados da plataforma: único ponto que fala com o Supabase.
// Usa a service role, que contorna RLS, então este código só pode rodar no
// servidor. As variáveis nunca levam o prefixo NEXT_PUBLIC_.
import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

if (typeof window !== "undefined") {
  throw new Error("src/lib/data só pode ser importado no servidor");
}

let cliente: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias no servidor");
  cliente = createClient(url, chave, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "asymmetrics-plataforma" } },
  });
  return cliente;
}

export function bucketArquivos(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || "plataforma-arquivos";
}

export type Linha = Record<string, unknown>;

type Resposta<T> = { data: T | null; error: { message: string } | null };

// Converte a resposta do supabase-js em valor ou exceção.
export function dados<T>(r: Resposta<T>, contexto: string): T {
  if (r.error) throw new Error(`${contexto}: ${r.error.message}`);
  return r.data as T;
}

export function agoraIso(): string {
  return new Date().toISOString();
}

export function texto(v: unknown): string {
  return v == null ? "" : String(v);
}

export function textoOuNull(v: unknown): string | null {
  return v == null ? null : String(v);
}

export function numeroOuNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function objeto(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

// A operação roda no fuso de Salvador (UTC-3, sem horário de verão).
export const FUSO = "-03:00";

// "2026-10-06T14:00" (hora local) para timestamptz.
export function localParaIso(local: string): string {
  const base = local.length === 16 ? `${local}:00` : local;
  return /[zZ]|[+-]\d{2}:\d{2}$/.test(base) ? base : `${base}${FUSO}`;
}

// timestamptz para "2026-10-06T14:00" na hora local.
export function isoParaLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  return new Date(t - 3 * 3600000).toISOString().slice(0, 16);
}

// Data e hora no formato que o app já mostrava (toLocaleString pt-BR).
export function dataHoraBr(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleString("pt-BR", { timeZone: "America/Bahia" }) : "";
}

export function dataBr(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("pt-BR", { timeZone: "America/Bahia" }) : "";
}

export function slug(s: string, padrao = "lead"): string {
  return (
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") ||
    padrao
  );
}
