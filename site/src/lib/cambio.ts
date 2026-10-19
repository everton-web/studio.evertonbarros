// Cotação USD/BRL ao vivo para a versão em inglês do site.
// Preço em dólar = preço em real / cotação × (1 + TAXA_INTERNACIONAL), arredondado para cima terminando em 7.

// Custos de receber do exterior embutidos no preço: taxa da plataforma de recebimento
// (PayPal/Wise, ~4,5%) + spread de câmbio (~2,5%). Ajuste aqui se mudar de plataforma.
export const TAXA_INTERNACIONAL = 0.07;

const CACHE = "cotacao-usd-brl";
const VALIDADE_MS = 30 * 60 * 1000;

export type Cotacao = { brlPorUsd: number; quando: number };

async function awesome(): Promise<number> {
  const r = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL", { cache: "no-store" });
  const j = await r.json();
  const v = Number(j?.USDBRL?.ask);
  if (!v) throw new Error("awesomeapi sem valor");
  return v;
}

async function erApi(): Promise<number> {
  const r = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
  const j = await r.json();
  const v = Number(j?.rates?.BRL);
  if (!v) throw new Error("er-api sem valor");
  return v;
}

export async function buscarCotacao(): Promise<Cotacao> {
  try {
    const salvo = JSON.parse(sessionStorage.getItem(CACHE) || "null") as Cotacao | null;
    if (salvo && Date.now() - salvo.quando < VALIDADE_MS) return salvo;
  } catch { /* sem storage: segue para a rede */ }

  let brlPorUsd: number;
  try { brlPorUsd = await awesome(); } catch { brlPorUsd = await erApi(); }
  const c = { brlPorUsd, quando: Date.now() };
  try { sessionStorage.setItem(CACHE, JSON.stringify(c)); } catch { /* ignora */ }
  return c;
}

export function brlParaUsd(brl: number, brlPorUsd: number): number {
  const bruto = (brl / brlPorUsd) * (1 + TAXA_INTERNACIONAL);
  return Math.ceil((bruto - 7) / 10) * 10 + 7; // mantém o final 7 dos preços em real
}

export function formatUSD(valor: number): string {
  return "US$ " + valor.toLocaleString("en-US");
}
