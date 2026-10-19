---
description: Audita as alterações atuais contra o design system e o SEO
argument-hint: "[foco: design|seo|ambos]"
---
Audite as alterações não commitadas deste projeto. Foco: ${1:-design e seo}.

1. Rode `git status` e `git diff` para ver o que mudou.
2. Use a skill `design-audit` para checar tokens, tipografia, motion, acessibilidade e responsividade.
3. Use a skill `seo-audit` para checar metadata, JSON-LD, headings e alt text.
4. Rode `npm run lint` e `npx tsc --noEmit`.

Entregue uma lista priorizada `[alto/médio/baixo] arquivo:linha — problema → correção`. Não altere arquivos ainda; aguarde minha confirmação.
