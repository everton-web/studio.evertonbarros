// Mensagens de WhatsApp da operação — textos + montagem.
// Fonte: docs/demandas/2026-09-28/mensagens-whatsapp.md (script Junior Lima, tom da casa).
// Regra de ouro: conversa primeiro, oferta depois — nunca citar preço no 1º contato.
// O Caio edita os textos aqui sem mexer em componente.

export type MsgTipo = "contato" | "detalhe" | "oferta" | "followup1" | "followup2";

// Promoção "Mês do Zeca" (20%): vale até 30/09 23:59:59 (horário de Brasília).
// Depois dessa data, as versões (b) entram sozinhas.
export const PROMO_ATE = "2026-09-30T23:59:59-03:00";

export function promoAtiva(agora: Date): boolean {
  return agora.getTime() <= new Date(PROMO_ATE).getTime();
}

// ---------- ETAPA 1 — Primeiro contato (conexão, sem apontar erro) ----------
// CONTATO_A == CONTATO_B: a promoção saiu da 1ª mensagem — o objetivo aqui é
// identificar com quem falar e gerar curiosidade, citando o {site} pra pessoa validar.
const CONTATO_A = `Olá! Tudo bem? Me chamo Everton, crio experiências digitais estratégicas que conectam sua essência ao público certo.

Vi a {empresa} e fiquei curioso sobre um ponto na presença digital de vocês ({site}). Com quem posso falar sobre isso? Se preferir, posso te explicar por aqui.`;

const CONTATO_B = `Olá! Tudo bem? Me chamo Everton, crio experiências digitais estratégicas que conectam sua essência ao público certo.

Vi a {empresa} e fiquei curioso sobre um ponto na presença digital de vocês ({site}). Com quem posso falar sobre isso? Se preferir, posso te explicar por aqui.`;

// ---------- ETAPA 2 — Detalhe (após a pessoa responder) ----------
const DETALHE_A = `Que bom te encontrar! Vi que dá pra fortalecer a presença digital de vocês: {ponto}. Isso passa mais confiança e traz cliente novo.

Estou com 20% OFF no Mês do Zeca, até 30/09. Dá uma olhada nos meus trabalhos em evertonbrito.com e me diz o que acha.`;

const DETALHE_B = `Que bom te encontrar! Vi que dá pra fortalecer a presença digital de vocês: {ponto}. Isso passa mais confiança e traz cliente novo.

Dá uma olhada nos meus trabalhos em evertonbrito.com e me diz o que acha.`;

// ---------- ETAPA 3 — Oferta (só depois do interesse) ----------
const OFERTA_A = `Perfeito! Deixa eu te mostrar os formatos e o investimento. Estou com 20% de desconto neste mês:

🔹 *Landing Page* · ~R$ 1.997~ por *R$ 1.597*: uma página focada em captar contato e converter quem já te procura.
🔹 *One Page* · ~R$ 1.897~ por *R$ 1.517*: seu negócio inteiro numa página só, direto ao ponto.
🔹 *Página de Vendas* · ~R$ 2.297~ por *R$ 1.837*: página longa pra apresentar a oferta, responder às dúvidas e vender no automático.
🔹 *Site Institucional* · ~R$ 3.097~ por *R$ 2.477*: várias páginas, mais autoridade e melhor posição no Google.

Todos feitos com a identidade da {empresa}, funcionando bem no celular e no computador, com botão de contato direto no seu WhatsApp. Posso parcelar.

Quer que eu monte a estrutura que imagino pra {empresa}? Se sim, me responde: *QUERO MEU SITE*.`;

const OFERTA_B = `Perfeito! Deixa eu te mostrar os formatos e o investimento:

🔹 *Landing Page* · *R$ 1.997*: uma página focada em captar contato e converter quem já te procura.
🔹 *One Page* · *R$ 1.897*: seu negócio inteiro numa página só, direto ao ponto.
🔹 *Página de Vendas* · *R$ 2.297*: página longa pra apresentar a oferta, responder às dúvidas e vender no automático.
🔹 *Site Institucional* · *R$ 3.097*: várias páginas, mais autoridade e melhor posição no Google.

Todos feitos com a identidade da {empresa}, funcionando bem no celular e no computador, com botão de contato direto no seu WhatsApp. Posso parcelar.

Quer que eu monte a estrutura que imagino pra {empresa}? Se sim, me responde: *QUERO MEU SITE*.`;

// ---------- ETAPA 4 — Follow-ups (sem pressionar) ----------
const FOLLOW1_A = `Olá, {nome}! Passando só pra confirmar se você viu minha mensagem sobre a {empresa}.

A ideia é um site que apresenta os serviços, fortalece a presença no Google e facilita o contato de cliente novo, e a *condição de 20% segue disponível até 30/09*.

Se tiver interesse, me responde *SIM* que te envio os detalhes. Se preferir, também tiro dúvidas por aqui.`;

const FOLLOW1_B = `Olá, {nome}! Passando só pra confirmar se você viu minha mensagem sobre a {empresa}.

A ideia é um site que apresenta os serviços, fortalece a presença no Google e facilita o contato de cliente novo.

Se tiver interesse, me responde *SIM* que te envio os detalhes. Se preferir, também tiro dúvidas por aqui.`;

const FOLLOW2_A = `Olá, {nome}! Vou encerrar meu contato por aqui pra não te incomodar.

Se um dia a {empresa} quiser um site que fortaleça a presença dela na internet, fico à disposição. Meus trabalhos estão em evertonbrito.com, e, enquanto a condição de 20% estiver de pé, consigo manter pra você.

Sucesso por aí!`;

