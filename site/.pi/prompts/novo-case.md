---
description: Adiciona um novo case ao portfólio (dados + capa + validação)
argument-hint: "<nome do projeto>"
---
Use a skill `portfolio-case` para adicionar um novo case ao portfólio.

Projeto: ${1:novo case}

Siga o processo da skill: registre o objeto em `src/data/projects.ts` (slug único em kebab-case), oriente sobre a imagem de capa em `public/projects/<slug>.png`, valide com `npx tsc --noEmit` e rode `npm run lint`. Se algum dado (URL do Behance, categoria, ano) não estiver claro, pergunte antes de inventar.
