#!/usr/bin/env node
// Importador do legado (vault + SQLite + arquivos) para o Supabase da plataforma.
// Node puro (>= 22.13, por causa do node:sqlite). Idempotente: rodar de novo
// atualiza as mesmas linhas, sem duplicar.
//
// Modos:
//   scan     lista fontes, contagens, IDs duplicados, datas inválidas e órfãos. Não fala com o Supabase.
//   dry-run  monta o plano completo de upsert e grava a auditoria em JSON. Não fala com o Supabase.
//   apply    grava no Supabase (precisa de SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY).
//   verify   compara o plano com o que está no Supabase; sai com código 1 se algo divergir.
//
// Uso:
//   node --env-file=.env.local scripts/importar-supabase.mjs <modo> \
//     --vault /srv/asymmetrics/vault --sqlite /caminho/agencia.db \
//     [--arquivos DIR] [--docs DIR] [--sala ARQUIVO] [--site-relatorios DIR] [--saida ARQUIVO]
//
// Nunca imprime senha, token ou credencial decifrada. Credenciais seguem cifradas
// (mesma AGENCIA_COFRE_KEY); tokens antigos de briefing e relatório são importados
// com hash e devem ser rotacionados depois do corte.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";

const VERSAO = "1.0.0";
const LOTE = 200;
const MODOS = ["scan", "dry-run", "apply", "verify"];

// ---------- argumentos ----------
function lerArgs(argv) {
  const [modo, ...resto] = argv;
  const op = {};
  for (let i = 0; i < resto.length; i++) {
    const a = resto[i];
    if (!a.startsWith("--")) throw new Error(`argumento inesperado: ${a}`);
    const [k, v] = a.includes("=") ? a.slice(2).split(/=(.*)/s) : [a.slice(2), resto[++i]];
    if (v === undefined) throw new Error(`--${k} precisa de valor`);
    op[k] = v;
  }
  return { modo, op };
}

function ajuda(msg) {
  if (msg) console.error(`erro: ${msg}\n`);
  console.error(
    "uso: node --env-file=.env.local scripts/importar-supabase.mjs <scan|dry-run|apply|verify> --vault DIR --sqlite ARQUIVO\n" +
      "     [--arquivos DIR] [--docs DIR] [--sala ARQUIVO] [--site-relatorios DIR] [--saida ARQUIVO] [--bucket NOME]",
  );
  process.exit(2);
}

