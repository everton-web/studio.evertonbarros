// Saúde dos sites (tabela health_alerts). Cada verificação é uma linha; vale a
// mais recente de cada site (alert_key) que ainda não foi resolvida.
import { dados, objeto, supabase, type Linha } from "./client";

export type SaudeSite = {
  slug: string;
  cliente: string;
  no_ar: boolean | null;
  certificado_dias: number | null;
  formulario: string | null;
  velocidade_ms: number | null;
  verificado_em: string;
};

const asBool = (v: unknown) => (typeof v === "boolean" ? v : null);
const asNum = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const asStr = (v: unknown) => (typeof v === "string" && v ? v : null);

export async function lerSaude(): Promise<SaudeSite[]> {
  const r = await supabase().from("health_alerts").select("*").is("resolved_at", null).order("observed_at", { ascending: false });
  const vistos = new Set<string>();
  const out: SaudeSite[] = [];
  for (const l of dados<Linha[]>(r, "ler saúde") ?? []) {
    const d = objeto(l.details);
    const slug = asStr(d.slug) || asStr(l.alert_key) || "";
    if (!slug || vistos.has(slug)) continue;
    vistos.add(slug);
    out.push({
      slug,
      cliente: asStr(d.cliente) || asStr(l.title) || slug,
      no_ar: asBool(d.no_ar),
      certificado_dias: asNum(d.certificado_dias),
      formulario: asStr(d.formulario),
      velocidade_ms: asNum(d.velocidade_ms),
      verificado_em: asStr(d.verificado_em) || String(l.observed_at || ""),
    });
  }
  return out.sort((a, b) => a.cliente.localeCompare(b.cliente));
}
