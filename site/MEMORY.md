# MEMORY — evertonbrito.com

> Memória persistente entre sessões e terminais. O agente **lê este arquivo ao iniciar**
> e o **atualiza ao final de cada tarefa relevante** (ver `.pi/APPEND_SYSTEM.md`).
> Mantenha curto e objetivo: é um diário de bordo, não documentação.

- **Última atualização:** 2026-09-24 14:47 UTC

---

## Estado atual

- Projeto Next.js 16 (App Router, Turbopack) + React 19 + Tailwind 4 + Framer Motion.
- App migrado para `src/`; legado estático na raiz (`index.html`, `css/`, `js/`, `send-form.php`) fora do app.
- Site bilíngue PT/EN com toggle e detecção do idioma do browser (`LanguageContext`).
- Hero com `h1` em 2 linhas e destaque inline.
- Formulário: “Tipo de projeto” virou `<select>` com as opções de “O que eu entrego” (4 entregáveis + Consultoria/Mentoria).
- **Serviços reestruturados:** entregáveis agora são Landing Page (R$ 1.997), Página de Vendas (R$ 2.297), One Page (R$ 1.897) e Site Institucional (R$ 3.097) — todos “a partir de”.
- **Seção especial** dentro de Serviços: Consultoria (R$ 197/sessão) e Mentoria (R$ 2.997 · 6 meses, encontros a cada 15 dias).
- Removidos da oferta: UX/UI, Página de Captura e Mentoria como entregáveis; UX/UI saiu do hero, skills e rodapé.
- Campo de WhatsApp (PT) com máscara `(DD) 00000-0000` conforme digita; aceita fixo (10) e celular (11) e remove DDI 55 colado.
- Cursor customizado segue o ponteiro sem atraso (removido `useSpring`).
- Favicon atualizado (`src/app/icon.svg`).
- **Formulário de contato integrado ao Google Sheets** (planilha `1UqaWnSn...YGzU`):
  - `src/app/api/contact/route.ts` → proxy para o Apps Script Web App (evita CORS, esconde a URL).
  - `Contact.tsx` registra o lead e ainda abre o WhatsApp; mostra status de sucesso/erro.
  - Setup: `docs/google-sheets-setup.md`; env `GOOGLE_SHEETS_WEBAPP_URL` (`.env.example`).
  - Apps Script grava a coluna **Contato** como link clicável: telefone → `wa.me` (DDI 55), e-mail → `mailto:`.
  - `.env.local` já configurado com a URL `/exec` do Apps Script (ignorado pelo git).
  - **Bloqueio atual:** o Web App responde `You do not have permission to access the requested document` → a implantação não está com “Quem tem acesso: Qualquer pessoa”. Everton precisa ajustar.
- `main` sincronizado com `origin/main`.

### Memória persistente (criada nesta sessão)

- `MEMORY.md` — memória curada do projeto (este arquivo).
- `.pi/APPEND_SYSTEM.md` regras 8 e 9 — memória persistente e commit/push obrigatórios.
- `.pi/prompts/memoria.md` — comando `/memoria` para salvar sob demanda.

### Qualidade (última verificação)

- `npx tsc --noEmit`: **OK**
- `npm run lint`: **limpo (0 problemas)** — erros de `set-state-in-effect` resolvidos com `useSyncExternalStore`;
  legado `js/**` ignorado no `eslint.config.mjs`.

## Decisões

- Todo texto visível vive em `src/lib/i18n.ts` (`pt` + `en`), nunca hardcoded em componente.
- Seguir `DESIGN-SYSTEM.md` (tokens CSS, escalas tipográficas, motion `[0.22, 1, 0.36, 1]`).
- Memória persistente em `MEMORY.md` (este arquivo), lida/atualizada a cada sessão.
- Sessões do pi já persistem em `~/.pi/agent/sessions/` (`pi --continue` / `/resume`); `MEMORY.md` é o resumo curado, complementar ao transcript.
- **Sempre commit + push ao final de cada tarefa relevante** (regra 9 do `APPEND_SYSTEM.md`); nada de trabalho só local.
- **Leads via Apps Script, não pela API do Sheets:** o browser chama `/api/contact` (same-origin) e o servidor repassa ao Web App do Apps Script. Dispensa service account e mantém a URL fora do cliente.
- **Dropdown de projeto derivado de `t.services`** (core + support) no `Contact.tsx`: nunca sai de sincronia com a seção “O que eu entrego”, já que ambos leem o mesmo i18n.
- **Valores client-only via `useSyncExternalStore`** (`lang` em `LanguageContext`, detecção de touch em `CustomCursor`): evita `setState` em effect e divergência de hidratação.

