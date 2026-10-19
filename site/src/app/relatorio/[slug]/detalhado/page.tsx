import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  lerRelatorioDetalhado,
  listarSlugsDetalhados,
  montarView,
} from "@/lib/relatorio-detalhado";
import { RelatorioDetalhadoView } from "@/components/relatorio/RelatorioDetalhadoView";

export const dynamicParams = false;

export async function generateStaticParams() {
  return listarSlugsDetalhados().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const rel = lerRelatorioDetalhado(slug);
  if (!rel) return { title: "Não encontrado", robots: { index: false, follow: false } };
  return {
    title: `${rel.empresa} · Relatório detalhado`,
    robots: { index: false, follow: false },
  };
}

export default async function RelatorioDetalhadoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rel = lerRelatorioDetalhado(slug);
  if (!rel) notFound();
  return <RelatorioDetalhadoView data={montarView({ ...rel, slug })} />;
}
