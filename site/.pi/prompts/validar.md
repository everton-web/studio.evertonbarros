---
description: Valida o projeto (lint, types e build) antes de commit/deploy
---
Valide o estado atual do projeto antes de commit/deploy:

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run build`

Resuma os resultados e liste qualquer erro/aviso com arquivo:linha e a correção sugerida. Se tudo passar, confirme que o projeto está pronto para commit.
