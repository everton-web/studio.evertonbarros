// Nota de UX e UI do site, calculada no código (sem IA). Cada critério tem um peso;
// a nota é a parte dos pesos que o site atende. Foco no que faz o visitante sair:
// layout que não se adapta ao celular, falta de botão para chamar e navegação confusa.

type Ctx = { html: string; texto: string; url: string };
type Area = "celular" | "conversao" | "estrutura" | "visual" | "confianca" | "conteudo";
type Regra = { area: Area; peso: number; rotulo: string; passa: (c: Ctx) => boolean };

const ANO_ATUAL = new Date().getFullYear();

function imagensComAlt(html: string): boolean {
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  if (!imgs.length) return true;
  const com = imgs.filter((i) => /\balt=["'][^"']+["']/i.test(i)).length;
  return com / imgs.length >= 0.7;
}

const REGRAS: Regra[] = [
  // Celular: a maior parte do tráfego local chega pelo celular.
  { area: "celular", peso: 15, rotulo: "sem meta viewport: o layout não se adapta ao celular",
    passa: (c) => /<meta[^>]+name=["']viewport["'][^>]*width=device-width/i.test(c.html) },
  { area: "celular", peso: 8, rotulo: "largura fixa acima de 900px (corta a tela do celular)",
    passa: (c) => !/width:\s*(9\d\d|1\d{3,})px/i.test(c.html) && !/<table[^>]+width=["']?(9\d\d|1\d{3,})/i.test(c.html) },
  { area: "celular", peso: 6, rotulo: "telefone que não liga com um toque (sem tel:)",
    passa: (c) => /href=["']tel:/i.test(c.html) },

  // Conversão: o visitante tem que saber o que fazer e como chamar.
  { area: "conversao", peso: 12, rotulo: "nenhum botão de ação claro (agendar, orçamento, fale conosco)",
    passa: (c) => /<(a|button)\b[^>]*>[\s\S]{0,120}?(agend|or[cç]amento|fale conosco|solicit|reserv|marque|pe[cç]a|cont[ae]tar)/i.test(c.html) },
  { area: "conversao", peso: 12, rotulo: "sem botão de WhatsApp",
    passa: (c) => /wa\.me\/|api\.whatsapp\.com|web\.whatsapp\.com/i.test(c.html) },
  { area: "conversao", peso: 6, rotulo: "sem menu de navegação",
    passa: (c) => /<nav[\s>]|class=["'][^"']*(menu|navbar|nav-)/i.test(c.html) },

  // Estrutura: o básico que o Google e os leitores de tela precisam.
  { area: "estrutura", peso: 5, rotulo: "sem título principal (H1)", passa: (c) => /<h1[\s>]/i.test(c.html) },
  { area: "estrutura", peso: 5, rotulo: "sem título de página", passa: (c) => /<title>[^<]+<\/title>/i.test(c.html) },
  { area: "estrutura", peso: 5, rotulo: "sem descrição para o Google", passa: (c) => /<meta[^>]+name=["']description["']/i.test(c.html) },
  { area: "estrutura", peso: 3, rotulo: "sem idioma definido na página", passa: (c) => /<html[^>]+lang=/i.test(c.html) },
  { area: "estrutura", peso: 3, rotulo: "sem favicon (ícone da aba)", passa: (c) => /rel=["'][^"']*icon/i.test(c.html) },
  { area: "estrutura", peso: 4, rotulo: "imagens sem texto alternativo (alt)", passa: (c) => imagensComAlt(c.html) },
  { area: "estrutura", peso: 4, rotulo: "sem imagem de compartilhamento (link feio no WhatsApp)",
    passa: (c) => /<meta[^>]+property=["']og:image["']/i.test(c.html) },

  // Visual e tecnologia: sinais de site abandonado ou antigo.
  { area: "visual", peso: 8, rotulo: "tecnologia antiga (marquee, font, frames ou Flash)",
    passa: (c) => !/<marquee|<font[\s>]|<frameset|<frame\s|<embed[^>]+\.swf|bgsound|<blink/i.test(c.html) },
  { area: "visual", peso: 5, rotulo: "bibliotecas antigas (jQuery 1 e 2, Bootstrap 2 e 3)",
    passa: (c) => !/jquery[.-][12]\.|bootstrap[.-][23]\./i.test(c.html) },
  { area: "visual", peso: 5, rotulo: "rodapé com ano antigo (aparenta abandonado)",
    passa: (c) => {
      const m = c.html.match(/©\s*(20\d\d)|(20\d\d)\s*©/);
      return Number(m?.[1] || m?.[2] || ANO_ATUAL) >= ANO_ATUAL - 2;
    } },

  // Confiança e medição.
  { area: "confianca", peso: 5, rotulo: "sem HTTPS (navegador marca como não seguro)", passa: (c) => c.url.startsWith("https://") },
  { area: "confianca", peso: 3, rotulo: "sem Analytics ou pixel: não dá para medir anúncios",
    passa: (c) => /googletagmanager\.com|gtag\(|google-analytics\.com|fbq\(|connect\.facebook\.net/i.test(c.html) },

  // Conteúdo: página com pouco texto não convence.
  { area: "conteudo", peso: 6, rotulo: "pouco conteúdo (menos de 400 caracteres de texto)", passa: (c) => c.texto.length >= 400 },
];

export type ResultadoUX = {
  pontuacao: number; // 0–100; quanto maior, melhor a experiência
  falhas: { area: Area; peso: number; rotulo: string }[];
  temProblemaDeUso: boolean; // falha de celular ou de conversão, os que mais custam cliente
};

export function auditarUX(html: string, url: string): ResultadoUX {
  const texto = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const c: Ctx = { html, texto, url };
  const total = REGRAS.reduce((s, r) => s + r.peso, 0);
  const falhas = REGRAS.filter((r) => !r.passa(c))
    .map(({ area, peso, rotulo }) => ({ area, peso, rotulo }))
    .sort((a, b) => b.peso - a.peso);
  const perdido = falhas.reduce((s, f) => s + f.peso, 0);
  return {
    pontuacao: Math.round(((total - perdido) / total) * 100),
    falhas,
    temProblemaDeUso: falhas.some((f) => f.area === "celular" || f.area === "conversao"),
  };
}
