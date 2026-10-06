import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RelatorioCliente } from "@/components/relatorio-cliente";
import { relatorioPorToken } from "@/lib/data";

// Relatório público do cliente: sem login, só com token válido, nunca indexado.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Relatório mensal",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function RelatorioPublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await relatorioPorToken(token);
  if (!r) notFound();
  return <RelatorioCliente r={r} />;
}
