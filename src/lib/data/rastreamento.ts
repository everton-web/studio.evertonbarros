// Pixel de instalação (tabela tracking_sites). O incremento é atômico na função
// SQL increment_tracking_site, criada na migration 0001.
import { dados, supabase, type Linha } from "./client";

export type HitSite = { n: number; primeiro: string; ultimo: string };

// Mesmo formato do hits.json antigo: "2026-10-06 14:32:10" em UTC.
function formatar(iso: unknown): string {
  if (!iso) return "";
  const d = new Date(String(iso));
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 19).replace("T", " ") : "";
}

export async function registrarHit(site: string): Promise<void> {
  dados(await supabase().rpc("increment_tracking_site", { p_site_key: site }), "registrar hit");
}

export async function lerHits(): Promise<Record<string, HitSite>> {
  const r = await supabase().from("tracking_sites").select("*");
  const sites: Record<string, HitSite> = {};
  for (const l of dados<Linha[]>(r, "ler rastreamento") ?? []) {
    sites[String(l.site_key)] = { n: Number(l.hit_count) || 0, primeiro: formatar(l.first_hit_at), ultimo: formatar(l.last_hit_at) };
  }
  return sites;
}

export async function rastreamentoData(): Promise<{ sites: Record<string, HitSite>; total: number }> {
  const sites = await lerHits();
  return { sites, total: Object.values(sites).reduce((t, s) => t + s.n, 0) };
}
