// Perguntas do briefing por link. Sem imports de servidor (usado na página pública).
export const PERGUNTAS: { id: string; rotulo: string; dica: string; longa?: boolean }[] = [
  { id: "negocio", rotulo: "O que a sua empresa faz?", dica: "Em poucas linhas, como você explicaria para um cliente novo.", longa: true },
  { id: "publico", rotulo: "Quem é o seu cliente ideal?", dica: "Idade, região, o que ele busca quando chega até você.", longa: true },
  { id: "objetivo", rotulo: "O que o site precisa fazer por você?", dica: "Por exemplo: gerar contatos no WhatsApp, marcar consultas, mostrar trabalhos.", longa: true },
  { id: "diferenciais", rotulo: "O que faz você ser diferente de quem concorre com você?", dica: "Pense no que os clientes elogiam.", longa: true },
  { id: "referencias", rotulo: "Sites que você gosta (ou não gosta)", dica: "Cole os endereços e diga o que chamou sua atenção.", longa: true },
  { id: "prazo", rotulo: "Existe alguma data importante para o site ficar pronto?", dica: "Uma campanha, uma inauguração, uma data de evento.", longa: false },
];
export const LIMITE_RESPOSTA = 2000;
