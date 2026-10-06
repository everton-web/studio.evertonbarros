# Agência — App (Next.js)

Ambiente da agência em **Next.js + React + Tailwind**. Substitui a versão vanilla (`painel-agencia/`).

## Rodar

```bash
npm install      # primeira vez
npm run build    # build de produção
npm run start -- -p 3100   # → http://localhost:3100
```

Em dev: `npm run dev` (porta 3000).

Online: `https://app.evertonbrito.com` (via Cloudflare Tunnel → localhost:3100).

## Estrutura

| Arquivo | Papel |
|---|---|
| `src/lib/auth.ts` | sessão por cookie assinado (HMAC) |
| `src/lib/vault.ts` | lê/escreve no vault Obsidian (`D:/Obsidian - Claude/🏢 Agência`) |
| `src/app/api/login|logout|data|inbox|kanban/route.ts` | API |
| `src/app/login/page.tsx` + `components/login-form.tsx` | tela de login |
| `src/app/page.tsx` + `components/dashboard.tsx` | o painel (sidebar + views) |

## Login

- Credenciais: definidas no `.env.local` (`AGENCIA_USER`/`AGENCIA_PASS`) — obrigatórias em produção.
- Cookie de sessão válido por 7 dias.

## Vault (fonte da verdade)

`D:/Obsidian - Claude/🏢 Agência/` — `00 COMANDO.md`, `01 Kanban.md`, `10 INBOX.md`, `20 BACKLOG.md`, `10 Agentes/`, `60 Financeiro/Placar.md`.
