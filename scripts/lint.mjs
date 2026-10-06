#!/usr/bin/env node
// Guarda da migração Supabase (Node puro, sem dependências). Falha com código 1 se:
//   1. src importa fs, child_process, node-pty, net, worker_threads ou o legado (vault, db, funil-db);
//   2. alguma variável do Supabase aparece com prefixo NEXT_PUBLIC_;
//   3. um arquivo "use client" importa @/lib/data, @supabase/* ou src/lib/data;
//   4. uma rota em src/app/api não chama isAuthed() e não está na lista de rotas públicas;
//   5. algum arquivo fora de src/lib/data importa @supabase/supabase-js.
// Uso: node scripts/lint.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(RAIZ, "src");

// Rotas sem cookie de sessão, cada uma com a sua proteção própria.
const ROTAS_PUBLICAS = new Map([
  ["src/app/api/login/route.ts", "login (rate limit e senha)"],
  ["src/app/api/logout/route.ts", "só apaga o cookie"],
  ["src/app/api/leads/route.ts", "token LEADS_TOKEN no corpo"],
  ["src/app/api/t/route.ts", "pixel de rastreamento"],
  ["src/app/api/b/[token]/route.ts", "token de briefing por hash"],
  ["src/app/api/infinitepay/webhook/route.ts", "webhook do provedor, idempotente"],
  ["src/app/api/relatorio/publico/[slug]/route.ts", "só relatório já publicado"],
]);

const PROIBIDOS = [
  /from\s+["'](node:)?(fs|fs\/promises|child_process|net|worker_threads|cluster)["']/,
  /require\(\s*["'](node:)?(fs|child_process)["']\s*\)/,
  /node-pty/,
  /["']@\/lib\/(vault|db|funil-db|console|mirror|prospector)["']/,
];

function arquivos(dir) {
  const out = [];
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) out.push(...arquivos(p));
    else if (/\.(ts|tsx|mjs|js)$/.test(nome)) out.push(p);
  }
  return out;
}

const rel = (p) => relative(RAIZ, p).split(sep).join("/");
const erros = [];

function handlersHttp(codigo) {
  const handlers = [];
  const assinatura = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\([^)]*\)\s*\{/g;
  let match;
  while ((match = assinatura.exec(codigo))) {
    let nivel = 1;
    let i = assinatura.lastIndex;
    for (; i < codigo.length && nivel > 0; i++) {
      if (codigo[i] === "{") nivel++;
      else if (codigo[i] === "}") nivel--;
    }
    handlers.push({ metodo: match[1], corpo: codigo.slice(assinatura.lastIndex, i - 1) });
  }
  return handlers;
}

for (const p of arquivos(SRC)) {
  const r = rel(p);
  const s = readFileSync(p, "utf8");
  for (const re of PROIBIDOS) if (re.test(s)) erros.push(`${r}: import proibido no app gerenciado (${re.source})`);
  if (/NEXT_PUBLIC_SUPABASE/.test(s)) erros.push(`${r}: variável do Supabase com NEXT_PUBLIC_`);
  const cliente = /^\s*["']use client["']/.test(s);
  // import type some na compilação e não leva código do servidor para o navegador.
  if (cliente && /^import\s+(?!type\b)[^;]*from\s+["'](@\/lib\/data[^"']*|@supabase\/[^"']+|[./]+lib\/data[^"']*)["']/m.test(s)) {
    erros.push(`${r}: componente cliente importando a camada de dados`);
  }
  if (!r.startsWith("src/lib/data/") && /["']@supabase\/supabase-js["']/.test(s)) {
    erros.push(`${r}: só src/lib/data pode importar @supabase/supabase-js`);
  }
  if (r.startsWith("src/app/api/") && r.endsWith("/route.ts") && !ROTAS_PUBLICAS.has(r)) {
    for (const handler of handlersHttp(s)) {
      if (!/isAuthed\(\)/.test(handler.corpo)) erros.push(`${r}: método ${handler.metodo} sem isAuthed()`);
    }
  }
}

for (const [r] of ROTAS_PUBLICAS) {
  try {
    statSync(join(RAIZ, r));
  } catch {
    erros.push(`${r}: listada como pública mas não existe`);
  }
}

if (erros.length) {
  console.error(erros.map((e) => `✗ ${e}`).join("\n"));
  console.error(`\n${erros.length} problema(s).`);
  process.exit(1);
}
console.log("lint ok: sem fs/child_process/node-pty, sem NEXT_PUBLIC no Supabase, rotas privadas autenticadas.");
