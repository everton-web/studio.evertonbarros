// Contato principal da empresa (tabela contacts).
import { dados, supabase, textoOuNull, type Linha } from "./client";

export type Contato = { id: string; nome: string | null; telefone: string | null; whatsapp: string | null; email: string | null };

function mapear(l: Linha): Contato {
  return {
    id: String(l.id),
    nome: textoOuNull(l.name),
    telefone: textoOuNull(l.phone),
    whatsapp: textoOuNull(l.whatsapp),
    email: textoOuNull(l.email),
  };
}

export async function contatosDaEmpresa(empresaId: string): Promise<Contato[]> {
  const r = await supabase().from("contacts").select("*").eq("company_id", empresaId).order("created_at");
  return (dados<Linha[]>(r, "ler contatos") ?? []).map(mapear);
}

// Mantém um contato principal alinhado à ficha do lead. Só grava campos informados.
export async function sincronizarContato(
  empresaId: string,
  c: { nome?: string; telefone?: string; whatsapp?: string; email?: string },
): Promise<void> {
  const valores: Record<string, string | null> = {};
  if (c.nome !== undefined) valores.name = c.nome || null;
  if (c.telefone !== undefined) valores.phone = c.telefone || null;
  if (c.whatsapp !== undefined) valores.whatsapp = c.whatsapp || null;
  if (c.email !== undefined) valores.email = c.email || null;
  if (Object.keys(valores).length === 0) return;
  const [primeiro] = await contatosDaEmpresa(empresaId);
  if (primeiro) {
    dados(await supabase().from("contacts").update(valores).eq("id", primeiro.id), "atualizar contato");
    return;
  }
  if (!Object.values(valores).some(Boolean)) return;
  dados(await supabase().from("contacts").insert({ company_id: empresaId, ...valores }), "criar contato");
}

// Primeiro WhatsApp cadastrado para cada empresa informada.
export async function whatsappPorEmpresa(ids: string[]): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  if (ids.length === 0) return mapa;
  const r = await supabase().from("contacts").select("company_id, whatsapp, created_at").in("company_id", ids).order("created_at");
  for (const l of dados<Linha[]>(r, "ler whatsapp") ?? []) {
    const id = String(l.company_id);
    const n = String(l.whatsapp || "").trim();
    if (n && !mapa.has(id)) mapa.set(id, n);
  }
  return mapa;
}
