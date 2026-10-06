// Funil de prospecção. Antes: fichas Markdown em 40 Comercial/Leads + SQLite.
// Agora: uma linha em companies por lead. Campos estruturados vão para colunas,
// o restante do frontmatter fica em raw_source.ficha e o corpo Markdown em
// raw_source.corpo. As movimentações ficam em lead_movements.
import { agoraIso, dados, slug, supabase, texto, type Linha } from "./client";
import { sincronizarContato } from "./contatos";
import { estagioCrmDoFunil, rawSource, type EstagioCrm } from "./empresas";

export const ESTAGIOS = ["Prospecção", "Aprovação", "Contato", "Negociação", "Desenvolvimento", "Entrega"];

type Ficha = Record<string, string>;

export type Lead = {
  id: string;
  nome: string;
  segmento: string;
  cidade: string;
  nota: number;
  avaliacoes: number;
  site: string;
  contato: string;
  whatsapp: string;
  email: string;
  categoria: string;
  frente: string;
  estagio: number;
  status: string;
  solucao: string;
  motivo: string;
  porque: string;
  mensagem: string;
  movs: string[];
  criado: string;
  presenca: number | null;
  analiseEm: string;
  relatorio: string;
  contatadoEm: string;
  respondeuEm: string;
  desfecho: string;
  desfechoEm: string;
  cliente: boolean;
};

// Chaves da ficha que viram coluna em companies.
const CHAVES_COLUNA = ["lead", "segmento", "cidade", "nota-google", "avaliacoes", "site-atual", "categoria", "estagio", "status"];

function numeroBr(v: string | undefined): number | null {
  const n = Number(String(v || "").replace(/\.(?=\d{3})/g, "").replace(",", "."));
  return Number.isFinite(n) && String(v || "").trim() !== "" ? n : null;
}

function limitarEstagio(v: unknown): number {
  return Math.min(5, Math.max(0, Number(v) || 0));
}

// Ficha completa (frontmatter) a partir da linha de companies.
function fichaDaLinha(l: Linha): Ficha {
  const raw = rawSource(l);
  const ficha: Ficha = {};
  for (const [k, v] of Object.entries((raw.ficha as Record<string, unknown>) || {})) ficha[k] = texto(v);
  ficha.lead = texto(l.name);
  ficha.segmento = texto(l.segment);
  ficha.cidade = texto(l.city);
  ficha["nota-google"] = l.google_rating == null ? "" : String(l.google_rating);
  ficha.avaliacoes = l.review_count == null ? "" : String(l.review_count);
  ficha["site-atual"] = texto(l.website);
  ficha.categoria = texto(l.category);
  ficha.estagio = String(limitarEstagio(l.funnel_stage));
  ficha.status = texto(l.status);
  return ficha;
}

function colunasDaFicha(fm: Ficha): Record<string, unknown> {
  const nota = numeroBr(fm["nota-google"]);
  const avaliacoes = numeroBr(fm.avaliacoes);
  return {
    name: fm.lead || "",
    segment: fm.segmento || null,
    city: fm.cidade || null,
    google_rating: nota !== null && nota >= 0 && nota <= 9.99 ? nota : null,
    review_count: avaliacoes !== null && avaliacoes >= 0 ? Math.round(avaliacoes) : null,
    website: fm["site-atual"] || null,
    category: fm.categoria || null,
    funnel_stage: limitarEstagio(fm.estagio),
    status: fm.status || null,
  };
}

function restoDaFicha(fm: Ficha): Ficha {
  const resto: Ficha = {};
  for (const [k, v] of Object.entries(fm)) if (!CHAVES_COLUNA.includes(k)) resto[k] = (v || "").replace(/\r?\n/g, " ");
  return resto;
}

async function linhaDoLead(id: string): Promise<Linha | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  const r = await supabase().from("companies").select("*").eq("id", id).maybeSingle();
  const l = dados<Linha | null>(r, "ler lead");
  return l && rawSource(l).ficha ? l : null;
}

// Grava ficha e corpo. crm: estágio do CRM a aplicar; sem valor, segue a regra
// do funil sem rebaixar quem já é cliente.
async function salvarFicha(l: Linha, fm: Ficha, corpo: string, crm?: EstagioCrm): Promise<void> {
  const funil = limitarEstagio(fm.estagio);
  const atual = String(l.crm_stage || "lead");
  const alvo: string = crm ?? (atual === "cliente" ? "cliente" : estagioCrmDoFunil(Math.min(funil, 4)));
  const agora = agoraIso();
  const patch: Record<string, unknown> = {
    ...colunasDaFicha(fm),
    crm_stage: alvo,
    raw_source: { ...rawSource(l), ficha: restoDaFicha(fm), corpo },
    updated_at: agora,
  };
  if (alvo === "cliente" && !l.closed_on) patch.closed_on = agora.slice(0, 10);
  dados(await supabase().from("companies").update(patch).eq("id", String(l.id)), "gravar ficha");
}

