// Painel da operação: comando, inbox, backlog, kanban, placar e fichas dos
// agentes, todos em workspace_documents, mais o funil e o rastreamento.
import { DOC, gravarMarkdown, lerMarkdown, lerVarios, listarPorTipo } from "./documentos";
import { listarLeads } from "./leads";
import {
  addListItem,
  findCheckbox,
  frontmatter,
  kanbanColumns,
  mdToHtml,
  sectionRange,
  semFrontmatter,
  splitSections,
} from "./markdown";
import { rastreamentoData } from "./rastreamento";

const COMANDOS: Record<string, string> = { Caio: "/caio", Davi: "/davi", Theo: "/theo", Mia: "/mia" };

export async function buildData() {
  const docs = await lerVarios([DOC.comando, DOC.inbox, DOC.backlog, DOC.kanban, DOC.placar]);
  const md = (k: string) => docs.get(k)?.content_markdown ?? "";
  const comandoMd = md(DOC.comando);
  const placarMd = md(DOC.placar);

  const pm = placarMd.match(/(\d+)%\s*\(R\$ ([\d.]+)\s*\/\s*R\$ ([\d.]+)\)/i);
  const fase = (comandoMd.match(/\| Fase \| ([^|]+) \|/) || [])[1]?.trim() || "";

  const agentes = [];
  for (const d of await listarPorTipo("agente")) {
    const fm = frontmatter(d.content_markdown);
    if (!fm.agente) continue;
    agentes.push({
      nome: fm.agente,
      departamento: fm.departamento || "",
      comando: COMANDOS[fm.agente] || "",
      html: mdToHtml(semFrontmatter(d.content_markdown)),
    });
  }
  agentes.sort((a, b) => a.nome.localeCompare(b.nome));

  const [pipeline, rastreamento] = await Promise.all([listarLeads(), rastreamentoData()]);
  return {
    placar: {
      progresso: pm ? Number(pm[1]) : 0,
      acumulado: pm ? Number(pm[2].replace(/\./g, "")) : 0,
      meta: pm ? Number(pm[3].replace(/\./g, "")) : 100000,
      fase,
    },
    comando: splitSections(comandoMd),
    inbox: splitSections(md(DOC.inbox)),
    backlog: splitSections(md(DOC.backlog)),
    kanban: kanbanColumns(md(DOC.kanban)),
    agentes,
    pipeline,
    rastreamento,
  };
}

export async function inboxAdd(text: string): Promise<void> {
  const conteudo = await lerMarkdown(DOC.inbox);
  if (!conteudo) throw new Error("INBOX ainda não foi importado");
  const lines = conteudo.split(/\r?\n/);
  const r = sectionRange(lines, "Abertas");
  if (!r) throw new Error("seção 'Abertas' não encontrada no INBOX");
  addListItem(lines, r, `- ${text}`);
  await gravarMarkdown(DOC.inbox, lines.join("\n"));
}

export async function kanbanOp(op: { action: string; column?: string; text?: string; from?: string; to?: string }): Promise<void> {
  const conteudo = await lerMarkdown(DOC.kanban);
  if (!conteudo) throw new Error("Kanban ainda não foi importado");
  const lines = conteudo.split(/\r?\n/);
  if (op.action === "add") {
    const r = sectionRange(lines, op.column!);
    if (!r) throw new Error(`coluna '${op.column}' não encontrada`);
    addListItem(lines, r, `- [ ] ${op.text}`);
  } else if (op.action === "toggle") {
    const r = sectionRange(lines, op.column!);
    const c = r && findCheckbox(lines, r, op.text!);
    if (!c) throw new Error("cartão não encontrado");
    lines[c.index] = c.match[1] + (c.match[2] === "x" ? " " : "x") + c.match[3] + c.match[4];
  } else if (op.action === "move") {
    const fr = sectionRange(lines, op.from!);
    const c = fr && findCheckbox(lines, fr, op.text!);
    if (!c) throw new Error("cartão não encontrado na origem");
    const done = op.to === "Feito" ? "x" : c.match[2];
    lines.splice(c.index, 1);
    const tr = sectionRange(lines, op.to!);
    if (!tr) throw new Error(`coluna destino '${op.to}' não encontrada`);
    addListItem(lines, tr, `- [${done}] ${op.text}`);
  } else if (op.action === "delete") {
    const r = sectionRange(lines, op.column!);
    const c = r && findCheckbox(lines, r, op.text!);
    if (!c) throw new Error("cartão não encontrado");
    lines.splice(c.index, 1);
  } else {
    throw new Error("ação desconhecida");
  }
  await gravarMarkdown(DOC.kanban, lines.join("\n"));
}
