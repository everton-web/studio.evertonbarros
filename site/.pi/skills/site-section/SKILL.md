---
name: site-section
description: Criar ou alterar seções/componentes visuais do site evertonbrito.com seguindo o design system, i18n e padrões de motion. Use ao adicionar uma nova seção, refatorar um componente de seção ou ajustar layout/estilo.
---

# Criar / alterar seção do site

## Antes de codar

1. Leia `DESIGN-SYSTEM.md` (tokens, tipografia, botões, cards, motion) e o componente de referência mais próximo em `src/components/`.
2. Verifique se o texto já existe em `src/lib/i18n.ts`; se não, adicione em **pt e en** (ver skill `i18n-copy`).
3. Se for seção nova, registre-a em `src/app/page.tsx` na ordem narrativa (Hero → Metrics → About → Services → Portfolio → Contact → Footer).

## Padrão de componente de seção

```tsx
"use client"; // só se houver hook/evento/motion

import { useLang } from "@/context/LanguageContext";
import { AnimatedSection } from "./AnimatedSection";

export function MinhaSecao() {
  const { t } = useLang();
  return (
    <section id="minha-secao" style={{ background: "var(--bg-soft)", padding: "var(--section-y) 0" }}>
      <div className="mx-auto w-full max-w-[1280px] px-8 max-md:px-6">
        <AnimatedSection>
          {/* conteúdo */}
        </AnimatedSection>
      </div>
    </section>
  );
}
```

## Regras

- Use tokens CSS, não valores literais: `var(--accent)`, `var(--bg-card)`, `var(--text-secondary)`, `var(--border)`, `var(--radius-lg)`, `var(--section-y)`.
- Headlines editoriais usam a classe `.serif` (DM Sans 300 italic, accent) para palavras-chave.
- Reveal de elementos: `<AnimatedSection>` (up/left/right, `delay`). Hover de card: `y: -4px` + borda `--border-hover`; linha accent de 3px com `scaleX 0→1`.
- `id` de seção em kebab-case (usado por âncoras do Header).
- Acessibilidade: um único `<h1>` (Hero); imagens com `alt` significativo; botões com `aria-label` quando só ícone.

## Checklist

- [ ] Sem texto hardcoded (tudo em `i18n.ts`, pt + en)
- [ ] Tokens do design system (zero cor/espaço inventado)
- [ ] Motion com ease `[0.22, 1, 0.36, 1]` e `once: true`
- [ ] Responsivo (mobile-first, `max-md:`/`md:`)
- [ ] `npm run lint` e `npx tsc --noEmit` limpos
