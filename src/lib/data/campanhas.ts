// Campanhas de tráfego (tabela campaigns).
import { agoraIso, dados, dataBr, supabase, texto, type Linha } from "./client";

export type Campanha = {
  id: string;
  nome: string;
  canal: string; // meta | google | tiktok | outro
  investimento: number;
  cliques: number;
  conversoes: number;
  status: string; // ativa | pausada
  criada: string;
};

export type CamposCampanha = Partial<Pick<Campanha, "nome" | "canal" | "investimento" | "cliques" | "conversoes" | "status">>;

function mapear(l: Linha): Campanha {
  return {
    id: String(l.id),
    nome: texto(l.name),
    canal: texto(l.channel),
    investimento: Number(l.investment) || 0,
    cliques: Number(l.clicks) || 0,
    conversoes: Number(l.conversions) || 0,
    status: texto(l.status),
    criada: dataBr(texto(l.created_at)),
  };
}

function colunas(c: CamposCampanha): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (c.nome !== undefined) out.name = c.nome;
  if (c.canal !== undefined) out.channel = c.canal;
  if (c.investimento !== undefined) out.investment = c.investimento;
  if (c.cliques !== undefined) out.clicks = Math.max(0, Math.round(c.cliques));
  if (c.conversoes !== undefined) out.conversions = Math.max(0, Math.round(c.conversoes));
  if (c.status !== undefined) out.status = c.status;
  return out;
}

export async function listarCampanhas(): Promise<Campanha[]> {
  const r = await supabase().from("campaigns").select("*").order("created_at", { ascending: false });
  return (dados<Linha[]>(r, "listar campanhas") ?? []).map(mapear);
}

export async function criarCampanha(c: Required<CamposCampanha>): Promise<Campanha> {
  const linha = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...colunas(c),
    created_at: agoraIso(),
  };
  return mapear(dados<Linha>(await supabase().from("campaigns").insert(linha).select().single(), "criar campanha"));
}

export async function atualizarCampanha(id: string, c: CamposCampanha): Promise<Campanha | null> {
  const r = await supabase().from("campaigns").update(colunas(c)).eq("id", id).select().maybeSingle();
  const l = dados<Linha | null>(r, "atualizar campanha");
  return l ? mapear(l) : null;
}

export async function removerCampanha(id: string): Promise<void> {
  dados(await supabase().from("campaigns").delete().eq("id", id), "remover campanha");
}
