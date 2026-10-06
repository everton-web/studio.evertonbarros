// InfinitePay: criação de link, consulta de status e webhook com placar automático.
// Docs: https://www.infinitepay.io/checkout-documentacao
// A persistência fica em src/lib/data/financeiro.ts (Supabase).
import { randomBytes } from "node:crypto";
import {
  acharRegistro as acharNoBanco,
  atualizarPlacar,
  lerHistorico,
  lerRegistrosCliente,
  registrarWebhook,
  salvarRegistro,
  type Registro,
} from "./data/financeiro";

export { lerHistorico, lerRegistrosCliente, type Registro };

export const HANDLE = process.env.INFINITEPAY_HANDLE || "";
export const REDIRECT = process.env.INFINITEPAY_REDIRECT_URL || "";
export const WEBHOOK_URL = process.env.INFINITEPAY_WEBHOOK_URL || "https://app.evertonbrito.com/api/infinitepay/webhook";
const API_LINKS = "https://api.checkout.infinitepay.io/links";
const API_CHECK = "https://api.checkout.infinitepay.io/payment_check";

export function gerarOrderNsu() {
  return `ag-${Date.now().toString(36)}-${randomBytes(10).toString("hex")}`;
}

export async function criarLink(op: {
  cliente?: string; vencimento?: string; tipo?: "projeto" | "recorrencia";
  descricao: string; valor: number; quantidade?: number;
  order_nsu?: string; customer?: { nome?: string; email?: string; telefone?: string };
}): Promise<Registro> {
  const payload: Record<string, unknown> = {
    handle: HANDLE,
    items: [{ quantity: Math.max(1, Math.min(999, op.quantidade || 1)), price: Math.round(op.valor * 100), description: op.descricao }],
    order_nsu: op.order_nsu || gerarOrderNsu(),
    webhook_url: WEBHOOK_URL,
  };
  if (REDIRECT) payload.redirect_url = REDIRECT;
  if (op.customer && (op.customer.nome || op.customer.email || op.customer.telefone)) {
    payload.customer = {
      name: op.customer.nome || "",
      email: op.customer.email || "",
      phone_number: op.customer.telefone || "",
    };
  }

  const registro: Registro = {
    id: `${Date.now()}-${randomBytes(8).toString("hex")}`,
    data: new Date().toLocaleString("pt-BR", { timeZone: "America/Bahia" }),
    descricao: op.descricao,
    valor: Math.round(op.valor * 100) / 100,
    quantidade: Math.max(1, Math.min(999, op.quantidade || 1)),
    url: null,
    handle: HANDLE,
    ok: false,
    order_nsu: payload.order_nsu as string,
  };
  if (op.cliente) registro.cliente = op.cliente;
  if (op.tipo === "recorrencia") registro.tipo = "recorrencia";
  if (op.vencimento && /^\d{4}-\d{2}-\d{2}$/.test(op.vencimento)) registro.vencimento = op.vencimento;

  try {
    const res = await fetch(API_LINKS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const txt = await res.text();
    const json = txt ? JSON.parse(txt) : {};
    const url = json?.link_url || json?.url || json?.checkout_url || json?.payment_url || json?.data?.url || null;
    registro.ok = res.ok || !!url;
    registro.url = typeof url === "string" ? url : null;
    registro.slug = typeof json?.slug === "string" ? json.slug : undefined;
    registro.erro = !registro.ok ? (json?.message || json?.error || `HTTP ${res.status}: ${txt.slice(0, 200)}`) : undefined;
  } catch (e: unknown) {
    registro.erro = `Falha ao falar com a InfinitePay: ${e instanceof Error ? e.message : String(e)}`;
  }
  await salvarRegistro(registro);
  return registro;
}

type StatusPagamento = {
  success?: boolean;
  paid?: boolean;
  amount?: number;
  paid_amount?: number;
  capture_method?: string;
};

export async function consultarStatus(
  r: Registro,
  identificadores: { transaction_nsu?: string; slug?: string } = {},
): Promise<StatusPagamento> {
  const body = {
    handle: r.handle,
    order_nsu: r.order_nsu,
    transaction_nsu: identificadores.transaction_nsu || "",
    slug: identificadores.slug || r.slug || "",
  };
  const res = await fetch(API_CHECK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const json = (await res.json().catch(() => ({}))) as StatusPagamento;
  if (!res.ok) throw new Error(`payment_check recusou a consulta: HTTP ${res.status}`);
  return json;
}

export async function acharRegistro(chave: string): Promise<{ r: Registro } | null> {
  const r = await acharNoBanco(chave);
  return r ? { r } : null;
}

// Webhook da InfinitePay (pagamento aprovado): grava, marca pago e soma no placar.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processarWebhook(body: any): Promise<{ novidade: boolean; registro?: Registro }> {
  const orderNsu = String(body?.order_nsu || "");
  const tx = String(body?.transaction_nsu || "");
  if (!orderNsu) return { novidade: false };
  const r = await acharNoBanco(orderNsu);
  if (!r) return { novidade: false }; // webhook de pedido que não criamos: ignora

  const status = await consultarStatus(r, {
    transaction_nsu: tx,
    slug: String(body?.invoice_slug || r.slug || ""),
  });
  if (status.success !== true || status.paid !== true) {
    throw new Error("pagamento nao confirmado pelo payment_check");
  }

  // A idempotencia so e registrada depois da confirmacao no provedor. Assim,
  // um payload falso nao bloqueia uma notificacao legitima posterior.
  const chave = (tx || `order-${orderNsu}`).replace(/[^\w.\-]/g, "");
  const nova = await registrarWebhook(chave, body);
  if (!nova) return { novidade: false };

  const amount = Number(status.paid_amount || status.amount) / 100;
  const jaPago = !!r.paid;
  r.paid = true;
  r.paidAt = new Date().toLocaleString("pt-BR", { timeZone: "America/Bahia" });
  r.capture_method = String(status.capture_method || body?.capture_method || "");
  r.slug = r.slug || String(body?.invoice_slug || "");
  await salvarRegistro(r);

  if (!jaPago && amount > 0) await atualizarPlacar(amount);
  return { novidade: !jaPago, registro: r };
}