const FOLLOW2_B = `Olá, {nome}! Vou encerrar meu contato por aqui pra não te incomodar.

Se um dia a {empresa} quiser um site que fortaleça a presença dela na internet, fico à disposição. Meus trabalhos estão em evertonbrito.com.

Sucesso por aí!`;

type Ctx = { empresa: string; segmento: string; ponto: string; nome: string; site: string; relatorio: string };

function preencher(texto: string, c: Ctx): string {
  return texto
    .replace(/\{empresa\}/g, c.empresa)
    .replace(/\{segmento\}/g, c.segmento)
    .replace(/\{ponto\}/g, c.ponto)
    .replace(/\{nome\}/g, c.nome)
    .replace(/\{site\}/g, c.site)
    .replace(/\{relatorio\}/g, c.relatorio);
}

// 1ª falta de prioridade alta → frase natural, em minúscula, pronta pra encaixar
// depois de "reparei uma coisa: ". Ex.: "Site sem formulário e sem botão de WhatsApp"
// vira "o site de vocês não tem botão de WhatsApp".
type FraseNatural = string | ((m: RegExpMatchArray) => string);

const FALTAS_NATURAIS: [RegExp, FraseNatural][] = [
  [/^Nota [\d.,]+ no Google$/i, "a nota de vocês no Google está baixa"],
  [/^Só \d+ avaliações$/i, "vocês têm poucas avaliações no Google"],
  [/^Perfil sem horário de funcionamento$/i, "o perfil de vocês no Google não mostra o horário de funcionamento"],
  [/^Perfil do Google sem site$/i, "o perfil de vocês no Google não tem site"],
  [/^O site do perfil do Google está fora do ar$/i, "o site de vocês no Google está fora do ar"],
  [/^Perfil sem telefone$/i, "o perfil de vocês no Google não tem telefone"],
  [/^Status no Google:/i, "o Google indica que vocês não estão operando normalmente"],
  [/^Não tem site$/i, "vocês não têm site"],
  [/^Site fora do ar/i, "o site de vocês está fora do ar"],
  [/^Site sem HTTPS/i, "o site de vocês não tem o cadeado de segurança (HTTPS)"],
  [/^Site não adaptado ao celular$/i, "o site de vocês não abre bem no celular"],
  [/^Site sem formulário e sem botão de WhatsApp$/i, "o site de vocês não tem botão de WhatsApp"],
  [/^Sem WhatsApp visível$/i, "o WhatsApp de vocês não está visível no site"],
  [/^Sem descrição para o Google \(meta description\)$/i, "no Google, o site de vocês aparece sem uma descrição do que vocês fazem"],
  [/^Rodapé parado em (\d{4})$/i, (m) => `o rodapé do site ainda mostra ${m[1]}, o que passa impressão de site parado`],
];

export function pontoNatural(item: string): string {
  const t = (item || "").trim();
  for (const [re, frase] of FALTAS_NATURAIS) {
    const m = re.exec(t);
    if (m) return typeof frase === "function" ? frase(m) : frase;
  }
  // fallback: reaproveita o item original em caixa baixa
  const suave = t.charAt(0).toLowerCase() + t.slice(1).replace(/\.$/, "");
  return suave || "a presença de vocês na internet tem um ponto a melhorar";
}

type LeadMsg = { nome: string; segmento: string; site?: string; relatorio?: string };
type AnaliseMsg = { faltas?: { prioridade: string; item: string }[] } | null;

export function montarMensagem(tipo: MsgTipo, lead: LeadMsg, analise: AnaliseMsg, agora: Date): string {
  const empresa = (lead.nome || "").trim() || "sua empresa";
  const segmento = (lead.segmento || "").trim() || "empresas";
  const faltas = analise?.faltas?.filter(
    (f) => !/não confirmada|não puxados/i.test(f.item),
  );
  const falta =
    faltas?.find((f) => f.prioridade === "alta") ??
    faltas?.find((f) => f.prioridade === "media") ??
    faltas?.find((f) => f.prioridade === "baixa");
  const ponto = falta ? pontoNatural(falta.item) : "a presença de vocês na internet pode trazer mais clientes do que traz hoje";
  // `{nome}` (follow-ups) usa o nome do lead — a ficha não tem nome de contato separado.
  const nome = empresa;
  // `{site}`: link do lead sem https:// e sem barra final; sem site → perfil no Google.
  const site = ((lead.site || "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "")) || "o perfil de vocês no Google";
  const c: Ctx = { empresa, segmento, ponto, nome, site, relatorio: lead.relatorio || "" };
  const promo = promoAtiva(agora);

  switch (tipo) {
    case "contato": return preencher(promo ? CONTATO_A : CONTATO_B, c);
    case "detalhe": {
      let msg = preencher(promo ? DETALHE_A : DETALHE_B, c);
      if (lead.relatorio) msg = msg + "\n\nPreparei um diagnóstico rápido da " + empresa + ": " + lead.relatorio;
      return msg;
    }
    case "oferta": return preencher(promo ? OFERTA_A : OFERTA_B, c);
    case "followup1": return preencher(promo ? FOLLOW1_A : FOLLOW1_B, c);
    case "followup2": return preencher(promo ? FOLLOW2_A : FOLLOW2_B, c);
  }
}
