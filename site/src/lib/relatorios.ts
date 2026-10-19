import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type RelatorioPublico = {
  slug: string;
  empresa: string;
  segmento: "odontologia" | "clinica" | "restaurante" | "hospedagem" | "outro";
  cidade: string;
  geradoEm: string;
  pontuacao: number;
  google: { nota: number | null; avaliacoes: number | null; categorias: string[]; mapsUrl: string };
  site: { url: string; ok: boolean };
  redes: { instagram: string; facebook: string; tiktok: string; linkedin: string; youtube: string };
  faltas: { area: "google" | "site" | "redes" | "rastreio" | "contato"; prioridade: "alta" | "media" | "baixa"; item: string; porque: string }[];
  fortes: string[];
};

const DIR = join(process.cwd(), "src", "data", "relatorios");

export function listarRelatorios(): RelatorioPublico[] {
  try {
    return readdirSync(DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(readFileSync(join(DIR, f), "utf8")) as RelatorioPublico);
  } catch {
    return [];
  }
}

export function lerRelatorio(slug: string): RelatorioPublico | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    return JSON.parse(readFileSync(join(DIR, `${slug}.json`), "utf8")) as RelatorioPublico;
  } catch {
    return null;
  }
}
