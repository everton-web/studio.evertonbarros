// funil de conversão da prospecção (função pura sobre a lista de leads)
export type LeadConversao = {
  estagio: number;
  status: string;
  contatadoEm: string; // YYYY-MM-DD ou ""
  respondeuEm: string; // YYYY-MM-DD ou ""
  desfecho: string; // "" | "sem-interesse" | "sem-resposta"
  desfechoEm: string;
};

export type JanelaConversao = 7 | 30 | "tudo";

export type ResultadoConversao = {
  contatados: number;
  responderam: number;
  interessados: number;
  fechados: number;
  semResposta: number;
  semInteresse: number;
  pctResposta: number;
  pctInteresse: number;
  pctFechamento: number;
  pctSemResposta: number;
  pctSemInteresse: number;
};

function dentroDaJanela(data: string, janela: number): boolean {
  if (!data) return false;
  const d = new Date(data + "T00:00:00");
  if (Number.isNaN(d.getTime())) return false;
  const agora = new Date();
  const limite = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - janela + 1);
  return d >= limite;
}

export function calcularConversao(leads: LeadConversao[], janela: JanelaConversao = "tudo"): ResultadoConversao {
  const base = leads.filter((l) => l.contatadoEm && (janela === "tudo" || dentroDaJanela(l.contatadoEm, janela)));
  const contatados = base.length;
  const responderam = base.filter((l) => l.respondeuEm).length;
  const interessados = base.filter((l) => l.estagio >= 3).length;
  const fechados = base.filter((l) => l.estagio === 5).length;
  const semResposta = base.filter((l) => l.desfecho === "sem-resposta").length;
  const semInteresse = base.filter((l) => l.desfecho === "sem-interesse").length;
  const pct = (n: number) => (contatados > 0 ? Math.round((n / contatados) * 100) : 0);
  return {
    contatados, responderam, interessados, fechados, semResposta, semInteresse,
    pctResposta: pct(responderam),
    pctInteresse: pct(interessados),
    pctFechamento: pct(fechados),
    pctSemResposta: pct(semResposta),
    pctSemInteresse: pct(semInteresse),
  };
}
