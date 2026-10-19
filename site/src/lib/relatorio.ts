export type Segmento = "odontologia" | "clinica" | "restaurante" | "hospedagem" | "outro";
export type Area = "google" | "site" | "redes" | "rastreio" | "contato";

export type Falta = {
  area: Area;
  tag: string;
  oportunidade: string;
};

export type RelatorioPublico = {
  slug: string;
  empresa: string;
  segmento: Segmento;
  cidade: string;
  geradoEm: string;
  pontuacao: number;
  google: {
    nota: number | null;
    avaliacoes: number | null;
    categorias: string[];
    mapsUrl: string;
  };
  site: {
    url: string;
    ok: boolean;
  };
  redes: {
    instagram: string;
    facebook: string;
    tiktok: string;
    linkedin: string;
    youtube: string;
  };
  faltas: Falta[];
  fortes: string[];
};

export const SEGMENTO_ROTULO: Record<Segmento, string> = {
  odontologia: "odontologia",
  clinica: "clínica",
  restaurante: "restaurante",
  hospedagem: "hospedagem",
  outro: "seu serviço",
};

export const PREMISSAS: Record<
  Segmento,
  { buscas: number; clique: number; conversao: number; ticket: number }
> = {
  odontologia: { buscas: 600, clique: 0.15, conversao: 0.05, ticket: 800 },
  clinica: { buscas: 800, clique: 0.15, conversao: 0.05, ticket: 350 },
  restaurante: { buscas: 2000, clique: 0.2, conversao: 0.08, ticket: 80 },
  hospedagem: { buscas: 700, clique: 0.2, conversao: 0.03, ticket: 450 },
  outro: { buscas: 500, clique: 0.15, conversao: 0.05, ticket: 250 },
};

export type Dor = {
  id: number;
  texto: string;
  areas: Area[];
};

export const DORES: Dor[] = [
  { id: 1, texto: "Poucos clientes me encontram pelo Google", areas: ["google"] },
  { id: 2, texto: "Não sei de onde vêm as visitas do meu site", areas: ["rastreio"] },
  { id: 3, texto: "Meu site não funciona bem no celular", areas: ["site"] },
  { id: 4, texto: "As pessoas me procuram mas não conseguem falar comigo", areas: ["contato"] },
  { id: 5, texto: "Meu site está fora do ar ou dá erro", areas: ["site"] },
  { id: 6, texto: "Minhas redes sociais não estão ligadas ao meu site", areas: ["redes"] },
  { id: 7, texto: "Meu perfil no Google está incompleto/desatualizado", areas: ["google"] },
  { id: 8, texto: "Meu link aparece feio quando compartilho no WhatsApp/Instagram", areas: ["site"] },
];

export function doresVisiveis(faltas: Falta[]): Dor[] {
  const areas = new Set<Area>(faltas.map((f) => f.area));
  return DORES.filter((d) => d.areas.some((a) => areas.has(a)));
}

export const AREA_TITULO: Record<Area, string> = {
  google: "Ser encontrado no Google",
  site: "Seu site",
  redes: "Suas redes sociais",
  rastreio: "Entender seus visitantes",
  contato: "Contato com seus clientes",
};
