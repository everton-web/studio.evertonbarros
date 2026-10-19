// Fonte única da lógica de data/preço da promoção do mês (outubro: Esquenta Black Friday).
// Usado tanto no servidor quanto no cliente.

// Liga/desliga a promoção do mês sem depender da data (desligada em 02/10 a pedido do Everton).
export const PROMO_LIGADA = false;

export const PROMO_FIM = new Date("2026-10-31T23:59:59-03:00");

export function promoAtiva(now: Date = new Date()): boolean {
  return PROMO_LIGADA && now.getTime() < PROMO_FIM.getTime();
}

export function precoComDesconto(preco: number): number {
  // 50% OFF, arredondado para baixo até terminar em 7 (1.997 vira 997)
  const metade = Math.floor(preco * 0.5);
  return Math.floor((metade - 7) / 10) * 10 + 7;
}

export function formatBRL(valor: number): string {
  return "R$ " + valor.toLocaleString("pt-BR");
}
