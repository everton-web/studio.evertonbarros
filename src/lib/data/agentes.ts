// Demandas dos agentes (agent_demands) e sala de reunião (agent_messages).
// Os campos de execução que não têm coluna ficam em metadata; o Log é
// append-only em metadata.log e espelhado em content_markdown para leitura.
import { agoraIso, dados, dataHoraBr, objeto, supabase, texto, type Linha } from "./client";

export type DemandaStatus =
  | "fila"
  | "em_andamento"
  | "aguardando_everton"
  | "bloqueada"
  | "aguardando_cliente"
  | "concluida"
  | "cancelada";

export type Demanda = {
  id: string;
  titulo: string;
  persona: string;
  status: DemandaStatus;
  criada_em: string;
  iniciada_em: string;
  concluida_em: string;
  prazo: string;
  cliente: string;
  projeto: string;
  origem: string;
  briefing: string;
  log: string[];
};

function mapear(l: Linha): Demanda {
  const m = objeto(l.metadata);
  return {
    id: String(l.id),
    titulo: texto(l.title),
    persona: texto(l.persona),
    status: (texto(l.status) as DemandaStatus) || "fila",
    criada_em: texto(m.criada_em) || texto(l.created_at),
    iniciada_em: texto(m.iniciada_em),
    concluida_em: texto(m.concluida_em),
    prazo: texto(m.prazo),
    cliente: texto(m.cliente),
    projeto: texto(m.projeto),
    origem: texto(l.origin),
    briefing: texto(m.briefing),
    log: Array.isArray(m.log) ? m.log.map((x) => texto(x)) : [],
  };
}

function prazoParaIso(prazo: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(prazo) ? `${prazo}T23:59:59-03:00` : null;
}

function linha(d: Demanda): Record<string, unknown> {
  const log = d.log.map((l) => l.replace(/\r?\n/g, " "));
  return {
    id: d.id,
    title: d.titulo,
    persona: d.persona,
    status: d.status,
    origin: d.origem || null,
    due_at: prazoParaIso(d.prazo),
    content_markdown: `## Log\n${log.map((l) => `- ${l}`).join("\n")}${log.length ? "\n" : ""}`,
    metadata: {
      criada_em: d.criada_em,
      iniciada_em: d.iniciada_em,
      concluida_em: d.concluida_em,
      prazo: d.prazo,
      cliente: d.cliente,
      projeto: d.projeto,
      briefing: d.briefing,
      log,
    },
    updated_at: agoraIso(),
  };
}

async function salvar(d: Demanda): Promise<void> {
  dados(await supabase().from("agent_demands").upsert(linha(d), { onConflict: "id" }), "salvar demanda");
}

export async function listarDemandas(): Promise<Demanda[]> {
  const r = await supabase().from("agent_demands").select("*");
  const out = (dados<Linha[]>(r, "listar demandas") ?? []).map(mapear);
  return out.sort((a, b) => (a.criada_em < b.criada_em ? 1 : a.criada_em > b.criada_em ? -1 : 0));
}

export async function lerDemanda(id: string): Promise<Demanda | null> {
  const r = await supabase().from("agent_demands").select("*").eq("id", id).maybeSingle();
  const l = dados<Linha | null>(r, "ler demanda");
  return l ? mapear(l) : null;
}

export async function criarDemanda(op: {
  titulo: string;
  persona?: string;
  briefing?: string;
  origem?: string;
  prazo?: string;
  cliente?: string;
  projeto?: string;
}): Promise<Demanda> {
  const agora = agoraIso();
  const persona = op.persona || "orion";
  const d: Demanda = {
    id: `dem-${Date.now().toString(36)}`,
    titulo: op.titulo,
    persona,
    status: "fila",
    criada_em: agora,
    iniciada_em: "",
    concluida_em: "",
    prazo: op.prazo || agora.slice(0, 10),
    cliente: op.cliente || "",
    projeto: op.projeto || "",
    origem: op.origem || "orion",
    briefing: op.briefing || "",
    log: [`${agora} ${persona} fila criada`],
  };
  const r = await supabase().from("agent_demands").insert({ ...linha(d), created_at: agora });
  dados(r, "criar demanda");
  return d;
}

// REGRA DURA: só troca status, timestamps de transição e Log. Os campos de
// execução vêm do banco e nunca são sobrescritos por este caminho.
export async function atualizarStatus(
  id: string,
  status: DemandaStatus,
  op?: { quem?: string; nota?: string },
): Promise<Demanda | null> {
  const d = await lerDemanda(id);
  if (!d) return null;
  const agora = agoraIso();
  const quem = op?.quem || "orion";
  const nota = op?.nota ? ` ${op.nota}` : "";
  d.status = status;
  if (status === "em_andamento" && !d.iniciada_em) d.iniciada_em = agora;
  if ((status === "concluida" || status === "cancelada") && !d.concluida_em) d.concluida_em = agora;
  d.log.push(`${agora} ${quem} ${status}${nota}`);
  await salvar(d);
  return d;
}

// Atualiza a persona. Respeita a REGRA DURA: em_andamento não muda.
export async function atualizarPersona(id: string, persona: string): Promise<Demanda | null> {
  const d = await lerDemanda(id);
  if (!d) return null;
  if (d.status === "em_andamento") return d;
  d.persona = persona;
  await salvar(d);
  return d;
}

export async function acrescentarLog(id: string, entrada: string): Promise<void> {
  const d = await lerDemanda(id);
  if (!d) return;
  d.log.push(entrada.replace(/\r?\n/g, " "));
  await salvar(d);
}

// ---------- sala ----------
export type MensagemSala = { quando: string; de: string; para?: string; texto: string };

function mapearMensagem(l: Linha): MensagemSala {
  const m: MensagemSala = { quando: dataHoraBr(texto(l.created_at)), de: texto(l.sender), texto: texto(l.body) };
  if (l.recipient) m.para = texto(l.recipient);
  return m;
}

export async function mensagensSala(): Promise<MensagemSala[]> {
  const r = await supabase().from("agent_messages").select("*").is("demand_id", null).order("id", { ascending: false }).limit(80);
  return (dados<Linha[]>(r, "ler sala") ?? []).map(mapearMensagem).reverse();
}

export async function postarSala(op: { de: string; texto: string; para?: string }): Promise<MensagemSala> {
  const r = await supabase()
    .from("agent_messages")
    .insert({ sender: op.de || "orquestra", recipient: op.para || null, body: op.texto })
    .select()
    .single();
  return mapearMensagem(dados<Linha>(r, "postar na sala"));
}

export async function estadoAgentes(): Promise<Record<string, { ocupado: boolean; demanda?: string }>> {
  const demandas = await listarDemandas();
  const out: Record<string, { ocupado: boolean; demanda?: string }> = {
    caio: { ocupado: false },
    davi: { ocupado: false },
    theo: { ocupado: false },
    mia: { ocupado: false },
    orquestra: { ocupado: false },
    lia: { ocupado: false },
    fabio: { ocupado: false },
    olga: { ocupado: false },
    "davi-copy": { ocupado: false },
  };
  for (const d of demandas) {
    if (d.status === "em_andamento") {
      const alvo = out[d.persona];
      if (alvo) { alvo.ocupado = true; alvo.demanda = d.titulo.slice(0, 80); }
    }
  }
  return out;
}
