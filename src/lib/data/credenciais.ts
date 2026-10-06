// Cofre de credenciais (tabela credentials). A senha é cifrada com AES-256-GCM
// usando AGENCIA_COFRE_KEY antes de sair do servidor; o banco só vê cifra, IV e tag.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { agoraIso, dados, supabase, textoOuNull, type Linha } from "./client";

function derivarChave(): Buffer {
  const chave = process.env.AGENCIA_COFRE_KEY;
  if (!chave) throw new Error("AGENCIA_COFRE_KEY ausente no ambiente");
  return createHash("sha256").update(chave).digest();
}

export interface DadosCredencial {
  label: string;
  url?: string | null;
  usuario?: string | null;
  senha: string;
  notas?: string | null;
}

export interface CredencialCifrada {
  cifrado: string;
  iv: string;
  tag: string;
}

export interface CredencialResumo {
  id: string;
  empresa_id: string;
  label: string;
  url: string | null;
  usuario: string | null;
  notas: string | null;
}

export interface CredencialLida extends CredencialResumo {
  senha: string;
}

export function cifrar(plain: string): CredencialCifrada {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", derivarChave(), iv);
  const cifrado = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return { cifrado: cifrado.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}

export function decifrar(cifrado: string, iv: string, tag: string): string {
  const decipher = createDecipheriv("aes-256-gcm", derivarChave(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(cifrado, "base64")), decipher.final()]).toString("utf8");
}

export function cofreConfigurado(): boolean {
  return Boolean(process.env.AGENCIA_COFRE_KEY);
}

function resumo(l: Linha): CredencialResumo {
  return {
    id: String(l.id),
    empresa_id: String(l.company_id),
    label: String(l.label),
    url: textoOuNull(l.url),
    usuario: textoOuNull(l.username),
    notas: textoOuNull(l.notes),
  };
}

export async function gravarCredencial(empresa_id: string, d: DadosCredencial): Promise<{ id: string }> {
  const { cifrado, iv, tag } = cifrar(d.senha);
  const agora = agoraIso();
  const r = await supabase()
    .from("credentials")
    .insert({
      company_id: empresa_id,
      label: d.label,
      url: d.url ?? null,
      username: d.usuario ?? null,
      encrypted_password: cifrado,
      encryption_iv: iv,
      encryption_tag: tag,
      notes: d.notas ?? null,
      created_at: agora,
      updated_at: agora,
    })
    .select("id")
    .single();
  return { id: String(dados<Linha>(r, "gravar credencial").id) };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function lerCredencial(id: string): Promise<CredencialLida | null> {
  if (!UUID.test(id)) return null;
  const r = await supabase().from("credentials").select("*").eq("id", id).maybeSingle();
  const l = dados<Linha | null>(r, "ler credencial");
  if (!l) return null;
  return { ...resumo(l), senha: decifrar(String(l.encrypted_password), String(l.encryption_iv), String(l.encryption_tag)) };
}

export async function removerCredencial(id: string, empresa_id?: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  let q = supabase().from("credentials").delete().eq("id", id);
  if (empresa_id) q = q.eq("company_id", empresa_id);
  const r = await q.select("id");
  return (dados<Linha[]>(r, "remover credencial") ?? []).length > 0;
}

// Lista sem a senha.
export async function listarCredenciais(empresa_id?: string): Promise<CredencialResumo[]> {
  let q = supabase().from("credentials").select("id, company_id, label, url, username, notes");
  if (empresa_id) q = q.eq("company_id", empresa_id);
  const r = await q.order("label");
  return (dados<Linha[]>(r, "listar credenciais") ?? []).map(resumo);
}
