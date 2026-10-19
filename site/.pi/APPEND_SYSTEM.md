# Convenções do projeto evertonbrito.com

Portfólio pessoal de Everton Brito (Web Designer / UX-UI). Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4, Framer Motion. TypeScript estrito.

## Estrutura

- `src/app/` — App Router: `layout.tsx` (metadata/SEO + JSON-LD), `page.tsx` (composição das seções), `globals.css`, `robots.ts`, `sitemap.ts`, `icon.svg`.
- `src/components/` — componentes de seção e UI (`Hero`, `Metrics`, `About`, `Services`, `Portfolio`, `Contact`, `Footer`, `Header`, `AnimatedSection`, `MagneticButton`, `CustomCursor`, `TriangleIcon`, `LanguageToggle`).
- `src/context/LanguageContext.tsx` — provider de idioma (`useLang()` → `{ lang, setLang, t }`).
- `src/lib/i18n.ts` — dicionário `pt`/`en` (`translations`). Fonte única de todo texto visível.
- `src/data/projects.ts` — dados do portfólio (`Project[]`).
- `public/projects/` — capas dos cases.

Legado estático na raiz (`index.html`, `css/`, `js/`, `send-form.php`) **não** faz parte do app Next — não editar por engano.

## Regras

1. **Texto nunca hardcoded em componente.** Toda string visível vive em `src/lib/i18n.ts`, em `pt` **e** `en`, com a mesma forma. Componentes leem via `useLang()`.
2. **Siga `DESIGN-SYSTEM.md`.** Use os tokens CSS (`--accent`, `--bg-card`, `--section-y`, etc.) e as escalas tipográficas. Não invente cores/espaçamentos.
3. **Motion:** ease padrão `[0.22, 1, 0.36, 1]`; reveal via `<AnimatedSection>`; durações 0.8s (reveal) / 0.4s (hover) / 0.2s (micro). Animações de entrada usam `whileInView` com `once: true`.
4. **`"use client"`** apenas quando há hooks/eventos/motion. Prefira Server Components quando possível.
5. **Ao alterar o layout**, mantenha PT e EN renderizando sem quebra (testar mentalmente os dois idiomas; EN costuma ser mais curto, PT mais longo).
6. Antes de finalizar, rode `npm run lint` e `npx tsc --noEmit`.
7. Não editar o bloco `<!-- BEGIN:nextjs-agent-rules -->` de `AGENTS.md` — ele é gerido por `next dev`.
8. **Memória persistente:** ao iniciar a sessão, leia `MEMORY.md` na raiz. Ao final de cada tarefa relevante, atualize `MEMORY.md` (Estado atual, Decisões, Pendências, Última atualização). O comando `/memoria` faz isso sob demanda.
9. **Sempre commite e faça push.** Ao final de cada tarefa relevante, rode `npm run lint` e `npx tsc --noEmit`, faça `git add -A`, `git commit` com mensagem descritiva e `git push` para o remoto. Não deixe trabalho apenas local.

## Comandos

- Dev: `npm run dev` (http://localhost:3000)
- Lint: `npm run lint`
- Types: `npx tsc --noEmit`
- Build: `npm run build`