async function registrarMov(id: string, de: number | null, para: number | null, tipo: string, nota: string): Promise<void> {
  dados(
    await supabase().from("lead_movements").insert({ company_id: id, from_stage: de, to_stage: para, event_type: tipo, note: nota }),
    "registrar movimentação",
  );
}

export async function listarLeads(): Promise<Lead[]> {
  const r = await supabase().from("companies").select("*").not("raw_source->ficha", "is", null);
  const linhas = dados<Linha[]>(r, "listar leads") ?? [];
  const ids = linhas.map((l) => String(l.id));
  const movs = new Map<string, string[]>();
  if (ids.length) {
    const rm = await supabase().from("lead_movements").select("company_id, note").in("company_id", ids).order("id", { ascending: false });
    for (const m of dados<Linha[]>(rm, "listar movimentações") ?? []) {
      const k = String(m.company_id);
      if (!movs.has(k)) movs.set(k, []);
      if (m.note) movs.get(k)!.push(String(m.note));
    }
  }
  const leads = linhas.map((l): Lead => {
    const fm = fichaDaLinha(l);
    const nota = numeroBr(fm["nota-google"]);
    const avaliacoes = numeroBr(fm.avaliacoes);
    return {
      id: String(l.id),
      nome: fm.lead,
      segmento: fm.segmento || "",
      cidade: fm.cidade || "",
      nota: nota ?? 0,
      avaliacoes: avaliacoes ?? 0,
      site: fm["site-atual"] || "",
      contato: fm.contato || "",
      whatsapp: fm.whatsapp || "",
      email: fm.email || "",
      categoria: fm.categoria || fm.fonte || "maps",
      frente: fm.frente || "",
      estagio: limitarEstagio(fm.estagio),
      status: fm.status || "ativo",
      solucao: fm.solucao || "",
      motivo: fm["motivo-arquivo"] || "",
      porque: (fm.porque || "").replace(/\r?\n/g, " ").trim(),
      mensagem: fm.mensagem || "",
      movs: movs.get(String(l.id)) || [],
      criado: fm.criado || "",
      presenca: fm.presenca ? Number(fm.presenca) : null,
      analiseEm: fm["analise-em"] || "",
      relatorio: fm.relatorio || "",
      contatadoEm: fm["contatado-em"] || "",
      respondeuEm: fm["respondeu-em"] || "",
      desfecho: fm.desfecho || "",
      desfechoEm: fm["desfecho-em"] || "",
      cliente: String(l.crm_stage) === "cliente",
    };
  });
  return leads.sort((a, b) => a.estagio - b.estagio || a.criado.localeCompare(b.criado));
}

export type OpPipeline = {
  action: string; id?: string; nome?: string; segmento?: string; cidade?: string;
  nota?: string; avaliacoes?: string; site?: string; contato?: string; whatsapp?: string;
  email?: string; categoria?: string; porque?: string; solucao?: string; mensagem?: string;
  estagio?: number; motivo?: string; desfecho?: string; frente?: string;
};

async function criarLead(op: OpPipeline): Promise<{ id: string; criado: string }> {
  const id = slug(op.nome || "lead");
  const now = agoraIso().slice(0, 10);
  const fm: Ficha = {
    lead: op.nome || "", segmento: op.segmento || "", cidade: op.cidade || "",
    "nota-google": op.nota || "", avaliacoes: op.avaliacoes || "",
    "site-atual": op.site || "", contato: op.contato || "", whatsapp: op.whatsapp || "",
    email: op.email || "", categoria: op.categoria || "maps", frente: op.frente || "",
    estagio: "0", status: "ativo", solucao: "", "motivo-arquivo": "",
    porque: (op.porque || "").replace(/\r?\n/g, " "), criado: now,
    "contatado-em": "", "respondeu-em": "", desfecho: "", "desfecho-em": "",
  };
  const corpo = `\n# ${op.nome}\n\n## Por que é um bom lead\n${op.porque || "_a preencher_"}\n`;
  const r = await supabase().from("companies").select("*").eq("id", id).maybeSingle();
  const existente = dados<Linha | null>(r, "ler empresa");
  if (existente) {
    await salvarFicha(existente, fm, corpo);
  } else {
    dados(
      await supabase().from("companies").insert({
        id,
        ...colunasDaFicha(fm),
        name: op.nome || id,
        crm_stage: "lead",
        source: "lead",
        raw_source: { ficha: restoDaFicha(fm), corpo },
      }),
      "criar lead",
    );
  }
  await sincronizarContato(id, { telefone: op.contato, whatsapp: op.whatsapp, email: op.email });
  return { id, criado: now };
}

