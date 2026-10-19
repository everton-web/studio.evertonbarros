---
description: Salva/atualiza a memória persistente do projeto em MEMORY.md
argument-hint: "[o que memorizar]"
---
Atualize a memória persistente do projeto no arquivo `MEMORY.md` na raiz.

1. Leia `MEMORY.md`.
2. Revise a conversa atual e, se fornecido, foque em: ${@:-tudo o que foi feito nesta sessão}.
3. Atualize as seções:
   - **Última atualização** (data/hora UTC atual)
   - **Estado atual** — o que mudou
   - **Decisões** — escolhas tomadas (evite duplicar as existentes)
   - **Pendências / próximo passo** — o que ficou aberto
   - **Histórico recente** — só se houver commit novo
4. Rode `git log --oneline -5` para conferir o histórico de commits.
5. Mantenha o arquivo curto e objetivo. Não apague o cabeçalho nem a explicação inicial.
6. Mostre um diff resumido do que mudou em `MEMORY.md`.
