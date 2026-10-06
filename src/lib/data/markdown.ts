// Formato Markdown herdado do vault (Obsidian). Funções puras: os documentos
// agora vêm de workspace_documents, mas o texto continua o mesmo.

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s: string) {
  return s
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, a, b) => `<span class="lnk">${(b || a).replace(/.*\//, "").replace(/\.md$/i, "")}</span>`);
}

export function mdToHtml(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;
  let list: { type: string; items: string[] } | null = null;
  const flush = () => {
    if (list) {
      out.push(`<${list.type}>${list.items.map((x) => `<li>${x}</li>`).join("")}</${list.type}>`);
      list = null;
    }
  };
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (t.startsWith("|") && t.endsWith("|")) {
      flush();
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().slice(1, -1).split("|").map((c) => c.trim());
        if (!/^:?-{2,}:?$/.test(cells.join(""))) rows.push(cells);
        i++;
      }
      const thead = rows.length ? rows[0] : [];
      const tbody = rows.slice(1).filter((r) => r.some((c) => c));
      let html = "<table>";
      if (thead.some((c) => c)) html += `<thead><tr>${thead.map((c) => `<th>${inline(esc(c))}</th>`).join("")}</tr></thead>`;
      if (tbody.length) html += `<tbody>${tbody.map((r) => `<tr>${r.map((c) => `<td>${inline(esc(c))}</td>`).join("")}</tr>`).join("")}</tbody>`;
      html += "</table>";
      out.push(html);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) { if (!list || list.type !== "ul") { flush(); list = { type: "ul", items: [] }; } list.items.push(inline(esc(line.replace(/^\s*[-*]\s+/, "")))); i++; continue; }
    if (/^\s*\d+\.\s+/.test(line)) { if (!list || list.type !== "ol") { flush(); list = { type: "ol", items: [] }; } list.items.push(inline(esc(line.replace(/^\s*\d+\.\s+/, "")))); i++; continue; }
    if (t.startsWith(">")) { flush(); const q: string[] = []; while (i < lines.length && lines[i].trim().startsWith(">")) { q.push(lines[i].trim().replace(/^>\s?/, "")); i++; } out.push(`<blockquote>${inline(esc(q.join(" ")))}</blockquote>`); continue; }
    if (/^#{4,}\s/.test(line)) { flush(); out.push(`<h4>${inline(esc(line.replace(/^#{4,}\s/, "")))}</h4>`); i++; continue; }
    if (/^#{3}\s/.test(line)) { flush(); out.push(`<h5>${inline(esc(line.replace(/^#{3}\s/, "")))}</h5>`); i++; continue; }
    if (/^#\s/.test(line)) { flush(); i++; continue; }
    if (/^##\s/.test(line)) { flush(); out.push(`<h3>${inline(esc(line.replace(/^##\s/, "")))}</h3>`); i++; continue; }
    if (t === "") { flush(); i++; continue; }
    flush(); out.push(`<p>${inline(esc(t))}</p>`); i++;
  }
  flush();
  return out.join("\n");
}

export function semFrontmatter(md: string): string {
  return md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

export function splitSections(md: string) {
  return semFrontmatter(md).split(/^##\s/m).filter((p) => p.trim()).map((part) => {
    const nl = part.indexOf("\n");
    return { h: nl === -1 ? part.trim() : part.slice(0, nl).trim(), html: mdToHtml(nl === -1 ? "" : part.slice(nl + 1).trim()) };
  });
}

export function frontmatter(md: string): Record<string, string> {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm: Record<string, string> = {};
  if (!m) return fm;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

export const KANBAN_COLS = ["Backlog", "Esta semana", "Fazendo (máx. 2)", "Aguardando cliente", "Feito"];

export function kanbanColumns(md: string) {
  const body = semFrontmatter(md);
  return KANBAN_COLS.map((name) => {
    const re = new RegExp(`^##\\s${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m");
    const m = body.match(re);
    if (!m) return { nome: name, itens: [] as { done: boolean; text: string }[] };
    const start = (m.index ?? 0) + m[0].length;
    const rest = body.slice(start);
    const next = rest.search(/^##\s/m);
    const section = next === -1 ? rest : rest.slice(0, next);
    const itens = section.split(/\r?\n/).map((l) => l.trim())
      .filter((l) => /^-\s*\[( |x)\]\s/.test(l))
      .map((l) => ({ done: /^-\s*\[x\]/.test(l), text: l.replace(/^-\s*\[[ x]\]\s*/, "") }));
    return { nome: name, itens };
  });
}

// ---------- edição por seção ----------
export function sectionRange(lines: string[], heading: string) {
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) { if (/^##\s/.test(lines[i])) { end = i; break; } }
  return { start, end };
}

export function addListItem(lines: string[], range: { start: number; end: number }, line: string) {
  let last = -1;
  for (let i = range.start + 1; i < range.end; i++) {
    if (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i])) last = i;
  }
  lines.splice(last >= 0 ? last + 1 : range.start + 1, 0, line);
}

export function findCheckbox(lines: string[], range: { start: number; end: number }, text: string) {
  for (let i = range.start + 1; i < range.end; i++) {
    const m = lines[i].match(/^(\s*-\s*\[)( |x)(\]\s*)(.*)$/);
    if (m && m[4].trim() === text) return { index: i, match: m };
  }
  return null;
}