## Pendências / próximo passo

- **🔴 INCIDENTE (2026-09-24): `app.evertonbrito.com` fora do ar (HTTP 502) — Cloudflare Tunnel `agencia`.**
  O 502 é gerado pela **borda da Cloudflare** (body `error code: 502`, sem headers do app) — não é
  o código (build local passa; GitHub 100% sincronizado, `origin/main` = último commit).
  `evertonbrito.com`/`www` seguem 200 (Hostinger/LiteSpeed + Next).
  **Registro DNS do `app`: tipo `Túnel`, alvo `agencia`, com proxy (laranja), TTL Auto.**
  **Tunnel encontrado:** nome `agencia` — ID `3386ae1d-af71-4650-90d6-ae4ff154d919`,
  conta CF `df52c23060f8429e1af62968ea1af744`. Conector roda em **Windows** (`windows_amd64`),
  cloudflared `2026.9.1`, hostnames `gig02`/`gig09`, IP público `179.105.130.103` (rede residencial do Everton).
  Ou seja: `app.evertonbrito.com` depende de um **PC Windows ligado** rodando `cloudflared` + o app local.
  Neste Codespace não há `cloudflared` (sem binário/processo/`~/.cloudflared`/`:3000`) → o túnel roda nesse PC Windows.
  `app`/`www`/apex resolvem para os mesmos IPs CF (104.21.33.64, 172.67.159.70); autoritativo (`candy.ns.cloudflare.com`)
  também devolve só A (proxy esconde o alvo real — não dá pra extrair o UUID por fora).
  **Próximo passo:** checar no painel se conectores `gig02`/`gig09` estão Healthy/Offline e qual o Service URL
  do public hostname; no Windows: `Get-Service cloudflared` / `Restart-Service cloudflared`, `netstat -ano | findstr :<porta>`,
  e subir o app em produção (`next start` como serviço + `cloudflared` como serviço, env `GOOGLE_SHEETS_WEBAPP_URL`).
  Setup frágil (PC residencial) — considerar migrar para Hostinger Node/Vercel e aposentar o tunnel.
  **Hipótese forte:** PC Windows entrou em **suspensão/desligou** (queda do conector → 502; ao acordar o
  cloudflared reconecta mas o app local em janela de terminal não volta). Confirmar no painel (Last seen
  dos conectores) e no Windows (`Get-WinEvent` Kernel-Power Id 42/107/109, `powercfg /lastwake`).
  Prevenção: `powercfg /change standby-timeout-ac 0` + cloudflared e app como **serviços** auto-start/restart.
- **Último commit:** `2b66485` — 2026-09-23 19:11 UTC (feat services: entregáveis + preços + consultoria/mentoria).

0. **Restyle com 21st.dev** — pesquisado e aprovado para uso por agentes (robots: ai-input=yes).
   MCP exige API key; páginas públicas expõem o código. Proposta: restilizar seções-chave
   (hero, cards de serviço/pricing, prova social) mantendo a IDV (dark + laranja). Aguardando OK de escopo.
1. Reavaliar SEO/metadata e responsividade PT/EN após os ajustes.
2. **Ativar a integração com o Sheets:** Everton precisa ajustar o Apps Script:
   autorizar o script (rodar uma função uma vez) e, em *Gerenciar implantações*,
   editar a implantação com **Quem tem acesso = Qualquer pessoa** (mantém a mesma URL `/exec`).
   Passo a passo em `docs/google-sheets-setup.md`.

## Comandos

- Dev: `npm run dev` → http://localhost:3000
- Lint: `npm run lint`
- Types: `npx tsc --noEmit`
- Build: `npm run build`

## Histórico recente (commits)

- `b01ed98` feat(contact): dropdown de tipo de projeto a partir dos serviços
- `6883276` fix(contact): só considera sucesso quando o Apps Script devolve JSON ok
- `1d94c39` feat(contact): leads do formulário para o Google Sheets
- `9f9589c` chore(memory): regra de commit/push obrigatórios
- `6564443` commit atual — sistema de memória (`MEMORY.md`, `.pi/`)
- `2dc7b51` icon — `favicon.ico` → `src/app/icon.svg`
- `39f0044` favicon
- `d381070` numero e package — ajuste no `Contact.tsx`
- `13f46ba` refactor(hero): quebra o h1 em 2 linhas
- `fcba0f4` feat: toggle PT/EN com detecção de browser
