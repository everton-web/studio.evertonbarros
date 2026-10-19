---
name: i18n-copy
description: Adicionar, editar ou revisar textos bilíngues (PT/EN) em src/lib/i18n.ts mantendo os dois idiomas sincronizados. Use ao mudar qualquer copy visível do site, criar seção nova ou corrigir tradução.
---

# Copy bilíngue (PT/EN)

Toda string visível vive em `src/lib/i18n.ts` no objeto `translations`. Os idiomas `pt` e `en` **devem ter exatamente a mesma forma** (mesmas chaves, mesma estrutura de arrays/objetos).

## Processo

1. Abra `src/lib/i18n.ts` e localize o namespace da seção (ex.: `hero`, `metrics`, `about`, `services`, `portfolio`, `contact`, `footer`).
2. Adicione/edite a chave em `pt` **e** `en`. Nunca só em um idioma.
3. Mantenha arrays com o mesmo comprimento e objetos com as mesmas chaves.
4. Em componentes, consuma via `const { t } = useLang();` e `t.secao.chave`. Nunca escreva texto direto no JSX.
5. Se a mudança de idioma precisa reanimar algo, use `key={lang}` (padrão já usado no `Hero`).

## Convenções de copy

- Tom: direto, confiante, sem arrogância. Fala como parceiro, não prestador.
- Foque em resultado/benefício, não em atividade ("Sites que vendem", não "Criando sites").
- PT-BR natural; EN enxuto e profissional.
- Palavras-chave editoriais (destaque `.serif`) são marcadas com `{ t, accent: true }` quando o trecho é estruturado em segmentos (ver `hero.lines`).

## Validação

- `npx tsc --noEmit` — o tipo `Dict` deve continuar válido.
- Revise os dois idiomas renderizando mentalmente (EN é mais curto, PT mais longo — evite quebras de layout).
- Rode `npm run lint`.
