// Briefing por link (tabela briefings). O banco guarda somente o hash. O token
// pode ser reconstituido no servidor a partir do id e da versao do link.
import { randomUUID } from "node:crypto";
import { LIMITE_RESPOSTA, PERGUNTAS } from "../briefing-perguntas";
import { agoraIso, dados, objeto, supabase, textoOuNull, type Linha } from "./client";
import { hashTokenPublico, tokenPublico } from "./public-tokens";

export type BriefingInfo = {
  id: string;
  token: string;
  versaoToken: number;
  status: "aguardando" | "respondido";
  criadoEm: string | null;
  respondidoEm: string | null;
  respostas: { pergunta: string; resposta: string }[];
};

function mapear(l: Linha): BriefingInfo {
  const obj = objeto(l.answers);
  const versao = Number(l.token_version) || 1;
  const token = tokenPublico("briefing", String(l.id), versao);
  return {
    id: String(l.id),
    token: String(l.token_hash) === hashTokenPublico(token) ? token : "",
    versaoToken: versao,
    status: l.submitted_at ? "respondido" : "aguardando",
    criadoEm: textoOuNull(l.created_at),
    respondidoEm: textoOuNull(l.submitted_at),
    respostas: PERGUNTAS.filter((p) => obj[p.id]).map((p) => ({ pergunta: p.rotulo, resposta: String(obj[p.id]) })),
  };
}

export async function briefingDaEmpresa(empresaId: string): Promise<BriefingInfo | null> {
  const r = await supabase()
    .from("briefings")
    .select("*")
    .eq("company_id", empresaId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const l = dados<Linha | null>(r, "ler briefing");
  return l ? mapear(l) : null;
}

// Cria o link único. Se já existe um briefing aguardando resposta, reaproveita.
export async function criarBriefing(empresaId: string): Promise<BriefingInfo> {
  const atual = await briefingDaEmpresa(empresaId);
  if (atual && atual.status === "aguardando") {
    if (atual.token) return atual;
    const versao = atual.versaoToken + 1;
    const token = tokenPublico("briefing", atual.id, versao);
    const r = await supabase()
      .from("briefings")
      .update({ token_hash: hashTokenPublico(token), token_version: versao })
      .eq("id", atual.id)
      .select()
      .single();
    return mapear(dados<Linha>(r, "rotacionar briefing legado"));
  }
  const id = randomUUID();
  const token = tokenPublico("briefing", id, 1);
  const r = await supabase()
    .from("briefings")
    .insert({ id, company_id: empresaId, token_hash: hashTokenPublico(token), token_version: 1, page_type: "site", created_at: agoraIso() })
    .select()
    .single();
  return mapear(dados<Linha>(r, "criar briefing"));
}

async function linhaPorToken(token: string): Promise<Linha | null> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const r = await supabase().from("briefings").select("id, company_id, submitted_at").eq("token_hash", hashTokenPublico(token)).maybeSingle();
  return dados<Linha | null>(r, "ler briefing por token");
}

// Dados que a página pública mostra: nome da empresa e se já foi respondido.
export async function briefingPorToken(token: string): Promise<{ empresa: string; respondido: boolean } | null> {
  const l = await linhaPorToken(token);
  if (!l) return null;
  let empresa = "";
  if (l.company_id) {
    const e = await supabase().from("companies").select("name").eq("id", String(l.company_id)).maybeSingle();
    empresa = String(dados<Linha | null>(e, "ler empresa do briefing")?.name ?? "");
  }
  return { empresa, respondido: Boolean(l.submitted_at) };
}

// Grava a resposta. Só aceita as perguntas conhecidas e limita o tamanho.
export async function responderBriefing(
  token: string,
  respostas: Record<string, unknown>,
): Promise<"ok" | "inexistente" | "ja-respondido" | "vazio"> {
  const l = await linhaPorToken(token);
  if (!l) return "inexistente";
  if (l.submitted_at) return "ja-respondido";
  const limpo: Record<string, string> = {};
  for (const p of PERGUNTAS) {
    const v = respostas[p.id];
    if (typeof v === "string" && v.trim()) limpo[p.id] = v.trim().slice(0, LIMITE_RESPOSTA);
  }
  if (Object.keys(limpo).length === 0) return "vazio";
  const r = await supabase()
    .from("briefings")
    .update({ answers: limpo, submitted_at: agoraIso() })
    .eq("id", String(l.id))
    .is("submitted_at", null)
    .select("id");
  return (dados<Linha[]>(r, "responder briefing") ?? []).length > 0 ? "ok" : "ja-respondido";
}