export async function pipelineOp(op: OpPipeline): Promise<Record<string, unknown>> {
  if (op.action === "add") return criarLead(op);
  if (!op.id) throw new Error("lead ausente");
  const l = await linhaDoLead(op.id);
  if (!l) throw new Error("lead não encontrado");
  const fm = fichaDaLinha(l);
  const corpo = texto(rawSource(l).corpo);
  const oggi = agoraIso().slice(0, 10);

  if (op.action === "move") {
    const from = limitarEstagio(fm.estagio);
    const to = limitarEstagio(op.estagio);
    fm.estagio = String(to);
    if (to === 2 && !fm["contatado-em"]) fm["contatado-em"] = oggi;
    if (from === 2 && to === 3 && !fm["respondeu-em"]) fm["respondeu-em"] = oggi;
    // estágio 1 grava oportunidade e estágio 5 grava cliente, na mesma empresa
    await salvarFicha(l, fm, corpo, estagioCrmDoFunil(to));
    const mov = to === 5 ? `${oggi} · entregue · pedir indicação` : `${oggi} · avançou para ${ESTAGIOS[to]}`;
    await registrarMov(op.id, from, to, "move", mov);
    return { ok: true };
  }
  if (op.action === "update") {
    if (op.nome) fm.lead = op.nome;
    if (op.segmento !== undefined) fm.segmento = op.segmento;
    if (op.cidade !== undefined) fm.cidade = op.cidade;
    if (op.nota !== undefined) fm["nota-google"] = op.nota;
    if (op.avaliacoes !== undefined) fm.avaliacoes = op.avaliacoes;
    if (op.site !== undefined) fm["site-atual"] = op.site;
    if (op.contato !== undefined) fm.contato = op.contato;
    if (op.whatsapp !== undefined) fm.whatsapp = op.whatsapp;
    if (op.email !== undefined) fm.email = op.email;
    if (op.categoria !== undefined) fm.categoria = op.categoria;
    if (op.porque !== undefined) fm.porque = op.porque.replace(/\r?\n/g, " ");
    if (op.solucao !== undefined) fm.solucao = op.solucao;
    if (op.mensagem !== undefined) fm.mensagem = op.mensagem;
    await salvarFicha(l, fm, corpo);
    await sincronizarContato(op.id, { telefone: op.contato, whatsapp: op.whatsapp, email: op.email });
    return { ok: true };
  }
  if (op.action === "archive") {
    fm.status = "arquivado";
    fm["motivo-arquivo"] = (op.motivo || "").replace(/\r?\n/g, " ");
    await salvarFicha(l, fm, corpo);
    await registrarMov(op.id, null, null, "archive", `${oggi} · arquivado · ${op.motivo || "sem motivo"}`);
    return { ok: true };
  }
  if (op.action === "reactivate") {
    fm.status = "ativo";
    fm["motivo-arquivo"] = "";
    fm.desfecho = "";
    fm["desfecho-em"] = "";
    await salvarFicha(l, fm, corpo);
    await registrarMov(op.id, null, null, "reactivate", `${oggi} · reativado`);
    return { ok: true };
  }
  if (op.action === "delete") {
    // Apagar a ficha remove a empresa, exceto se ela já é cliente.
    if (String(l.crm_stage) === "cliente") {
      const raw = { ...rawSource(l) };
      delete raw.ficha;
      delete raw.corpo;
      dados(await supabase().from("companies").update({ raw_source: raw, updated_at: agoraIso() }).eq("id", op.id), "remover ficha");
    } else {
      dados(await supabase().from("companies").delete().eq("id", op.id), "remover lead");
    }
    return { ok: true };
  }
  if (op.action === "desfecho") {
    const tipo = op.desfecho === "sem-interesse" ? "sem-interesse" : "sem-resposta";
    fm.desfecho = tipo;
    fm["desfecho-em"] = oggi;
    fm.status = "arquivado";
    fm["motivo-arquivo"] = tipo === "sem-interesse" ? "Sem interesse (recusou)" : "Sem continuidade (não respondeu)";
    if (!fm["contatado-em"]) fm["contatado-em"] = oggi;
    await salvarFicha(l, fm, corpo);
    const mov = tipo === "sem-interesse" ? "sem interesse (recusou)" : "sem continuidade (não respondeu)";
    await registrarMov(op.id, null, null, "desfecho", `${oggi} · ${mov}`);
    return { ok: true };
  }
  if (op.action === "contatar") {
    if (!fm["contatado-em"]) fm["contatado-em"] = oggi;
    await salvarFicha(l, fm, corpo);
    return { ok: true };
  }
  if (op.action === "responder") {
    if (!fm["respondeu-em"]) fm["respondeu-em"] = oggi;
    await salvarFicha(l, fm, corpo);
    await registrarMov(op.id, null, null, "responder", `${oggi} · respondeu`);
    return { ok: true };
  }
  throw new Error("ação desconhecida");
}

