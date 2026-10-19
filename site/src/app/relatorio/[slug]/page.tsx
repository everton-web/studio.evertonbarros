import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { RelatorioPublico } from "@/lib/relatorio";
import { RelatorioView } from "@/components/relatorio/RelatorioView";
import { existeDetalhado } from "@/lib/relatorio-detalhado";

export const dynamicParams = false;

const DATA_DIR = join(process.cwd(), "src", "data", "relatorios");

export async function generateStaticParams() {
  const files = await readdir(DATA_DIR);
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ slug: f.slice(0, -".json".length) }));
}

async function getRelatorio(slug: string): Promise<RelatorioPublico | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    const raw = await readFile(join(DATA_DIR, `${slug}.json`), "utf8");
    return JSON.parse(raw) as RelatorioPublico;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const rel = await getRelatorio(slug);
  if (!rel) return { title: "Não encontrado" };
  return {
    title: `${rel.empresa} · Diagnóstico de presença digital`,
    robots: { index: false, follow: false },
  };
}

export default async function RelatorioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rel = await getRelatorio(slug);
  if (!rel) notFound();
  return <RelatorioView data={rel} temDetalhado={existeDetalhado(slug)} />;
}
