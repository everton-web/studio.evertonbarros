// Arquivos enviados pela plataforma: bytes no bucket privado do Supabase
// Storage, metadados em stored_files. O caminho do objeto é opaco (data + UUID);
// o nome original só serve para exibir e baixar.
import { createHash, randomUUID } from "node:crypto";
import { bucketArquivos, dados, supabase, texto, type Linha } from "./client";

export type ArquivoInfo = { name: string; size: number; modified: string; ext: string };

const MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
  pdf: "application/pdf", csv: "text/csv", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword", txt: "text/plain", md: "text/markdown", json: "application/json", zip: "application/zip",
  mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg", wav: "audio/wav",
};

function extensao(nome: string): string {
  const i = nome.lastIndexOf(".");
  return i > 0 ? nome.slice(i + 1).toLowerCase() : "";
}

export function mimeFor(nome: string): string {
  return MIME[extensao(nome)] || "application/octet-stream";
}

// Mantém só o nome-base, sem barras nem caracteres estranhos.
export function safeName(nome: string): string {
  const base = String(nome || "").replace(/\\/g, "/").split("/").pop() || "";
  return base.replace(/[^\w.\- ]/g, "").replace(/^\.+/, "").trim();
}

async function nomesExistentes(): Promise<Set<string>> {
  const r = await supabase().from("stored_files").select("original_name");
  return new Set((dados<Linha[]>(r, "listar nomes") ?? []).map((l) => texto(l.original_name)));
}

async function nomeUnico(nome: string): Promise<string> {
  const existentes = await nomesExistentes();
  const base = (nome || "arquivo").replace(/[^\w.\- ]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "arquivo";
  if (!existentes.has(base)) return base;
  const idx = base.lastIndexOf(".");
  const stem = idx > 0 ? base.slice(0, idx) : base;
  const ext = idx > 0 ? base.slice(idx) : "";
  let i = 1;
  while (existentes.has(`${stem}-${i}${ext}`)) i++;
  return `${stem}-${i}${ext}`;
}

export async function listFiles(): Promise<ArquivoInfo[]> {
  const r = await supabase().from("stored_files").select("*").order("created_at", { ascending: false });
  return (dados<Linha[]>(r, "listar arquivos") ?? []).map((l) => ({
    name: texto(l.original_name),
    size: Number(l.size_bytes) || 0,
    modified: texto(l.updated_at || l.created_at),
    ext: extensao(texto(l.original_name)),
  }));
}

export async function saveFile(file: File): Promise<{ name: string; size: number }> {
  const nome = await nomeUnico(file.name);
  const bytes = Buffer.from(await file.arrayBuffer());
  const bucket = bucketArquivos();
  const caminho = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}`;
  const tipo = file.type || mimeFor(nome);
  dados(await supabase().storage.from(bucket).upload(caminho, bytes, { contentType: tipo, upsert: false }), "enviar arquivo");
  try {
    dados(
      await supabase().from("stored_files").insert({
        bucket,
        object_path: caminho,
        original_name: nome,
        mime_type: tipo,
        size_bytes: bytes.length,
        checksum_sha256: createHash("sha256").update(bytes).digest("hex"),
      }),
      "registrar arquivo",
    );
  } catch (e) {
    await supabase().storage.from(bucket).remove([caminho]);
    throw e;
  }
  return { name: nome, size: bytes.length };
}

async function porNome(nome: string): Promise<Linha | null> {
  const safe = safeName(nome);
  if (!safe) throw new Error("nome inválido");
  const r = await supabase().from("stored_files").select("*").eq("original_name", safe).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return dados<Linha | null>(r, "achar arquivo");
}

// Download pelo servidor (proxy autenticado): o bucket nunca fica público.
export async function lerArquivo(nome: string): Promise<{ bytes: ArrayBuffer; tipo: string } | null> {
  const l = await porNome(nome);
  if (!l) return null;
  const r = await supabase().storage.from(texto(l.bucket)).download(texto(l.object_path));
  const blob = dados<Blob>(r, "baixar arquivo");
  return { bytes: await blob.arrayBuffer(), tipo: texto(l.mime_type) || mimeFor(nome) };
}

// URL assinada curta, para quem preferir redirecionar em vez de fazer proxy.
export async function urlAssinada(nome: string, segundos = 60): Promise<string | null> {
  const l = await porNome(nome);
  if (!l) return null;
  const r = await supabase().storage.from(texto(l.bucket)).createSignedUrl(texto(l.object_path), segundos);
  return dados<{ signedUrl: string }>(r, "assinar url").signedUrl;
}

export async function deleteFile(nome: string): Promise<boolean> {
  const l = await porNome(nome);
  if (!l) return false;
  dados(await supabase().storage.from(texto(l.bucket)).remove([texto(l.object_path)]), "remover objeto");
  dados(await supabase().from("stored_files").delete().eq("id", String(l.id)), "remover arquivo");
  return true;
}
