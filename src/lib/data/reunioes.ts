// Reuniões da agenda (tabela meetings). "quando" segue o formato do formulário:
// "2026-10-06T14:00" na hora de Salvador.
import { agoraIso, dados, isoParaLocal, localParaIso, supabase, texto, type Linha } from "./client";

export type Reuniao = {
  id: string;
  titulo: string;
  quando: string;
  duracao: number;
  participante: string;
  criada_em: string;
};

function mapear(l: Linha): Reuniao {
  return {
    id: String(l.id),
    titulo: texto(l.title),
    quando: isoParaLocal(texto(l.starts_at)),
    duracao: Number(l.duration_minutes) || 0,
    participante: texto(l.participant),
    criada_em: texto(l.created_at),
  };
}

export async function listarReunioes(): Promise<Reuniao[]> {
  const r = await supabase().from("meetings").select("*").order("starts_at");
  return (dados<Linha[]>(r, "listar reuniões") ?? []).map(mapear);
}

export async function criarReuniao(op: { titulo: string; quando: string; duracao?: number; participante?: string }): Promise<Reuniao> {
  const dur = Number(op.duracao);
  const inicio = new Date(localParaIso(op.quando));
  if (!Number.isFinite(inicio.getTime())) throw new Error("data inválida");
  const linha = {
    id: `reu-${Date.now().toString(36)}`,
    title: op.titulo,
    starts_at: inicio.toISOString(),
    duration_minutes: Number.isFinite(dur) && dur > 0 ? Math.round(dur) : 30,
    participant: op.participante || null,
    created_at: agoraIso(),
  };
  const r = await supabase().from("meetings").insert(linha).select().single();
  return mapear(dados<Linha>(r, "criar reunião"));
}