// ---------- utilitários ----------
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// UUID estável a partir de um texto: o mesmo legado gera sempre o mesmo id.
function uuidDe(texto) {
  const s = String(texto);
  if (UUID_RE.test(s)) return s.toLowerCase();
  const h = sha256(`asym-import:${s}`);
  const v = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${v}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function vazio(v) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

function numero(v) {
  if (vazio(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// "1.234,56", "R$ 1.500", "1500" para número. Mesma regra de src/lib/formato.ts (lerValor).
function lerValor(texto) {
  if (vazio(texto)) return null;
  const m = String(texto).match(/\d[\d.,]*/);
  if (!m) return null;
  let s = m[0];
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{3}(\.|$)/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function numeroBr(v) {
  if (vazio(v)) return null;
  const n = Number(String(v).replace(/\.(?=\d{3})/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Datas do legado: ISO, "YYYY-MM-DD", "YYYY-MM-DD HH:MM:SS" (UTC do hits.json),
// "YYYY-MM-DDTHH:MM" (hora de Salvador) e "dd/mm/aaaa, hh:mm:ss" (toLocaleString pt-BR).
function dataIso(v, { local = false } = {}) {
  if (vazio(v)) return null;
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const p = (x) => String(x || "0").padStart(2, "0");
    return new Date(`${m[3]}-${p(m[2])}-${p(m[1])}T${p(m[4])}:${p(m[5])}:${p(m[6])}-03:00`).toISOString();
  }
  m = s.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/);
  if (m) return new Date(`${m[1]}T${m[2]}Z`).toISOString();
  if (local && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(s)) return new Date(`${s.length === 16 ? `${s}:00` : s}-03:00`).toISOString();
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function soData(v) {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(String(v || "").trim()) ? String(v).trim() : dataIso(v);
  return iso ? iso.slice(0, 10) : null;
}

function slug(s, padrao = "lead") {
  return (
    String(s)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || padrao
  );
}

function frontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = {};
  if (!m) return fm;
  for (const linha of m[1].split(/\r?\n/)) {
    const kv = linha.match(/^([\w-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

const semFrontmatter = (md) => md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");

function listar(dir, filtro) {
  if (!dir || !existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => !f.startsWith(".") && filtro(f) && statSync(join(dir, f)).isFile())
    .sort()
    .map((f) => join(dir, f));
}

function listarRecursivo(dir, filtro) {
  if (!dir || !existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir).sort()) {
    if (f.startsWith(".") || f === "node_modules") continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...listarRecursivo(p, filtro));
    else if (filtro(f)) out.push(p);
  }
  return out;
}

function lerJson(p, avisos) {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch (e) {
    avisos.push(`JSON ilegível: ${p} (${e.message})`);
    return null;
  }
}

const objeto = (v) => (v !== null && typeof v === "object" && !Array.isArray(v) ? v : {});
const relVault = (vault, p) => relative(vault, p).split(sep).join("/");

// ---------- leitura do SQLite ----------
async function lerSqlite(caminho, avisos) {
  const vazioDb = { empresa: [], contato: [], oportunidade: [], projeto: [], contrato: [], credencial: [], briefing: [], relatorio: [] };
  if (!caminho) {
    avisos.push("--sqlite não informado: só as fontes do vault entram");
    return vazioDb;
  }
  if (!existsSync(caminho)) throw new Error(`SQLite não encontrado: ${caminho}`);
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(caminho, { readOnly: true });
  const tabelas = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name));
  const out = { ...vazioDb };
  for (const t of Object.keys(out)) {
    if (tabelas.has(t)) out[t] = db.prepare(`SELECT * FROM ${t}`).all().map((r) => ({ ...r }));
    else avisos.push(`tabela ${t} ausente no SQLite`);
  }
  db.close();
  return out;
}

// ---------- montagem do plano ----------
const CHAVES_COLUNA_LEAD = ["lead", "segmento", "cidade", "nota-google", "avaliacoes", "site-atual", "categoria", "estagio", "status"];
const CRM = new Set(["lead", "oportunidade", "cliente"]);
const DEMANDA_STATUS = new Set(["fila", "em_andamento", "aguardando_everton", "bloqueada", "aguardando_cliente", "concluida", "cancelada"]);
const limitarEstagio = (v) => Math.min(5, Math.max(0, Number(v) || 0));
const estagioCrmDoFunil = (f) => (f >= 5 ? "cliente" : f >= 1 ? "oportunidade" : "lead");

function tipoDoDocumento(key) {
  if (key.startsWith("10 Agentes/")) return "agente";
  if (key.startsWith("docs/")) return "doc";
  if (key.endsWith(".json")) return "config";
  if (key.startsWith("60 Financeiro/")) return "financeiro";
  return "painel";
}
const tituloDoDocumento = (key) => key.replace(/.*\//, "").replace(/\.(md|json)$/i, "");

async function montarPlano(op) {
  const vault = resolve(op.vault);
  const avisos = [];
  const conflitos = [];
  const rejeitados = [];
  const fontes = {};
  const plano = {
    companies: [], contacts: [], lead_movements: [], opportunities: [], projects: [], contracts: [],
    credentials: [], briefings: [], reports: [], lead_analyses: [], workspace_documents: [], meetings: [],
    campaigns: [], tracking_sites: [], financial_transactions: [], agent_demands: [], agent_messages: [],
    health_alerts: [], prospector_runs: [], stored_files: [],
  };
  const conta = (nome, n) => (fontes[nome] = (fontes[nome] || 0) + n);

  // 1. SQLite
  const db = await lerSqlite(op.sqlite && resolve(op.sqlite), avisos);
  for (const [t, linhas] of Object.entries(db)) conta(`sqlite.${t}`, linhas.length);

  const empresas = new Map();
  const idsVistos = new Map();
  for (const e of db.empresa) {
    const id = String(e.id);
    idsVistos.set(id, (idsVistos.get(id) || 0) + 1);
    const crm = CRM.has(String(e.estagio_crm)) ? String(e.estagio_crm) : "lead";
    if (!CRM.has(String(e.estagio_crm))) rejeitados.push({ fonte: "sqlite.empresa", id, motivo: `estagio_crm inválido (${e.estagio_crm}), importado como lead` });
    const nota = numero(e.nota_google);
    empresas.set(id, {
      id,
      name: String(e.nome || id),
      segment: vazio(e.segmento) ? null : String(e.segmento),
      city: vazio(e.cidade) ? null : String(e.cidade),
      website: vazio(e.site) ? null : String(e.site),
      google_rating: nota !== null && nota >= 0 && nota <= 9.99 ? nota : null,
      review_count: numero(e.avaliacoes) !== null ? Math.max(0, Math.round(numero(e.avaliacoes))) : null,
      category: vazio(e.categoria) ? null : String(e.categoria),
      crm_stage: crm,
      funnel_stage: numero(e.estagio_funil) !== null ? limitarEstagio(e.estagio_funil) : null,
      status: vazio(e.status) ? null : String(e.status),
      source: vazio(e.origem) ? null : String(e.origem),
      project_value: numero(e.valor_projeto),
      recurring_value: numero(e.recorrencia),
      closed_on: soData(e.fechado_em),
      raw_source: { sqlite: true },
      created_at: dataIso(e.criado_em) || new Date().toISOString(),
      updated_at: dataIso(e.atualizado_em) || dataIso(e.criado_em) || new Date().toISOString(),
    });
  }

  // Preenche campo vazio; se os dois têm valor e divergem, registra o conflito e mantém o atual.
  function mesclar(empresa, campo, valor, fonte) {
    if (vazio(valor)) return;
    const atual = empresa[campo];
    if (vazio(atual)) empresa[campo] = valor;
    else if (String(atual) !== String(valor)) conflitos.push({ empresa: empresa.id, campo, mantido: atual, ignorado: valor, fonte });
  }

  // 2. Fichas de leads (40 Comercial/Leads/*.md)
  const contatosFicha = new Map();
  const movsFicha = new Map();
  const arquivosLeads = listar(join(vault, "40 Comercial", "Leads"), (f) => f.toLowerCase().endsWith(".md"));
  conta("vault.leads", arquivosLeads.length);
  for (const p of arquivosLeads) {
    const raw = readFileSync(p, "utf8");
    const fm = frontmatter(raw);
    const id = basename(p).replace(/\.md$/i, "");
    if (!fm.lead) {
      rejeitados.push({ fonte: relVault(vault, p), motivo: "ficha sem campo lead" });
      continue;
    }
    if (!/^[a-z0-9-]+$/.test(id)) avisos.push(`id de lead fora do padrão (a URL antiga continua igual): ${id}`);
    let corpo = semFrontmatter(raw);
    const movs = (corpo.match(/^## Movimentações\r?\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1] || "")
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean);
    // As movimentações passam a viver em lead_movements; o corpo fica sem a seção.
    corpo = corpo.replace(/^## Movimentações\r?\n[\s\S]*?(?=^## |(?![\s\S]))/m, "").replace(/\s*$/, "\n");
    const resto = {};
    for (const [k, v] of Object.entries(fm)) if (!CHAVES_COLUNA_LEAD.includes(k)) resto[k] = String(v || "").replace(/\r?\n/g, " ");

    let e = empresas.get(id);
    const funil = limitarEstagio(fm.estagio);
    if (!e) {
      e = {
        id, name: fm.lead, segment: null, city: null, website: null, google_rating: null, review_count: null,
        category: null, crm_stage: estagioCrmDoFunil(Math.min(funil, 4)), funnel_stage: null, status: null,
        source: "lead", project_value: null, recurring_value: null, closed_on: null, raw_source: {},
        created_at: dataIso(fm.criado) || new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      empresas.set(id, e);
    }
    // Ficha vence no funil, no status de prospecção e nos textos.
    e.funnel_stage = funil;
    e.status = fm.status || e.status || "ativo";
    mesclar(e, "name", fm.lead, "ficha");
    mesclar(e, "segment", fm.segmento, "ficha");
    mesclar(e, "city", fm.cidade, "ficha");
    mesclar(e, "website", fm["site-atual"], "ficha");
    mesclar(e, "category", fm.categoria, "ficha");
    const nota = numeroBr(fm["nota-google"]);
    if (nota !== null && nota >= 0 && nota <= 9.99) mesclar(e, "google_rating", nota, "ficha");
    const av = numeroBr(fm.avaliacoes);
    if (av !== null && av >= 0) mesclar(e, "review_count", Math.round(av), "ficha");
    e.raw_source = { ...e.raw_source, ficha: resto, corpo };
    contatosFicha.set(id, { phone: fm.contato || null, whatsapp: fm.whatsapp || null, email: fm.email || null });
    if (movs.length) movsFicha.set(id, movs);
  }

  // 3. Fichas de clientes (40 Comercial/Clientes/*.md) complementam a empresa pelo slug.
  const arquivosClientes = listar(join(vault, "40 Comercial", "Clientes"), (f) => f.toLowerCase().endsWith(".md"));
  conta("vault.clientes", arquivosClientes.length);
  for (const p of arquivosClientes) {
    const raw = readFileSync(p, "utf8");
    const fm = frontmatter(raw);
    if (!fm.status) continue; // ficha de análise, não é cliente
    const id = slug(basename(p).replace(/\.md$/i, ""));
    const e = empresas.get(id);
    if (!e) {
      rejeitados.push({ fonte: relVault(vault, p), id, motivo: "ficha de cliente sem empresa correspondente no SQLite" });
      continue;
    }
    const site = fm.site || raw.match(/\*\*Site:\*\*\s*(https?:\/\/[^\s)]+)/)?.[1] || null;
    mesclar(e, "website", site, "ficha-cliente");
    mesclar(e, "project_value", lerValor(fm["valor-projeto"]), "ficha-cliente");
    if (/\d/.test(fm.recorrencia || "")) mesclar(e, "recurring_value", lerValor(fm.recorrencia), "ficha-cliente");
    mesclar(e, "closed_on", soData(fm["data-fechamento"]), "ficha-cliente");
    e.raw_source = { ...e.raw_source, fichaCliente: fm };
  }
  plano.companies = [...empresas.values()];
  const existe = (id) => empresas.has(String(id));

  // 4. Filhos do SQLite
  const contatosPorEmpresa = new Map();
  for (const c of db.contato) {
    if (!existe(c.empresa_id)) { rejeitados.push({ fonte: "sqlite.contato", id: c.id, motivo: "empresa inexistente" }); continue; }
    const linha = {
      id: uuidDe(`contato:${c.id}`), company_id: String(c.empresa_id), name: c.nome ?? null, phone: null,
      whatsapp: c.whatsapp ?? null, email: c.email ?? null, created_at: dataIso(c.criado_em) || new Date().toISOString(),
    };
    plano.contacts.push(linha);
    if (!contatosPorEmpresa.has(linha.company_id)) contatosPorEmpresa.set(linha.company_id, linha);
  }
  for (const [id, c] of contatosFicha) {
    const primeiro = contatosPorEmpresa.get(id);
    if (primeiro) {
      for (const k of ["phone", "whatsapp", "email"]) if (vazio(primeiro[k]) && !vazio(c[k])) primeiro[k] = c[k];
    } else if (c.phone || c.whatsapp || c.email) {
      plano.contacts.push({ id: uuidDe(`contato-ficha:${id}`), company_id: id, name: null, ...c, created_at: new Date().toISOString() });
    }
  }
  for (const [id, movs] of movsFicha) {
    // A ficha guardava a mais nova primeiro; o banco ordena por id, então entra da mais velha para a mais nova.
    for (const nota of [...movs].reverse()) {
      const data = nota.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
      plano.lead_movements.push({ company_id: id, event_type: "importado", note: nota, occurred_at: data ? `${data}T12:00:00-03:00` : new Date().toISOString() });
    }
  }
  for (const o of db.oportunidade) {
    if (!existe(o.empresa_id)) { rejeitados.push({ fonte: "sqlite.oportunidade", id: o.id, motivo: "empresa inexistente" }); continue; }
    const prob = numero(o.probabilidade);
    plano.opportunities.push({
      id: uuidDe(`oportunidade:${o.id}`), company_id: String(o.empresa_id), value: numero(o.valor),
      probability: prob === null ? null : Math.max(0, Math.min(100, Math.round(prob))),
      expected_on: soData(o.data_prevista), owner: o.dono ?? null, created_at: dataIso(o.criado_em) || new Date().toISOString(),
    });
  }
  for (const p of db.projeto) {
    let qa = [];
    try { qa = p.checklist_qa ? JSON.parse(p.checklist_qa) : []; } catch { avisos.push(`checklist_qa ilegível no projeto ${p.id}`); }
    plano.projects.push({
      id: uuidDe(`projeto:${p.id}`), company_id: existe(p.empresa_id) ? String(p.empresa_id) : null, name: String(p.nome),
      internal: Boolean(p.interno), stage: p.etapa ?? null, status: p.status ?? null, due_on: soData(p.data_entrega),
      production_url: p.url_producao ?? null, staging_url: p.url_staging ?? null, repository: p.repositorio ?? null,
      qa_checklist: Array.isArray(qa) ? qa : [], created_at: dataIso(p.criado_em) || new Date().toISOString(),
    });
  }
  for (const c of db.contrato) {
    if (!existe(c.empresa_id)) { rejeitados.push({ fonte: "sqlite.contrato", id: c.id, motivo: "empresa inexistente" }); continue; }
    let texto = null;
    if (c.arquivo) {
      const candidatos = [isAbsolute(c.arquivo) ? c.arquivo : join(vault, c.arquivo), join(vault, "40 Comercial", "Contratos", basename(c.arquivo))];
      const achado = candidatos.find((x) => existsSync(x));
      if (achado) texto = readFileSync(achado, "utf8");
      else avisos.push(`arquivo do contrato ${c.id} não encontrado (${c.arquivo})`);
    }
    plano.contracts.push({
      id: uuidDe(`contrato:${c.id}`), company_id: String(c.empresa_id), value: numero(c.valor), payment_type: c.tipo_pagamento ?? null,
      installments: numero(c.parcelas) > 0 ? Math.round(numero(c.parcelas)) : null, starts_on: soData(c.inicio),
      duration_months: numero(c.duracao_meses) > 0 ? Math.round(numero(c.duracao_meses)) : null,
      storage_path: null, content_markdown: texto, created_at: dataIso(c.criado_em) || new Date().toISOString(),
    });
  }
  for (const c of db.credencial) {
    if (!existe(c.empresa_id)) { rejeitados.push({ fonte: "sqlite.credencial", id: c.id, motivo: "empresa inexistente" }); continue; }
    if (vazio(c.senha_cifrada) || vazio(c.iv) || vazio(c.tag)) { rejeitados.push({ fonte: "sqlite.credencial", id: c.id, motivo: "cifra incompleta" }); continue; }
    plano.credentials.push({
      id: uuidDe(`credencial:${c.id}`), company_id: String(c.empresa_id), label: String(c.label), url: c.url ?? null,
      username: c.usuario ?? null, encrypted_password: String(c.senha_cifrada), encryption_iv: String(c.iv),
      encryption_tag: String(c.tag), notes: c.notas ?? null, created_at: dataIso(c.criado_em) || new Date().toISOString(),
      updated_at: dataIso(c.atualizado_em) || dataIso(c.criado_em) || new Date().toISOString(),
    });
  }
  for (const b of db.briefing) {
    if (vazio(b.token)) { rejeitados.push({ fonte: "sqlite.briefing", id: b.id, motivo: "sem token" }); continue; }
    let respostas = null;
    try { respostas = b.respostas ? JSON.parse(b.respostas) : null; } catch { avisos.push(`respostas ilegíveis no briefing ${b.id}`); }
    plano.briefings.push({
      id: uuidDe(`briefing:${b.id}`), company_id: existe(b.empresa_id) ? String(b.empresa_id) : null,
      token_hash: sha256(String(b.token)), token_version: 1, page_type: b.tipo_pagina ?? null, answers: respostas,
      submitted_at: dataIso(b.enviado_em), created_at: dataIso(b.criado_em) || new Date().toISOString(),
    });
  }
  for (const r of db.relatorio) {
    if (!existe(r.empresa_id)) { rejeitados.push({ fonte: "sqlite.relatorio", id: r.id, motivo: "empresa inexistente" }); continue; }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(r.mes))) { rejeitados.push({ fonte: "sqlite.relatorio", id: r.id, motivo: `mês inválido (${r.mes})` }); continue; }
    let conteudo = {};
    try { conteudo = r.conteudo ? JSON.parse(r.conteudo) : {}; } catch { avisos.push(`conteúdo ilegível no relatório ${r.id}`); }
    plano.reports.push({
      id: uuidDe(`relatorio:${r.id}`), kind: "mensal", slug: null, company_id: String(r.empresa_id), report_month: `${r.mes}-01`,
      content: conteudo, link_token_hash: r.link_token ? sha256(String(r.link_token)) : null, token_version: 1,
      generated_at: dataIso(r.gerado_em), sent_at: dataIso(objeto(conteudo).enviadoEm), published_at: null,
    });
  }

  // 5. Relatórios públicos de leads que estavam no repositório do site.
  const dirSite = op["site-relatorios"] && resolve(op["site-relatorios"]);
  const relSite = listar(dirSite, (f) => f.endsWith(".json"));
  conta("site.relatorios", relSite.length);
  for (const p of relSite) {
    const j = lerJson(p, avisos);
    if (!j) continue;
    const s = String(j.slug || basename(p, ".json"));
    if (!existe(s)) { rejeitados.push({ fonte: p, id: s, motivo: "relatório público sem lead de mesmo slug" }); continue; }
    const quando = soData(j.geradoEm) || new Date().toISOString().slice(0, 10);
    plano.reports.push({
      id: uuidDe(`relatorio-lead:${s}`), kind: "lead_publico", slug: s, company_id: s, report_month: `${quando.slice(0, 7)}-01`,
      content: j, link_token_hash: null, token_version: 1, generated_at: dataIso(quando), sent_at: null,
      published_at: new Date(statSync(p).mtimeMs).toISOString(),
    });
  }

  // 6. Análises de presença
  const analises = listar(join(vault, "SaaS", "Prospeccao", "analises"), (f) => f.endsWith(".json"));
  conta("vault.analises", analises.length);
  for (const p of analises) {
    const a = lerJson(p, avisos);
    if (!a) continue;
    const id = String(a.id || basename(p, ".json"));
    if (!existe(id)) { rejeitados.push({ fonte: relVault(vault, p), id, motivo: "análise de lead inexistente" }); continue; }
    const gerado = dataIso(a.geradoEm) || new Date(statSync(p).mtimeMs).toISOString();
    plano.lead_analyses.push({
      id: uuidDe(`analise:${id}:${gerado}`), company_id: id, score: Math.max(0, Math.min(100, Math.round(Number(a.pontuacao) || 0))),
      analysis: a, generated_at: gerado,
    });
  }

  // 7. Documentos do painel
  const docsVault = ["00 COMANDO.md", "01 Kanban.md", "10 INBOX.md", "20 BACKLOG.md", "60 Financeiro/Placar.md"]
    .map((k) => join(vault, k))
    .concat(listar(join(vault, "10 Agentes"), (f) => f.endsWith(".md")));
  for (const p of docsVault) {
    if (!existsSync(p)) { avisos.push(`documento ausente no vault: ${relVault(vault, p)}`); continue; }
    const key = relVault(vault, p);
    plano.workspace_documents.push({
      key, title: tituloDoDocumento(key), document_type: tipoDoDocumento(key), content_markdown: readFileSync(p, "utf8"),
      structured_data: {}, source_path: key, updated_at: new Date(statSync(p).mtimeMs).toISOString(),
    });
  }
  const cfgRel = join(vault, "SaaS", "Relatorio", "config.json");
  if (existsSync(cfgRel)) {
    const j = lerJson(cfgRel, avisos);
    if (j) plano.workspace_documents.push({
      key: "SaaS/Relatorio/config.json", title: "config", document_type: "config", content_markdown: "",
      structured_data: objeto(j), source_path: "SaaS/Relatorio/config.json", updated_at: new Date().toISOString(),
    });
  }
  const dirDocs = op.docs && resolve(op.docs);
  const docsRepo = listarRecursivo(dirDocs, (f) => f.endsWith(".md"));
  conta("repo.docs", docsRepo.length);
  for (const p of docsRepo) {
    const key = `docs/${relative(dirDocs, p).split(sep).join("/")}`;
    plano.workspace_documents.push({
      key, title: tituloDoDocumento(key), document_type: "doc", content_markdown: readFileSync(p, "utf8"),
      structured_data: {}, source_path: key, updated_at: new Date(statSync(p).mtimeMs).toISOString(),
    });
  }
  conta("vault.documentos", docsVault.length);

  // 8. Agenda
  const reunioes = listar(join(vault, "SaaS", "Agenda", "Reunioes"), (f) => f.endsWith(".md"));
  conta("vault.reunioes", reunioes.length);
  for (const p of reunioes) {
    const fm = frontmatter(readFileSync(p, "utf8"));
    const inicio = dataIso(fm.quando, { local: true });
    if (!inicio || !fm.titulo) { rejeitados.push({ fonte: relVault(vault, p), motivo: "reunião sem título ou data válida" }); continue; }
    const dur = Number(fm.duracao);
    plano.meetings.push({
      id: fm.id || basename(p, ".md"), title: fm.titulo, starts_at: inicio, duration_minutes: dur > 0 ? Math.round(dur) : 30,
      participant: fm.participante || null, created_at: dataIso(fm.criada_em) || new Date().toISOString(),
    });
  }

  // 9. Campanhas
  const campanhasP = join(vault, "SaaS", "Tráfego", "campanhas.json");
  const campanhas = existsSync(campanhasP) ? lerJson(campanhasP, avisos) || [] : [];
  conta("vault.campanhas", campanhas.length);
  for (const c of Array.isArray(campanhas) ? campanhas : []) {
    if (!c?.id || !c?.nome) { rejeitados.push({ fonte: "campanhas.json", motivo: "campanha sem id ou nome" }); continue; }
    plano.campaigns.push({
      id: String(c.id), name: String(c.nome), channel: String(c.canal || "outro"), investment: Number(c.investimento) || 0,
      clicks: Math.max(0, Math.round(Number(c.cliques) || 0)), conversions: Math.max(0, Math.round(Number(c.conversoes) || 0)),
      status: c.status === "pausada" ? "pausada" : "ativa", created_at: dataIso(c.criada) || new Date().toISOString(),
    });
  }

  // 10. Pixel
  const hitsP = join(vault, "SaaS", "Rastreamento", "hits.json");
  const hits = existsSync(hitsP) ? objeto(lerJson(hitsP, avisos)) : {};
  conta("vault.hits", Object.keys(hits).length);
  for (const [site, h] of Object.entries(hits)) {
    plano.tracking_sites.push({
      site_key: site, hit_count: Math.max(0, Math.round(Number(h?.n) || 0)), first_hit_at: dataIso(h?.primeiro), last_hit_at: dataIso(h?.ultimo),
    });
  }

  // 11. Financeiro: links (um JSON por cobrança) e webhooks recebidos
  const dirFin = join(vault, "SaaS", "Financeiro");
  const regs = listar(dirFin, (f) => f.endsWith(".json"));
  conta("vault.financeiro", regs.length);
  for (const p of regs) {
    const r = lerJson(p, avisos);
    if (!r?.id) { rejeitados.push({ fonte: relVault(vault, p), motivo: "cobrança sem id" }); continue; }
    plano.financial_transactions.push({
      id: String(r.id), company_id: r.cliente && existe(r.cliente) ? String(r.cliente) : null, provider: "infinitepay",
      provider_reference: r.order_nsu || null, kind: "link", status: r.paid ? "pago" : r.ok ? "pendente" : "erro",
      amount: Math.round((Number(r.valor) || 0) * (Number(r.quantidade) || 1) * 100) / 100, payment_url: r.url || null,
      payload: r, created_at: dataIso(r.data) || new Date(statSync(p).mtimeMs).toISOString(), updated_at: new Date().toISOString(),
    });
  }
  const whs = listar(join(dirFin, "webhooks"), (f) => f.endsWith(".json"));
  conta("vault.webhooks", whs.length);
  for (const p of whs) {
    const corpo = lerJson(p, avisos);
    if (!corpo) continue;
    const m = basename(p, ".json").match(/^(\d+)-(.+)$/);
    const chave = m && m[2] !== "semid" ? m[2] : "";
    plano.financial_transactions.push({
      id: chave ? `wh-${chave}` : `wh-semid-${m ? m[1] : sha256(p).slice(0, 12)}`, company_id: null,
      provider: "infinitepay-webhook", provider_reference: chave || null, kind: "webhook", status: "recebido",
      amount: null, payment_url: null, payload: corpo, created_at: m ? new Date(Number(m[1])).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // 12. Demandas e sala
  const demandas = listar(join(vault, "SaaS", "Agentes", "Demandas"), (f) => f.endsWith(".md"));
  conta("vault.demandas", demandas.length);
  for (const p of demandas) {
    const raw = readFileSync(p, "utf8");
    const fm = frontmatter(raw);
    if (!fm.titulo) { rejeitados.push({ fonte: relVault(vault, p), motivo: "demanda sem título" }); continue; }
    const mLog = raw.match(/^##\s+Log\s*$/m);
    let log = [];
    if (mLog) {
      const desde = raw.slice((mLog.index ?? 0) + mLog[0].length).replace(/^\r?\n/, "");
      const prox = desde.search(/^##\s/m);
      log = (prox === -1 ? desde : desde.slice(0, prox)).split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith("- ")).map((l) => l.slice(2));
    }
    const status = DEMANDA_STATUS.has(fm.status) ? fm.status : "fila";
    if (fm.status && !DEMANDA_STATUS.has(fm.status)) avisos.push(`demanda ${fm.id || basename(p)} com status desconhecido (${fm.status}), importada como fila`);
    plano.agent_demands.push({
      id: fm.id || basename(p, ".md"), title: fm.titulo, persona: fm.persona || "orion", status, origin: fm.origem || null,
      due_at: /^\d{4}-\d{2}-\d{2}$/.test(fm.prazo || "") ? `${fm.prazo}T23:59:59-03:00` : null,
      content_markdown: `## Log\n${log.map((l) => `- ${l}`).join("\n")}${log.length ? "\n" : ""}`,
      metadata: {
        criada_em: fm.criada_em || "", iniciada_em: fm.iniciada_em || "", concluida_em: fm.concluida_em || "", prazo: fm.prazo || "",
        cliente: fm.cliente || "", projeto: fm.projeto || "", briefing: fm.briefing || "", log,
      },
      created_at: dataIso(fm.criada_em) || new Date().toISOString(), updated_at: new Date().toISOString(),
    });
  }
  const salaP = op.sala && resolve(op.sala);
  const sala = salaP && existsSync(salaP) ? lerJson(salaP, avisos) || [] : [];
  if (op.sala && !existsSync(salaP)) avisos.push(`sala não encontrada: ${salaP}`);
  conta("sala", Array.isArray(sala) ? sala.length : 0);
  for (const m of Array.isArray(sala) ? sala : []) {
    if (!m?.texto) continue;
    plano.agent_messages.push({ demand_id: null, sender: String(m.de || "orquestra"), recipient: m.para || null, body: String(m.texto), created_at: dataIso(m.quando) || new Date().toISOString() });
  }

  // 13. Saúde dos sites: uma linha por verificação, id estável por site e data.
  const saude = listar(join(vault, "SaaS", "Saude"), (f) => f.endsWith(".json"));
  conta("vault.saude", saude.length);
  for (const p of saude) {
    const o = objeto(lerJson(p, avisos));
    const s = String(o.slug || basename(p, ".json"));
    const quando = dataIso(o.verificado_em) || new Date(statSync(p).mtimeMs).toISOString();
    const alerta = o.no_ar === false || o.formulario === "falha" || (typeof o.certificado_dias === "number" && o.certificado_dias <= 14);
    plano.health_alerts.push({
      id: uuidDe(`saude:${s}:${quando}`), alert_key: s, severity: alerta ? "alerta" : "ok", title: String(o.cliente || s),
      details: { ...o, slug: s }, observed_at: quando, resolved_at: null,
    });
  }

  // 14. Estado do prospector (a execução saiu da plataforma; o histórico fica guardado).
  const dirProsp = join(vault, "SaaS", "Prospeccao");
  const leva = existsSync(join(dirProsp, "ultima-leva.json")) ? lerJson(join(dirProsp, "ultima-leva.json"), avisos) : null;
  const rotacao = existsSync(join(dirProsp, "rotacao-brasil.json")) ? lerJson(join(dirProsp, "rotacao-brasil.json"), avisos) : null;
  if (leva || rotacao) {
    const l = objeto(leva);
    plano.prospector_runs.push({
      id: uuidDe("prospector:legado"), niche: l.nicho || null, city: null, region: l.regiao || null, fronts: Array.isArray(l.frentes) ? l.frentes : [],
      status: "importado", summary: l, rotation_state: objeto(rotacao), started_at: dataIso(l.quando || l.geradoEm) || new Date().toISOString(), finished_at: null,
    });
  }

  // 15. Arquivos enviados (ARQUIVOS_DIR): caminho opaco pelo SHA-256 do conteúdo.
  const dirArq = op.arquivos && resolve(op.arquivos);
  const arquivos = listar(dirArq, () => true);
  conta("arquivos", arquivos.length);
  const bucket = op.bucket || process.env.SUPABASE_STORAGE_BUCKET || "plataforma-arquivos";
  const nomesVistos = new Set();
  for (const p of arquivos) {
    const nome = basename(p);
    if (nomesVistos.has(nome)) avisos.push(`nome de arquivo repetido: ${nome}`);
    nomesVistos.add(nome);
    const bytes = readFileSync(p);
    const soma = sha256(bytes);
    plano.stored_files.push({
      bucket, object_path: `importado/${soma}`, original_name: nome, mime_type: mimeFor(nome), size_bytes: bytes.length,
      checksum_sha256: soma, created_at: new Date(statSync(p).mtimeMs).toISOString(), updated_at: new Date(statSync(p).mtimeMs).toISOString(),
      _local: p,
    });
  }

  for (const [id, n] of idsVistos) if (n > 1) avisos.push(`id duplicado no SQLite: ${id}`);
  return { vault, plano, fontes, conflitos, rejeitados, avisos, bucket };
}

const MIME = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
  pdf: "application/pdf", csv: "text/csv", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword", txt: "text/plain", md: "text/markdown", json: "application/json", zip: "application/zip",
  mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg", wav: "audio/wav",
};
function mimeFor(nome) {
  const i = nome.lastIndexOf(".");
  return MIME[i > 0 ? nome.slice(i + 1).toLowerCase() : ""] || "application/octet-stream";
}

// ---------- resumo sem segredos ----------
const SENSIVEIS = new Set(["encrypted_password", "encryption_iv", "encryption_tag", "token", "token_hash", "link_token", "link_token_hash", "_local"]);
function semSegredo(linha) {
  const out = {};
  for (const [k, v] of Object.entries(linha)) out[k] = SENSIVEIS.has(k) ? (v == null ? null : "[oculto]") : v;
  return out;
}

function resumo(r) {
  const totais = Object.fromEntries(Object.entries(r.plano).map(([t, l]) => [t, l.length]));
  const somaFin = r.plano.financial_transactions.filter((t) => t.kind === "link" && t.status === "pago").reduce((s, t) => s + (t.amount || 0), 0);
  return { totais, somaPagaFinanceiro: Math.round(somaFin * 100) / 100, conflitos: r.conflitos.length, rejeitados: r.rejeitados.length, avisos: r.avisos.length };
}

// ---------- Supabase ----------
async function conectar() {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ex.: node --env-file=.env.local ...)");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, chave, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
}

function checar(r, contexto) {
  if (r.error) throw new Error(`${contexto}: ${r.error.message}`);
  return r.data;
}

async function upsertLotes(sb, tabela, linhas, onConflict) {
  for (let i = 0; i < linhas.length; i += LOTE) {
    const lote = linhas.slice(i, i + LOTE).map(({ _local, ...l }) => l);
    checar(await sb.from(tabela).upsert(lote, { onConflict }), `upsert ${tabela}`);
  }
}

// Tabelas sem chave natural (identity): só entram se o destino ainda estiver vazio para aquela empresa.
async function inserirMovimentos(sb, movs) {
  const porEmpresa = new Map();
  for (const m of movs) (porEmpresa.get(m.company_id) || porEmpresa.set(m.company_id, []).get(m.company_id)).push(m);
  let inseridos = 0;
  for (const [id, lista] of porEmpresa) {
    const { count, error } = await sb.from("lead_movements").select("id", { count: "exact", head: true }).eq("company_id", id);
    if (error) throw new Error(`contar movimentações: ${error.message}`);
    if ((count || 0) > 0) continue;
    checar(await sb.from("lead_movements").insert(lista), "inserir movimentações");
    inseridos += lista.length;
  }
  return inseridos;
}

async function inserirSala(sb, msgs) {
  if (!msgs.length) return 0;
  const { count, error } = await sb.from("agent_messages").select("id", { count: "exact", head: true }).is("demand_id", null);
  if (error) throw new Error(`contar sala: ${error.message}`);
  if ((count || 0) > 0) return 0;
  const ordenadas = [...msgs].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (let i = 0; i < ordenadas.length; i += LOTE) checar(await sb.from("agent_messages").insert(ordenadas.slice(i, i + LOTE)), "inserir sala");
  return ordenadas.length;
}

// Relatórios mensais têm índice único parcial (company_id, report_month); o
// PostgREST não usa índice parcial em onConflict, então o id estável resolve.
async function aplicar(r) {
  const sb = await conectar();
  const p = r.plano;
  const feito = {};
  const passo = async (tabela, fn) => {
    process.stdout.write(`  ${tabela.padEnd(24)}`);
    feito[tabela] = await fn();
    console.log(String(feito[tabela]));
  };
  // ordem respeita as chaves estrangeiras
  await passo("companies", async () => (await upsertLotes(sb, "companies", p.companies, "id"), p.companies.length));
  await passo("contacts", async () => (await upsertLotes(sb, "contacts", p.contacts, "id"), p.contacts.length));
  await passo("lead_movements", () => inserirMovimentos(sb, p.lead_movements));
  await passo("opportunities", async () => (await upsertLotes(sb, "opportunities", p.opportunities, "id"), p.opportunities.length));
  await passo("projects", async () => (await upsertLotes(sb, "projects", p.projects, "id"), p.projects.length));
  await passo("contracts", async () => (await upsertLotes(sb, "contracts", p.contracts, "id"), p.contracts.length));
  await passo("credentials", async () => (await upsertLotes(sb, "credentials", p.credentials, "id"), p.credentials.length));
  await passo("briefings", async () => (await upsertLotes(sb, "briefings", p.briefings, "id"), p.briefings.length));
  await passo("reports", async () => (await upsertLotes(sb, "reports", p.reports, "id"), p.reports.length));
  await passo("lead_analyses", async () => (await upsertLotes(sb, "lead_analyses", p.lead_analyses, "id"), p.lead_analyses.length));
  await passo("workspace_documents", async () => (await upsertLotes(sb, "workspace_documents", p.workspace_documents, "key"), p.workspace_documents.length));
  await passo("meetings", async () => (await upsertLotes(sb, "meetings", p.meetings, "id"), p.meetings.length));
  await passo("campaigns", async () => (await upsertLotes(sb, "campaigns", p.campaigns, "id"), p.campaigns.length));
  await passo("tracking_sites", async () => (await upsertLotes(sb, "tracking_sites", p.tracking_sites, "site_key"), p.tracking_sites.length));
  await passo("financial_transactions", async () => (await upsertLotes(sb, "financial_transactions", p.financial_transactions, "id"), p.financial_transactions.length));
  await passo("agent_demands", async () => (await upsertLotes(sb, "agent_demands", p.agent_demands, "id"), p.agent_demands.length));
  await passo("agent_messages", () => inserirSala(sb, p.agent_messages));
  await passo("health_alerts", async () => (await upsertLotes(sb, "health_alerts", p.health_alerts, "id"), p.health_alerts.length));
  await passo("prospector_runs", async () => (await upsertLotes(sb, "prospector_runs", p.prospector_runs, "id"), p.prospector_runs.length));
  await passo("stored_files", async () => {
    let enviados = 0;
    for (const f of p.stored_files) {
      const up = await sb.storage.from(f.bucket).upload(f.object_path, readFileSync(f._local), { contentType: f.mime_type, upsert: true });
      if (up.error) throw new Error(`enviar ${f.original_name}: ${up.error.message}`);
      enviados++;
    }
    await upsertLotes(sb, "stored_files", p.stored_files, "object_path");
    return enviados;
  });
  return feito;
}

// ---------- verificação ----------
const CHAVE = { workspace_documents: "key", tracking_sites: "site_key", stored_files: "object_path" };
const SEM_CHAVE = new Set(["lead_movements", "agent_messages"]);

async function verificar(r) {
  const sb = await conectar();
  const falhas = [];
  for (const [tabela, linhas] of Object.entries(r.plano)) {
    if (!linhas.length) continue;
    if (SEM_CHAVE.has(tabela)) {
      const { count, error } = await sb.from(tabela).select("*", { count: "exact", head: true });
      if (error) falhas.push(`${tabela}: ${error.message}`);
      else if ((count || 0) < linhas.length) falhas.push(`${tabela}: esperado ao menos ${linhas.length}, banco tem ${count}`);
      continue;
    }
    const chave = CHAVE[tabela] || "id";
    const ids = linhas.map((l) => l[chave]);
    const achados = new Set();
    for (let i = 0; i < ids.length; i += LOTE) {
      const res = await sb.from(tabela).select(chave).in(chave, ids.slice(i, i + LOTE));
      if (res.error) { falhas.push(`${tabela}: ${res.error.message}`); break; }
      for (const l of res.data) achados.add(String(l[chave]));
    }
    const faltando = ids.filter((id) => !achados.has(String(id)));
    if (faltando.length) falhas.push(`${tabela}: ${faltando.length} de ${ids.length} ausentes (ex.: ${faltando.slice(0, 3).join(", ")})`);
  }
  // soma financeira dos links pagos
  const esperado = resumo(r).somaPagaFinanceiro;
  const fin = await sb.from("financial_transactions").select("amount").eq("kind", "link").eq("status", "pago");
  if (fin.error) falhas.push(`financeiro: ${fin.error.message}`);
  else {
    const soma = Math.round(fin.data.reduce((s, l) => s + Number(l.amount || 0), 0) * 100) / 100;
    if (soma + 0.005 < esperado) falhas.push(`financeiro: soma paga no banco ${soma} menor que a do legado ${esperado}`);
  }
  // checksums dos arquivos
  for (const f of r.plano.stored_files) {
    const d = await sb.storage.from(f.bucket).download(f.object_path);
    if (d.error) { falhas.push(`arquivo ${f.original_name}: ${d.error.message}`); continue; }
    const soma = sha256(Buffer.from(await d.data.arrayBuffer()));
    if (soma !== f.checksum_sha256) falhas.push(`arquivo ${f.original_name}: checksum diferente`);
  }
  // amostra de conteúdo: nome e estágio de até 10 empresas
  const amostra = r.plano.companies.slice(0, 10);
  if (amostra.length) {
    const res = await sb.from("companies").select("id, name, crm_stage").in("id", amostra.map((e) => e.id));
    if (!res.error) {
      const mapa = new Map(res.data.map((l) => [l.id, l]));
      for (const e of amostra) {
        const l = mapa.get(e.id);
        if (l && (l.name !== e.name || l.crm_stage !== e.crm_stage)) falhas.push(`companies ${e.id}: nome ou estágio diferente do legado`);
      }
    }
  }
  return falhas;
}

// ---------- principal ----------
async function principal() {
  const { modo, op } = lerArgs(process.argv.slice(2));
  if (!MODOS.includes(modo)) ajuda(modo ? `modo desconhecido: ${modo}` : "informe o modo");
  if (!op.vault) ajuda("--vault é obrigatório");
  if (!existsSync(op.vault)) ajuda(`vault não encontrado: ${op.vault}`);

  const r = await montarPlano(op);
  const res = resumo(r);
  const manifesto = {
    importador: VERSAO, modo, quando: new Date().toISOString(),
    fontes: { vault: r.vault, sqlite: op.sqlite || null, arquivos: op.arquivos || null, docs: op.docs || null, sala: op.sala || null, siteRelatorios: op["site-relatorios"] || null },
    lidos: r.fontes, ...res,
  };

  console.log(`importador ${VERSAO} · modo ${modo}`);
  console.log("fontes lidas:", JSON.stringify(r.fontes));
  console.log("plano por tabela:", JSON.stringify(res.totais));
  console.log(`conflitos ${r.conflitos.length} · rejeitados ${r.rejeitados.length} · avisos ${r.avisos.length}`);
  for (const a of r.avisos.slice(0, 30)) console.log(`  aviso: ${a}`);
  for (const x of r.rejeitados.slice(0, 30)) console.log(`  rejeitado: ${x.fonte}${x.id ? ` (${x.id})` : ""}: ${x.motivo}`);

  if (modo === "scan") return 0;

  if (modo === "dry-run") {
    const saida = op.saida || "importacao-dry-run.json";
    const auditoria = {
      manifesto,
      conflitos: r.conflitos,
      rejeitados: r.rejeitados,
      avisos: r.avisos,
      plano: Object.fromEntries(Object.entries(r.plano).map(([t, l]) => [t, l.map(semSegredo)])),
    };
    writeFileSync(saida, JSON.stringify(auditoria, null, 2));
    console.log(`auditoria gravada em ${saida} (sem segredos; guarde fora do git, contém dados de clientes)`);
    return 0;
  }

  if (modo === "apply") {
    console.log("gravando no Supabase:");
    manifesto.gravados = await aplicar(r);
    const saida = op.saida || "importacao-manifesto.json";
    writeFileSync(saida, JSON.stringify(manifesto, null, 2));
    console.log(`manifesto gravado em ${saida}`);
    return 0;
  }

  const falhas = await verificar(r);
  if (falhas.length) {
    console.error(`verify falhou (${falhas.length}):`);
    for (const f of falhas) console.error(`  ✗ ${f}`);
    return 1;
  }
  console.log("verify ok: IDs, soma financeira, checksums e amostra conferem.");
  return 0;
}

principal().then(
  (code) => process.exit(code),
  (e) => {
    console.error(`erro: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  },
);
