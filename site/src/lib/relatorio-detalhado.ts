import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Formato do JSON em src/data/relatorios-detalhados/<slug>.json */
export type ItemForte = {
  titulo: string;
  texto: string;
  /** Nome do arquivo em public/relatorio-detalhado/<slug>/. Vazio = sem imagem. */
  imagem: string;
};

export type ItemFraco = ItemForte & {
  impacto: string;
};

export type RelatorioDetalhado = {
  slug: string;
  empresa: string;
  cidade: string;
  site: string;
  geradoEm: string;
  resumo: string;
  designSystem?: string;
  prototipo?: string;
  forte: { titulo: string; intro: string; itens: ItemForte[] };
  fraco: { titulo: string; intro: string; itens: ItemFraco[] };
  proposta: { titulo: string; texto: string; imagens: string[] };
  proximos: string[];
};

/** Imagem já resolvida no build: só existe se o arquivo existe em public/. */
export type ImagemResolvida = { src: string; width: number; height: number };

export type ItemForteView = Omit<ItemForte, "imagem"> & { imagem: ImagemResolvida | null };
export type ItemFracoView = Omit<ItemFraco, "imagem"> & { imagem: ImagemResolvida | null };

export type RelatorioDetalhadoView = Omit<RelatorioDetalhado, "forte" | "fraco" | "proposta"> & {
  forte: { titulo: string; intro: string; itens: ItemForteView[] };
  fraco: { titulo: string; intro: string; itens: ItemFracoView[] };
  proposta: { titulo: string; texto: string; imagens: ImagemResolvida[] };
};

const DATA_DIR = join(process.cwd(), "src", "data", "relatorios-detalhados");
const PUBLIC_DIR = join(process.cwd(), "public", "relatorio-detalhado");
const SLUG_OK = /^[a-z0-9-]+$/;
const ARQUIVO_OK = /^[a-zA-Z0-9._-]+\.(webp|png|jpe?g)$/;

export function listarSlugsDetalhados(): string[] {
  try {
    return readdirSync(DATA_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.slice(0, -".json".length));
  } catch {
    return [];
  }
}

export function existeDetalhado(slug: string): boolean {
  return SLUG_OK.test(slug) && existsSync(join(DATA_DIR, `${slug}.json`));
}

export function lerRelatorioDetalhado(slug: string): RelatorioDetalhado | null {
  if (!SLUG_OK.test(slug)) return null;
  try {
    return JSON.parse(readFileSync(join(DATA_DIR, `${slug}.json`), "utf8")) as RelatorioDetalhado;
  } catch {
    return null;
  }
}

/** Lê largura e altura do cabeçalho de WebP, PNG ou JPEG. */
function dimensoes(buf: Buffer): { width: number; height: number } | null {
  // PNG
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // WebP
  if (buf.length > 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8 ") {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") {
      return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
    }
  }
  // JPEG: procura o marcador SOF
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return null;
      const m = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
      }
      i += 2 + len;
    }
  }
  return null;
}

/** Arquivo vazio, inválido ou inexistente vira null: o item aparece sem imagem. */
export function resolverImagem(slug: string, arquivo: string): ImagemResolvida | null {
  if (!arquivo || !ARQUIVO_OK.test(arquivo) || !SLUG_OK.test(slug)) return null;
  try {
    const dim = dimensoes(readFileSync(join(PUBLIC_DIR, slug, arquivo)));
    if (!dim || !dim.width || !dim.height) return null;
    return { src: `/relatorio-detalhado/${slug}/${arquivo}`, ...dim };
  } catch {
    return null;
  }
}

export function montarView(rel: RelatorioDetalhado): RelatorioDetalhadoView {
  const s = rel.slug;
  return {
    ...rel,
    forte: {
      ...rel.forte,
      itens: (rel.forte?.itens ?? []).map((it) => ({ ...it, imagem: resolverImagem(s, it.imagem) })),
    },
    fraco: {
      ...rel.fraco,
      itens: (rel.fraco?.itens ?? []).map((it) => ({ ...it, imagem: resolverImagem(s, it.imagem) })),
    },
    proposta: {
      ...rel.proposta,
      imagens: (rel.proposta?.imagens ?? [])
        .map((f) => resolverImagem(s, f))
        .filter((x): x is ImagemResolvida => x !== null),
    },
    proximos: rel.proximos ?? [],
  };
}
