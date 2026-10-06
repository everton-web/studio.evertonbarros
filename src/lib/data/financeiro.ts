// Cobranças InfinitePay e webhooks em financial_transactions; placar em
// workspace_documents ("60 Financeiro/Placar.md").
//   kind = "link":    um registro por link criado (id do registro, order_nsu em provider_reference)
//   kind = "webhook": um registro por notificação recebida (id "wh-<chave>"), garante idempotência
import { agoraIso, dados, objeto, supabase, type Linha } from "./client";
import { DOC, gravarMarkdown, lerMarkdown } from "./documentos";

export type Registro = {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  quantidade: number;
  url: string | null;
  handle: string;
  ok: boolean;
  erro?: string;
  order_nsu?: string;
  slug?: string;
  paid?: boolean;
  paidAt?: string;
  capture_method?: string;
  cliente?: string; // empresa.id
  vencimento?: string; // YYYY-MM-DD, opcional
  tipo?: "projeto" | "recorrencia"; // sem tipo conta como projeto
};

const PROVEDOR = "infinitepay";

function registroDaLinha(l: Linha): Registro {
  return objeto(l.payload) as unknown as Registro;
}

async function empresaExiste(id: string): Promise<boolean> {
  const r = await supabase().from("companies").select("id").eq("id", id).maybeSingle();
  return !!dados<Linha | null>(r, "conferir empresa");
}

export async function salvarRegistro(r: Registro): Promise<void> {
  const status = r.paid ? "pago" : r.ok ? "pendente" : "erro";
  const linha = {
    id: r.id,
    company_id: r.cliente && (await empresaExiste(r.cliente)) ? r.cliente : null,
    provider: PROVEDOR,
    provider_reference: r.order_nsu || null,
    kind: "link",
    status,
    amount: Math.round(r.valor * (r.quantidade || 1) * 100) / 100,
    payment_url: r.url,
    payload: r,
    updated_at: agoraIso(),
  };
  dados(await supabase().from("financial_transactions").upsert(linha, { onConflict: "id" }), "salvar cobrança");
}

// Últimos 30 links criados, do mais novo para o mais antigo.
export async function lerHistorico(): Promise<Registro[]> {
  const r = await supabase()
    .from("financial_transactions")
    .select("payload")
    .eq("kind", "link")
    .not("provider_reference", "is", null)
    .order("created_at", { ascending: false })
    .limit(30);
  return (dados<Linha[]>(r, "ler histórico") ?? []).map(registroDaLinha);
}

// Todas as cobranças de um cliente.
export async function lerRegistrosCliente(empresaId: string): Promise<Registro[]> {
  const r = await supabase()
    .from("financial_transactions")
    .select("payload")
    .eq("kind", "link")
    .eq("payload->>cliente", empresaId)
    .not("provider_reference", "is", null);
  return (dados<Linha[]>(r, "ler cobranças do cliente") ?? []).map(registroDaLinha);
}

export async function acharRegistro(chave: string): Promise<Registro | null> {
  if (!chave) return null;
  const porRef = await supabase()
    .from("financial_transactions")
    .select("payload")
    .eq("kind", "link")
    .eq("provider", PROVEDOR)
    .eq("provider_reference", chave)
    .limit(1)
    .maybeSingle();
  const l = dados<Linha | null>(porRef, "achar cobrança");
  if (l) return registroDaLinha(l);
  const porSlug = await supabase().from("financial_transactions").select("payload").eq("kind", "link").eq("payload->>slug", chave).limit(1).maybeSingle();
  const s = dados<Linha | null>(porSlug, "achar cobrança por slug");
  return s ? registroDaLinha(s) : null;
}

// Grava a notificação. Devolve false se a mesma chave já tinha chegado.
export async function registrarWebhook(chave: string, corpo: unknown): Promise<boolean> {
  const id = chave ? `wh-${chave}` : `wh-semid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const r = await supabase()
    .from("financial_transactions")
    .upsert(
      {
        id,
        provider: `${PROVEDOR}-webhook`,
        provider_reference: chave || null,
        kind: "webhook",
        status: "recebido",
        payload: corpo ?? {},
      },
      { onConflict: "id", ignoreDuplicates: true },
    )
    .select("id");
  return (dados<Linha[]>(r, "registrar webhook") ?? []).length > 0;
}

// Placar.md: soma ao acumulado do mês e atualiza a linha de progresso.
export async function atualizarPlacar(valor: number): Promise<void> {
  let md = await lerMarkdown(DOC.placar);
  if (!md) return;
  const metaM = md.match(/R\$\s*([\d.]+)\s*\/\s*R\$\s*([\d.]+)\)/);
  const meta = metaM ? Number(metaM[2].replace(/\./g, "")) : 100000;
  const atualM = md.match(/Progresso:\*\*\s*[\d.,]+%\s*\(R\$\s*([\d.]+)/i);
  const atual = atualM ? Number(atualM[1].replace(/\./g, "")) : 0;
  const novo = atual + Math.round(valor);
  const pct = Math.min(100, Math.round((novo / meta) * 1000) / 10);
  md = md.replace(
    /(Progresso:\*\*\s*)[\d.,]+%\s*\(R\$\s*[\d.]+(\s*\/\s*R\$\s*[\d.]+)\)/i,
    `$1${String(pct).replace(".", ",")}% (R$ ${novo.toLocaleString("pt-BR")}$2)`,
  );
  // linha do mês atual no Resumo (set/2026): atualiza Total e Acumulado
  const mes = new Date().toLocaleDateString("pt-BR", { month: "short", timeZone: "America/Bahia" }) + "/" + new Date().getFullYear();
  const mesKey = mes.replace(".", "").toLowerCase();
  const rowRe = new RegExp(`(\\|\\s*${mesKey}\\s*\\|\\s*R\\$ [\\d.]+\\s*\\|\\s*R\\$ [\\d.]+\\s*\\|\\s*)R\\$ [\\d.]+(\\s*\\|\\s*)R\\$ [\\d.]+(\\s*\\|)`);
  if (rowRe.test(md)) md = md.replace(rowRe, `$1R$ ${novo.toLocaleString("pt-BR")}$2R$ ${novo.toLocaleString("pt-BR")}$3`);
  await gravarMarkdown(DOC.placar, md);
}
