// Documentos operacionais (antes arquivos Markdown do vault) em workspace_documents.
// A chave é o caminho relativo que o arquivo tinha no vault, por exemplo
// "10 INBOX.md", para o importador e o Obsidian falarem a mesma língua.
import { agoraIso, dados, objeto, supabase, texto, type Linha } from "./client";

export const DOC = {
  comando: "00 COMANDO.md",
  kanban: "01 Kanban.md",
  inbox: "10 INBOX.md",
  backlog: "20 BACKLOG.md",
  placar: "60 Financeiro/Placar.md",
  configRelatorio: "SaaS/Relatorio/config.json",
} as const;

export type Documento = {
  key: string;
  title: string;
  document_type: string;
  content_markdown: string;
  structured_data: Record<string, unknown>;
  source_path: string | null;
  updated_at: string;
};

function mapear(l: Linha): Documento {
  return {
    key: texto(l.key),
    title: texto(l.title),
    document_type: texto(l.document_type),
    content_markdown: texto(l.content_markdown),
    structured_data: objeto(l.structured_data),
    source_path: l.source_path == null ? null : texto(l.source_path),
    updated_at: texto(l.updated_at),
  };
}

export function tipoDoDocumento(key: string): string {
  if (key.startsWith("10 Agentes/")) return "agente";
  if (key.startsWith("docs/")) return "doc";
  if (key.endsWith(".json")) return "config";
  if (key.startsWith("60 Financeiro/")) return "financeiro";
  return "painel";
}

function tituloDoDocumento(key: string): string {
  return key.replace(/.*\//, "").replace(/\.(md|json)$/i, "");
}

export async function lerDocumento(key: string): Promise<Documento | null> {
  const r = await supabase().from("workspace_documents").select("*").eq("key", key).maybeSingle();
  const l = dados<Linha | null>(r, "ler documento");
  return l ? mapear(l) : null;
}

// Conteúdo Markdown do documento, ou "" quando ainda não existe.
export async function lerMarkdown(key: string): Promise<string> {
  return (await lerDocumento(key))?.content_markdown ?? "";
}

export async function lerVarios(keys: string[]): Promise<Map<string, Documento>> {
  const r = await supabase().from("workspace_documents").select("*").in("key", keys);
  const linhas = dados<Linha[]>(r, "ler documentos") ?? [];
  return new Map(linhas.map((l) => [texto(l.key), mapear(l)]));
}

export async function listarPorTipo(tipo: string): Promise<Documento[]> {
  const r = await supabase().from("workspace_documents").select("*").eq("document_type", tipo).order("key");
  return (dados<Linha[]>(r, "listar documentos") ?? []).map(mapear);
}

export async function gravarMarkdown(key: string, conteudo: string): Promise<void> {
  const r = await supabase().from("workspace_documents").upsert(
    {
      key,
      title: tituloDoDocumento(key),
      document_type: tipoDoDocumento(key),
      content_markdown: conteudo,
      source_path: key,
      updated_at: agoraIso(),
    },
    { onConflict: "key" },
  );
  dados(r, "gravar documento");
}

// Configuração em JSON (antes arquivos .json do vault).
export async function lerConfig(key: string): Promise<Record<string, unknown>> {
  return (await lerDocumento(key))?.structured_data ?? {};
}