// ---------- análise de presença na ficha do lead ----------
export type LeadBase = {
  id: string; nome: string; cidade: string; site: string; segmento: string;
  nota: number; avaliacoes: number; whatsapp: string; contato: string; email: string;
};

export async function leadBase(id: string): Promise<LeadBase | null> {
  const l = await linhaDoLead(id);
  if (!l) return null;
  const fm = fichaDaLinha(l);
  return {
    id, nome: fm.lead || id, cidade: fm.cidade || "", site: fm["site-atual"] || "",
    segmento: fm.segmento || "",
    nota: numeroBr(fm["nota-google"]) ?? 0, avaliacoes: numeroBr(fm.avaliacoes) ?? 0,
    whatsapp: fm.whatsapp || "", contato: fm.contato || "", email: fm.email || "",
  };
}

function formatarWhatsapp(digitos: string): string {
  let n = digitos;
  if ((n.length === 12 || n.length === 13) && n.startsWith("55")) n = n.slice(2);
  if (n.length < 10 || n.length > 11) return digitos;
  const dd = n.slice(0, 2);
  const num = n.slice(2);
  const tel = num.length === 9 ? `${num.slice(0, 5)}-${num.slice(5)}` : num.length === 8 ? `${num.slice(0, 4)}-${num.slice(4)}` : num;
  return `+55 ${dd} ${tel}`;
}

function celularDeTelefones(telefones?: string[]): string {
  if (!telefones?.length) return "";
  for (const t of telefones) {
    const d = (t || "").replace(/\D/g, "");
    if (!d) continue;
    const sem55 = d.startsWith("55") ? d.slice(2) : d;
    if (sem55.length === 11 && sem55.slice(2).length === 9) return d;
  }
  return "";
}

type ContatosDaAnalise = { links?: { whatsapp?: string }; contatos?: { telefones?: string[]; emails?: string[] } };

function analiseParaTelefone(analise?: ContatosDaAnalise): string {
  if (!analise) return "";
  const deLink = (analise.links?.whatsapp || "").replace(/\D/g, "");
  const deContatos = celularDeTelefones(analise.contatos?.telefones);
  if (deLink) return formatarWhatsapp(deLink);
  if (deContatos) return formatarWhatsapp(deContatos);
  return "";
}

export async function gravarAnaliseNaFicha(id: string, resumoMd: string, pontuacao: number, analise?: ContatosDaAnalise): Promise<void> {
  const l = await linhaDoLead(id);
  if (!l) throw new Error("lead não encontrado");
  const fm = fichaDaLinha(l);
  fm.presenca = String(pontuacao);
  fm["analise-em"] = agoraIso().slice(0, 10);
  if (analise) {
    if (!fm.whatsapp) { const w = analiseParaTelefone(analise); if (w) fm.whatsapp = w; }
    if (!fm.contato) { const w = analiseParaTelefone(analise); if (w) fm.contato = w; }
    if (!fm.email && analise.contatos?.emails?.[0]) fm.email = analise.contatos.emails[0];
  }
  // tira a análise anterior: da seção até o próximo título "## " (subtítulos "###" ficam dentro dela)
  let corpo = texto(rawSource(l).corpo).replace(/^## Análise de presença[\s\S]*?(?=^## (?!#)|(?![\s\S]))/m, "");
  corpo = corpo.replace(/\s*$/, "") + "\n\n" + resumoMd.trim() + "\n";
  await salvarFicha(l, fm, corpo);
  await sincronizarContato(id, { telefone: fm.contato, whatsapp: fm.whatsapp, email: fm.email });
}

export async function gravarRelatorio(id: string, url: string): Promise<void> {
  const l = await linhaDoLead(id);
  if (!l) throw new Error("lead não encontrado");
  const fm = fichaDaLinha(l);
  fm.relatorio = url;
  await salvarFicha(l, fm, texto(rawSource(l).corpo));
}

// Leads vindos do formulário de um site ("Formulário de <chave>" no porquê).
export async function contarLeadsDeFormulario(chaves: string[]): Promise<number> {
  const r = await supabase().from("companies").select("raw_source").not("raw_source->ficha", "is", null);
  let total = 0;
  for (const l of dados<Linha[]>(r, "contar leads") ?? []) {
    const ficha = (rawSource(l).ficha as Record<string, unknown>) || {};
    const m = texto(ficha.porque).match(/Formulário de ([^\s·]+)/);
    if (m && chaves.includes(m[1])) total += 1;
  }
  return total;
}
