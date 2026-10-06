// Exportador do relatório público do lead: gera o JSON enxuto que o site consome
// (contrato da story relatorio-publico) e grava em reports (kind lead_publico).
// O site lê o JSON publicado em GET /api/relatorio/publico/<slug>.
// SEM telefones, e-mails, WhatsApp do lead, avaliações de terceiros nem dados sensíveis.
import { gravarRelatorio, gravarRelatorioLead, leadBase } from "@/lib/data";
import { lerAnalise, type Analise } from "./analise";

export type Segmento = "odontologia" | "clinica" | "restaurante" | "hospedagem" | "outro";

export type RelatorioPublico = {
  slug: string;
  empresa: string;
  segmento: Segmento;
  cidade: string;
  geradoEm: string;
  pontuacao: number;
  google: { nota: number | null; avaliacoes: number | null; categorias: string[]; mapsUrl: string };
  site: { url: string; ok: boolean };
  redes: { instagram: string; facebook: string; tiktok: string; linkedin: string; youtube: string };
  faltas: Array<{ area: "google" | "site" | "redes" | "rastreio" | "contato"; tag: string; oportunidade: string }>;
  fortes: string[];
};

export function normalizarSlug(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "lead";
}

export function derivarSegmento(analise: Analise, ficha: { segmento?: string }): Segmento {
  const t = [...(analise.google.categorias || []), ficha.segmento || ""].join(" ").toLowerCase();
  if (/(dentist|odonto|dental)/.test(t)) return "odontologia";
  if (/(clinic|medical|medic|estetica|esthetic)/.test(t)) return "clinica";
  if (/(restaurante|restaurant|pizza|food|bar|cozinha)/.test(t)) return "restaurante";
  if (/(pousada|hotel|hospedagem|lodging|hostel)/.test(t)) return "hospedagem";
  return "outro";
}

const QUEM_PROXIMA: Record<Segmento, string> = {
  odontologia: "dentista",
  clinica: "clínica",
  restaurante: "restaurante",
  hospedagem: "hospedagem",
  outro: "seu serviço",
};
const CLIENTES: Record<Segmento, string> = {
  odontologia: "pacientes",
  clinica: "pacientes",
  restaurante: "clientes",
  hospedagem: "hóspedes",
  outro: "clientes",
};
const ACAO: Record<Segmento, string> = {
  odontologia: "agendamento",
  clinica: "agendamento",
  restaurante: "reserva",
  hospedagem: "reserva",
  outro: "contato",
};

// Itens de bastidor (diagnóstico interno) que NUNCA vão para o relatório público.
const INTERNO = /(não confirmada|não puxados)/i;

