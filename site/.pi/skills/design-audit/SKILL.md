---
name: design-audit
description: Auditar alterações de UI contra o DESIGN-SYSTEM.md — tokens de cor/espaço, tipografia, motion, acessibilidade e responsividade. Use ao revisar um componente, antes de commit ou quando o visual parecer fora do padrão.
---

# Auditoria de design

Compare o código alterado com `DESIGN-SYSTEM.md`. Reporte desvios com arquivo:linha e correção sugerida.

## Verificações

**Tokens**
- Cores/espaçamentos/raios literais em vez de `var(--accent)`, `var(--bg-card)`, `var(--section-y)`, `var(--radius-lg)`, etc.
- Valores que não existem no design system (cor nova, radius novo).

**Tipografia**
- Escala fora das definidas (Display/H1/H2/H3/Body/Caption/Tag).
- Palavra editorial sem `.serif`; uso indevido de fonte diferente de DM Sans.

**Motion**
- Ease diferente de `[0.22, 1, 0.36, 1]`.
- Duração fora de 0.8s/0.4s/0.2s; reveal sem `once: true`; uso de `animate` onde caberia `whileInView`.
- Animações que ignoram `prefers-reduced-motion` (quando aplicável).

**Acessibilidade**
- Mais de um `<h1>`; hierarquia de headings quebrada.
- Imagem sem `alt` significativo; botão só-ícone sem `aria-label`; contraste insuficiente.
- Foco visível preservado.

**Responsividade**
- Falta de breakpoints (`max-md:`, `md:`); overflow horizontal; alvos de toque pequenos.

## Saída esperada

Lista priorizada: `[alto/médio/baixo] arquivo:linha — problema → correção`. Sem reescrever o código antes de listar os achados, a menos que o usuário peça a correção.
