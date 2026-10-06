// Formatação de datas e valores para a tela, em pt-BR e sem dado técnico.
// Sem imports de servidor: pode ser usado nos componentes de cliente.

// Aceita "YYYY-MM-DD", "YYYY-MM" e ISO completo. Data sem hora entra como data local.
function paraData(valor: string): { data: Date; soMes: boolean } | null {
  if (!valor) return null;
  const ym = valor.match(/^(\d{4})-(\d{2})$/);
  if (ym) return { data: new Date(Number(ym[1]), Number(ym[2]) - 1, 1), soMes: true };
  const ymd = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return { data: new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])), soMes: false };
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : { data: d, soMes: false };
}

// "29 de setembro de 2026" ou, quando só há o mês, "setembro de 2026".
export function dataLonga(valor: string | null | undefined): string {
  const p = paraData(valor || "");
  if (!p) return "";
  return p.soMes
    ? p.data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : p.data.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

// "29 de set" (curta, para listas).
export function dataCurta(valor: string | null | undefined): string {
  const p = paraData(valor || "");
  if (!p) return "";
  return p.data.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
}

// "há 5 min", "há 2h", "há 3 dias"; passado de um mês vira a data longa.
export function relativo(valor: string | null | undefined): string {
  const p = paraData(valor || "");
  if (!p) return "";
  const min = Math.max(0, Math.round((Date.now() - p.data.getTime()) / 60000));
  if (min < 1) return "agora há pouco";
  if (min < 60) return `há ${min} min`;
  if (min < 1440) return `há ${Math.round(min / 60)}h`;
  const dias = Math.round(min / 1440);
  if (dias === 1) return "há 1 dia";
  if (dias <= 30) return `há ${dias} dias`;
  return dataLonga(valor);
}

// "R$ 1.997" ou "R$ 1.997,50".
export function brl(v: number): string {
  const inteiro = Math.abs(v - Math.round(v)) < 0.005;
  return "R$ " + v.toLocaleString("pt-BR", {
    minimumFractionDigits: inteiro ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

// Aceita "R$ 1.997", "1997", "1.997,50", "1997.5". Devolve null se não houver número.
export function lerValor(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const m = texto.match(/\d[\d.,]*/);
  if (!m) return null;
  let s = m[0];
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{3}(\.|$)/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "https://www.exemplo.com.br/x" -> "exemplo.com.br"
export function hostDoSite(site: string | null | undefined): string {
  if (!site) return "";
  return site
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[/?#]/)[0]
    .toLowerCase();
}