// Converte uma falta crua do diagnóstico em oportunidade positiva, na linguagem
// do protótipo aprovado. Nunca vaza item/porque/prioridade crus.
function oportunidadeDe(f: Analise["faltas"][number], seg: Segmento): { area: Analise["faltas"][number]["area"]; tag: string; oportunidade: string } | null {
  if (INTERNO.test(f.item)) return null;
  const i = f.item.toLowerCase();
  const quem = QUEM_PROXIMA[seg];
  const clientes = CLIENTES[seg];
  const acao = ACAO[seg];

  if (i.includes("título")) return { area: f.area, tag: "Busca local", oportunidade: `Ser encontrado por quem procura ${quem} na sua região, com um título que chama atenção nos resultados.` };
  if (i.includes("descrição") || i.includes("meta description")) return { area: f.area, tag: "Descrição no Google", oportunidade: "Aparecer com uma descrição clara e convidativa quando alguém busca pelo seu nome." };
  if (i.includes("schema") || i.includes("negócio local") || i.includes("marcação")) return { area: f.area, tag: "Negócio local", oportunidade: "Aparecer no Google como o negócio local da sua região, do jeito que os buscadores entendem melhor." };
  if (i.includes("analytics")) return { area: f.area, tag: "Google Analytics", oportunidade: `Saber de onde vêm os ${clientes} para investir no que realmente funciona.` };
  if (i.includes("pixel")) return { area: f.area, tag: "Meta Pixel", oportunidade: `Reimpactar quem já visitou seu site, transformando interesse em ${acao}.` };
  if (i.includes("compartilhar") || i.includes("imagem")) return { area: f.area, tag: "WhatsApp · Instagram", oportunidade: "Link com imagem bonita ao compartilhar no WhatsApp e no Instagram." };
  if (i.includes("rodapé") || i.includes("parado em")) return { area: f.area, tag: "Atualização", oportunidade: "Parecer um negócio atual e ativo, sem cara de site abandonado." };
  if (i.includes("horário") || i.includes("fotos") || i.includes("avaliaç") || i.includes("nota")) return { area: f.area, tag: "Perfil do Google", oportunidade: "Um perfil completo, com horários, fotos e avaliações, que passa profissionalismo de cara." };
  if (i.includes("não tem site") || i.includes("fora do ar")) return { area: f.area, tag: "Site no ar", oportunidade: `Ter um site no ar e no seu nome, para quem procura ${quem} achar um lugar para clicar.` };
  if (i.includes("https")) return { area: f.area, tag: "Navegação segura", oportunidade: "Mostrar o cadeado de segurança no navegador e passar confiança para quem visita." };
  if (i.includes("celular")) return { area: f.area, tag: "Site no celular", oportunidade: "Abrir perfeitamente no celular, onde a maioria das buscas locais acontece." };
  if (i.includes("lento")) return { area: f.area, tag: "Velocidade", oportunidade: "Carregar rápido para ninguém desistir antes de ver o que você oferece." };
  if (i.includes("javascript")) return { area: f.area, tag: "Encontrabilidade", oportunidade: "Aparecer no Google com conteúdo que o buscador consegue ler e ranquear." };
  if (i.includes("formulário") || i.includes("whatsapp")) return { area: f.area, tag: "Contato em um clique", oportunidade: "Ter um jeito de contato em um clique para quem se interessa chamar na hora." };
  if (i.includes("instagram")) return { area: f.area, tag: "Instagram", oportunidade: "Ligar seu Instagram ao site para quem te procura continuar no seu perfil." };
  if (i.includes("telefone")) return { area: f.area, tag: "Botão de ligar", oportunidade: "Ter o botão de ligar visível no Google para o cliente chamar sem procurar o número." };
  if (i.includes("perfil") && i.includes("site")) return { area: f.area, tag: "Site no perfil", oportunidade: "Ter o site linkado no perfil do Google para quem pesquisa achar onde clicar." };
  if (i.includes("status")) return { area: f.area, tag: "Perfil ativo", oportunidade: "Aparecer no Google como um negócio em pleno funcionamento." };
  return { area: f.area, tag: "Oportunidade", oportunidade: "Um ponto a melhorar para fortalecer sua presença digital." };
}

export async function exportarRelatorio(id: string, slug?: string): Promise<{ slug: string; url: string; empresa: string }> {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("lead inválido");
  const a = await lerAnalise(id);
  if (!a) throw new Error("rode a análise do lead antes de exportar");
  const ficha = await leadBase(id);
  const slugFinal = normalizarSlug(slug || id);
  const cidade = (ficha?.cidade || "").split("/")[0].trim() || "Salvador";
  const segmento = derivarSegmento(a, ficha || {});
  const rel: RelatorioPublico = {
    slug: slugFinal,
    empresa: a.nome,
    segmento,
    cidade,
    geradoEm: a.geradoEm.slice(0, 10),
    pontuacao: a.pontuacao,
    google: { nota: a.google.nota, avaliacoes: a.google.avaliacoes, categorias: a.google.categorias || [], mapsUrl: a.google.mapsUrl },
    site: { url: a.site?.url || "", ok: a.site?.ok ?? false },
    redes: { instagram: a.redes.instagram, facebook: a.redes.facebook, tiktok: a.redes.tiktok, linkedin: a.redes.linkedin, youtube: a.redes.youtube },
    faltas: a.faltas.map((f) => oportunidadeDe(f, segmento)).filter((x): x is NonNullable<typeof x> => x !== null),
    fortes: a.fortes.map((s) => s.replace(/\s*\([^)]*\)\s*$/, "").trim()),
  };
  await gravarRelatorioLead(id, slugFinal, rel);
  const url = "https://evertonbrito.com/relatorio/" + slugFinal;
  await gravarRelatorio(id, url);
  return { slug: slugFinal, url, empresa: a.nome };
}
