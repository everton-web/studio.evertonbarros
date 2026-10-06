// Análises de presença dos leads (tabela lead_analyses). Vale a mais recente.
import { dados, supabase, type Linha } from "./client";

export async function salvarAnaliseLead(id: string, pontuacao: number, analise: object, geradoEm: string): Promise<void> {
  const score = Math.max(0, Math.min(100, Math.round(pontuacao)));
  dados(
    await supabase().from("lead_analyses").insert({ company_id: id, score, analysis: analise, generated_at: geradoEm }),
    "salvar análise",
  );
}

export async function lerAnaliseLead<T>(id: string): Promise<T | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  const r = await supabase()
    .from("lead_analyses")
    .select("analysis")
    .eq("company_id", id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const l = dados<Linha | null>(r, "ler análise");
  return l ? (l.analysis as T) : null;
}
