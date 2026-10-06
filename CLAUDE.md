# agencia-app — Claude Code

App SaaS da Marca Digital (Next 16 + Tailwind v4 + shadcn/ui na branch master).

## Comece por aqui

1. Leia `../CLAUDE.md` (raiz do projeto) — briefing da operação.
2. Vault: `D:\Obsidian - Claude\🏢 Agência\00 COMANDO.md` (fonte da verdade).
3. `.env.local`: credenciais (fora do git). Existem: `LEADS_TOKEN`, `INFINITEPAY_HANDLE`, `INFINITEPAY_REDIRECT_URL`.

## Estrutura

- `src/app/api/<modulo>/route.ts` — endpoints (pipeline, prospector, financas, infinitepay/webhook, leads, t, analytics, kanban, inbox, data, login)
- `src/components/` — dashboard.tsx (shell), pipeline.tsx (prospecção), analytics.tsx, rastreamento.tsx, financas (dentro do dashboard), ui/ (shadcn)
- `src/lib/` — vault.ts (fonte da verdade), prospector.ts (busca+auditoria), infinitepay.ts (links/webhook/placar), auth.ts
- `globals.css` — tokens da IDV (laranja #FF4000, DM Sans/DM Mono/Inter) + tokens shadcn mapeados

## Regras

- Nunca commitar `.env.local`/segredos.
- Estado vive no vault (markdown/JSON), não em memória.
- UI nova: siga a skill `ui-studio` (shadcn/shoogle) e audite com `impeccable` antes de entregar (meta: 0 achados graves).
- Teste local: `npm run build && npm run start -- -p 3100`, login com as credenciais do `.env.local` (`AGENCIA_USER`/`AGENCIA_PASS`).
- Branch `ui-studio-test` pode existir como standby; produção = master.

> Nota: o banner do AGENTS.md é regenerado pelo Next — não o remova do diff.