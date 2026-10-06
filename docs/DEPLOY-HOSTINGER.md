# Deploy da plataforma no Node.js gerenciado da Hostinger

Guia para publicar `apps/plataforma` (Next 16) na hospedagem Node.js gerenciada da Hostinger, com dados no Supabase. O app gerenciado não tem disco persistente nem processos filhos, por isso console do pi, mirror, orquestra por processo e prospector ficaram fora da plataforma (decisão A em `docs/MIGRACAO-SUPABASE.md`) e continuam na VPS.

## 1. Supabase (uma vez)

1. Criar o projeto no Supabase (região mais próxima: São Paulo).
2. SQL Editor > New query > colar `supabase/SETUP-COMPLETO.sql` inteiro > Run.
3. Conferir em Storage que o bucket `plataforma-arquivos` existe e está **privado**.
4. Project Settings > API: copiar a URL do projeto e a chave `service_role`. A chave `anon` não é usada.

O schema liga RLS em todas as tabelas e nega acesso a `anon` e `authenticated`. Só a service role, no servidor, lê e grava.

## 2. Configuração do app na Hostinger

| Campo no hPanel | Valor |
|---|---|
| Repositório | o repositório desta plataforma, na branch aprovada pelos sócios |
| Diretório raiz | `apps/plataforma` |
| Framework | Next.js |
| Versão do Node | **22.x** (mínimo 20.9, exigido pelo Next 16 e pelo supabase-js) |
| Instalação | `npm ci` |
| Build | `npm run build` |
| Start | `npm run start` |

`npm run start` executa `next start`, que escuta na porta da variável `PORT` definida pela Hostinger.

## 3. Variáveis de ambiente

Cadastrar no painel da Hostinger. A lista completa, com comentários, está em `.env.example`. **Nenhuma** pode ter o prefixo `NEXT_PUBLIC_`.

| Variável | Obrigatória | Uso |
|---|---|---|
| `SUPABASE_URL` | sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | Chave service role, segredo do servidor |
| `SUPABASE_STORAGE_BUCKET` | não | Bucket privado, padrão `plataforma-arquivos` |
| `AGENCIA_USER` | sim | Usuário do login |
| `AGENCIA_PASS` | sim | Senha do login (o app não sobe em produção sem ela) |
| `AGENCIA_SECRET` | sim | Segredo do cookie de sessão (`openssl rand -hex 32`) |
| `AGENCIA_COFRE_KEY` | sim, se houver credenciais | A mesma chave do SQLite antigo, senão as senhas importadas não abrem |
| `LEADS_TOKEN` | sim, se houver formulários | Token dos formulários externos em `/api/leads` |
| `RELATORIO_BASE_URL` | não | Base dos links de relatório, padrão `https://app.evertonbrito.com` |
| `INFINITEPAY_HANDLE`, `INFINITEPAY_REDIRECT_URL`, `INFINITEPAY_WEBHOOK_URL` | se usar cobranças | Integração InfinitePay |
| `GOOGLE_PLACES_KEY` | não | Análise de presença |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | não | Chat |

Variáveis antigas que **não** existem mais: `VAULT`, `AGENCIA_DB`, `ARQUIVOS_DIR`, `PI_CLI`, `AGENCIA_CWD`.

## 4. Importar os dados antigos (na VPS, antes do corte)

O importador roda na VPS, onde estão o vault, o SQLite e a pasta de arquivos. Ele não roda na Hostinger. Precisa de Node 22.13 ou mais novo (usa `node:sqlite`).

```bash
cd apps/plataforma
# .env.local só com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
node --env-file=.env.local scripts/importar-supabase.mjs scan    --vault /srv/asymmetrics/vault --sqlite /caminho/agencia.db
node --env-file=.env.local scripts/importar-supabase.mjs dry-run --vault /srv/asymmetrics/vault --sqlite /caminho/agencia.db \
  --arquivos /caminho/arquivos --docs ../../docs --sala ../_scripts/orquestra/sala.json --site-relatorios ../site/src/data/relatorios
node --env-file=.env.local scripts/importar-supabase.mjs apply   (mesmos argumentos)
node --env-file=.env.local scripts/importar-supabase.mjs verify  (mesmos argumentos)
```

- `scan` e `dry-run` não falam com o Supabase. O `dry-run` grava `importacao-dry-run.json` com conflitos, rejeitados e o plano, sem segredos. Esse arquivo tem dados de clientes e fica fora do git.
- `apply` é idempotente: rodar de novo atualiza as mesmas linhas. Movimentações de leads e mensagens da sala só entram se o destino ainda estiver vazio.
- `verify` sai com código 1 se faltar linha, se a soma paga do financeiro for menor, se algum checksum de arquivo divergir ou se a amostra de empresas não bater.
- Tokens antigos de briefing e relatório são importados (com hash) para os links continuarem funcionando. Rotacionar depois do corte.

## 5. Conferência depois do deploy

1. Abrir `/login` e entrar.
2. Painel, Pipeline, Clientes, Agenda, Arquivos e Demandas carregam sem erro.
3. Enviar um arquivo em Arquivos, abrir e apagar.
4. Abrir um link `/r/<token>` de relatório e um `/b/<token>` de briefing.
5. `GET /api/t?site=teste` devolve o GIF e incrementa `tracking_sites`.

Rollback: apontar o domínio de volta para a instância antiga na VPS, que continua lendo vault e SQLite (eles não são alterados pela importação).

## O que não roda mais na plataforma

| Recurso | Onde fica agora |
|---|---|
| Console do pi | tmux `asym` na VPS |
| Mirror da sessão | VPS |
| Prospecção automática | `_scripts` na VPS; os leads entram pelo `/api/leads` ou pelo importador |
| Publicação de relatório por git | `reports` no Supabase; o site lê em `GET /api/relatorio/publico/<slug>` |
