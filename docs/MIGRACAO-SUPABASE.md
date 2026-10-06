# Migração para Supabase, etapa 2

## Escopo e premissas

Esta etapa conclui a troca da persistência local da plataforma por Supabase Postgres e Storage no ambiente Node.js gerenciado da Hostinger. A aplicação usa a service role somente no servidor. O vault e o SQLite ficam como fontes de importação e evidência até a validação do corte.

O código usa uma camada única em `src/lib/data`, sem adaptador legado. Rotas não importam o SDK do Supabase diretamente.

## Resultado da etapa 2

A opção A foi escolhida e implementada. Console do pi, mirror e disparo do prospector não fazem parte da plataforma hospedada. Essas operações continuam na VPS por CLI, fora do processo web. A orquestração de demandas permanece na plataforma porque foi convertida para dados no Supabase e não inicia processos locais.

As 32 rotas originais foram cobertas da seguinte forma:

1. Vinte e seis rotas permaneceram: `/api/agenda`, `/api/analise`, `/api/analytics`, `/api/b/[token]`, `/api/banco`, `/api/briefing`, `/api/chat`, `/api/clientes`, `/api/comercial`, `/api/data`, `/api/file/[...name]`, `/api/files`, `/api/financas`, `/api/inbox`, `/api/infinitepay/webhook`, `/api/kanban`, `/api/leads`, `/api/login`, `/api/logout`, `/api/orquestra`, `/api/pipeline`, `/api/relatorio-mensal`, `/api/relatorio`, `/api/saude`, `/api/t` e `/api/upload`.
2. Seis rotas saíram pela opção A: `/api/console`, `/api/console/input`, `/api/console/resize`, `/api/console/stream`, `/api/mirror` e `/api/prospector`.
3. Uma rota pública nova foi criada: `GET /api/relatorio/publico/[slug]`, que serve somente diagnósticos de lead já publicados no Supabase.

O resultado atual é de 27 rotas: 26 rotas originais preservadas e uma rota pública nova.

## Inventário das dependências atuais

| Origem | Uso atual | Limitação no Hostinger gerenciado | Destino proposto |
|---|---|---|---|
| `src/lib/vault.ts` | Lê e grava comando, inbox, backlog, kanban, agentes, fichas de leads, movimentações, análise, financeiro e rastreamento | Depende de caminho e disco persistente | `workspace_documents`, `companies`, `contacts`, `lead_movements`, `lead_analyses`, `tracking_sites` |
| `src/lib/db.ts` e `src/lib/schema.sql` | Inicializam `node:sqlite` em `AGENCIA_DB`. Chamam `getDb()` nominalmente `empresas.ts`, `funil-db.ts`, `clientes.ts`, `cofre.ts`, `briefing.ts` e `relatorio-mensal.ts`, além de `contrato.ts` | Arquivo SQLite local não é persistência segura | Postgres via Supabase |
| `src/lib/files.ts` e `ARQUIVOS_DIR` | Lista, grava, lê e apaga uploads | Disco local não é garantido | bucket privado `plataforma-arquivos` e tabela `stored_files` |
| `src/lib/console.ts` | Mantém um PTY do pi em memória, envia entrada, resize e SSE | `node-pty` e processo filho não são suportados | Opção A ou B descrita abaixo |
| `src/lib/prospector.ts` | Lê leads e estado no vault, faz HTTP e chama `_scripts/ia.mjs` com processo filho | Disco e processo filho não são suportados | Persistência em `prospector_runs`; execução removida ou via ponte VPS |
| `src/lib/mensagens.ts` | Templates e montagem de mensagens em código | Não depende de disco nem processo | Manter em código inicialmente; tabela de templates é opcional e fora desta migração |
| `src/lib/publicar-relatorio.ts` | Executa Git, commit e push em dois repositórios | Processo filho, worktree e Git não estão disponíveis | Remover publicação por Git; relatório deve ser servido por `reports` ou exportado por serviço externo |
| `src/lib/analise.ts` | Faz HTTP e salva JSON no vault | Escrita em disco | `lead_analyses`; HTTP pode continuar no servidor |
| `src/lib/reunioes.ts` | Um Markdown por reunião | Disco local | `meetings` |
| `src/lib/clientes.ts` | Combina SQLite com 40 fichas `40 Comercial/Clientes/*.md`, registros de `SaaS/Financeiro`, saúde de `SaaS/Saude` e `SaaS/Rastreamento/hits.json` | Dados de um mesmo cliente estão divididos entre SQLite e três áreas do vault | `companies`, `contacts`, `briefings`, `credentials`, `contracts`, `financial_transactions`, `health_alerts` e `tracking_sites` |
| `src/lib/orquestra.ts` e `src/lib/demandas.ts` | Demandas em Markdown no vault e sala em `_scripts/orquestra/sala.json`; `estadoAgentes()` é calculado das demandas em andamento, não lido de arquivo vivo | Disco local; o estado derivado precisa preservar a mesma regra | `agent_demands`, `agent_messages`; calcular o estado dos agentes por consulta às demandas |
| `src/lib/infinitepay.ts` | JSON financeiro e placar Markdown, além da API externa | Escrita em disco | `financial_transactions`; atualização do placar vira consulta agregada |
| `src/lib/contrato.ts` | Metadados no SQLite e Markdown no vault | Dois armazenamentos locais | `contracts.content_markdown` e, se necessário, objeto privado no Storage |
| `src/lib/mirror.ts` | Procura e acompanha arquivo JSONL de sessão | Disco local e sessão do pi | Remover ou atender pela ponte VPS |
| `src/lib/saude.ts` | Lê alertas do vault | Disco local | `health_alerts` |
| `src/app/api/analytics/route.ts` | Lê e grava `SaaS/Tráfego/campanhas.json` | Disco local | `campaigns` |
| `src/app/api/t/route.ts` | Lê e grava `SaaS/Rastreamento/hits.json`; throttle em memória | Disco local e contador sujeito a corrida | `tracking_sites` com incremento atômico por função SQL; rate limit externo ou persistente |
| `src/app/api/briefing/route.ts` | Lê Markdown arbitrado dentro de `docs/` | Documentação do checkout não deve ser banco operacional | `workspace_documents` ou Storage, conforme o tipo do documento |
| `src/app/api/login/route.ts` | Rate limit em `Map` do processo | Reinicia e não é compartilhado | Manter apenas como transição; depois usar rate limit externo ou tabela com expiração |

## Mapeamento das fontes para tabelas

| Fonte atual | Tabela ou Storage |
|---|---|
| `40 Comercial/Leads/*.md` | `companies`, `contacts`, `lead_movements`, campos sem correspondência em `companies.raw_source` |
| `40 Comercial/Clientes/*.md` (40 fichas) | Mesclar em `companies`; campos legados sem coluna própria ficam em `companies.raw_source` |
| SQLite `empresa` | `companies` |
| SQLite `contato` | `contacts` |
| SQLite `oportunidade` | `opportunities` |
| SQLite `projeto` | `projects` |
| SQLite `contrato` e `40 Comercial/Contratos/*.md` | `contracts` |
| SQLite `credencial` | `credentials`, preservando o material cifrado, IV e tag |
| SQLite `briefing` | `briefings`; tokens novos armazenados como hash |
| SQLite `relatorio` | `reports`; tokens novos armazenados como hash |
| `SaaS/Prospeccao/analises/*.json` | `lead_analyses` |
| `SaaS/Prospeccao/ultima-leva.json` e `rotacao-brasil.json` | `prospector_runs.summary` e `prospector_runs.rotation_state` |
| `00 COMANDO.md`, `10 INBOX.md`, `20 BACKLOG.md`, `01 Kanban.md`, `10 Agentes/*.md`, `60 Financeiro/Placar.md` | `workspace_documents` |
| `SaaS/Agenda/Reunioes/*.md` | `meetings` |
| `SaaS/Tráfego/campanhas.json` | `campaigns` |
| `SaaS/Rastreamento/hits.json` | `tracking_sites` |
| `SaaS/Financeiro/*` | `financial_transactions` |
| `SaaS/Agentes/Demandas/*.md` | `agent_demands` |
| `_scripts/orquestra/sala.json` | `agent_messages`; mensagens sem demanda mantêm `demand_id` nulo |
| `SaaS/Saude/*` | `health_alerts` |
| `ARQUIVOS_DIR/*` | bucket privado `plataforma-arquivos` e `stored_files` |
| `../site/src/data/relatorios/*.json` | `reports.content`; página pública consulta token válido no servidor |

Conflito importante: leads existem em fichas Markdown e também em SQLite como `empresa`. O importador deve tratar SQLite como autoridade para o estágio CRM e valores comerciais, e a ficha como autoridade para conteúdo de prospecção, contato e histórico. O merge deve ser determinístico por `id`, gerar relatório de conflitos e nunca sobrescrever silenciosamente um valor não vazio.

## Dependência rota por rota

Foram encontradas 32 rotas em `src/app/api`.

| Rota | Métodos | Fonte atual | Destino ou decisão |
|---|---|---|---|
| `/api/agenda` | GET, POST | `reunioes.ts`, Markdown em `SaaS/Agenda/Reunioes` | `meetings` |
| `/api/analise` | GET, POST | fichas via `vault.ts`, JSON via `analise.ts`, Google Places e site do lead | `companies`, `lead_analyses`; integrações HTTP permanecem |
| `/api/analytics` | GET, POST | `SaaS/Tráfego/campanhas.json` | `campaigns` |
| `/api/b/[token]` | POST | SQLite `briefing` | `briefings`, busca server-side por hash do token |
| `/api/banco` | GET | SQLite `empresa` | agregações em `companies` |
| `/api/briefing` | GET | Markdown dentro de `docs/` | `workspace_documents` ou Storage privado |
| `/api/chat` | POST | `buildData()` do vault, personas em código e Gemini | consultas ao `DataStore`; Gemini permanece |
| `/api/clientes` | GET, POST | `clientes.ts`: SQLite; 40 fichas `40 Comercial/Clientes/*.md`; `lerRegistrosCliente()` em `SaaS/Financeiro`; `lerSaude()` em `SaaS/Saude`; `rastreamentoData()` em `SaaS/Rastreamento/hits.json` | `companies`, `contacts`, `briefings`, `credentials`, `contracts`, `financial_transactions`, `health_alerts`, `tracking_sites` |
| `/api/comercial` | GET | SQLite `empresa` | `companies` filtrada por `crm_stage` |
| `/api/console` | POST, DELETE | `node-pty` e processo pi em memória | Opção A remove; opção B chama ponte VPS |
| `/api/console/input` | POST | sessão `node-pty` | Opção A remove; opção B chama ponte VPS |
| `/api/console/resize` | POST | sessão `node-pty` | Opção A remove; opção B chama ponte VPS |
| `/api/console/stream` | GET | buffer e eventos da sessão `node-pty` | Opção A remove; opção B faz proxy de stream autenticado |
| `/api/data` | GET | `buildData()` lê comando, inbox, backlog, kanban, placar, agentes, leads e rastreamento | `workspace_documents`, `companies`, `lead_movements`, `tracking_sites` |
| `/api/file/[...name]` | GET, DELETE | `ARQUIVOS_DIR` | Storage privado e `stored_files` |
| `/api/files` | GET | `ARQUIVOS_DIR` | listagem de `stored_files` |
| `/api/financas` | GET, POST | JSON em `SaaS/Financeiro`, `60 Financeiro/Placar.md` e API InfinitePay | `financial_transactions`; API InfinitePay permanece |
| `/api/inbox` | POST | `10 INBOX.md` via `vault.ts` | `workspace_documents`, preferencialmente operação transacional em item estruturado |
| `/api/infinitepay/webhook` | GET, POST | GET de diagnóstico; POST usa `infinitepay.ts`, arquivos financeiros e placar | GET permanece sem estado; POST usa `financial_transactions`, com idempotência por referência do provedor |
| `/api/kanban` | POST | `01 Kanban.md` via `vault.ts` | `workspace_documents.structured_data`; avaliar tabela de tarefas apenas depois da equivalência |
| `/api/leads` | OPTIONS, POST | token externo e `pipelineOp()` sobre fichas Markdown e SQLite | `companies`, `contacts`, `lead_movements` |
| `/api/login` | POST | variáveis de autenticação, cookie assinado e rate limit em memória | Sem migração de dados imediata; endurecer rate limit em etapa própria |
| `/api/logout` | POST | cookie | Sem dependência de dados |
| `/api/mirror` | GET | arquivo de sessão local via `mirror.ts` | Opção A remove; opção B chama ponte VPS |
| `/api/orquestra` | GET, POST | demandas em `SaaS/Agentes/Demandas/*.md`; sala em `_scripts/orquestra/sala.json`; estado dos agentes calculado das demandas com status `em_andamento` | `agent_demands`, `agent_messages`; estado continua derivado de `agent_demands`, sem arquivo de presença |
| `/api/pipeline` | POST | fichas Markdown via `vault.ts` e SQLite via `funil-db.ts` | `companies`, `contacts`, `lead_movements` |
| `/api/prospector` | GET, POST | vault, cache JSON, rotação JSON, HTTP e processo `_scripts/ia.mjs` | `prospector_runs`; execução segue opção A ou B |
| `/api/relatorio-mensal` | GET, POST | SQLite `empresa` e `relatorio`; hits e leads no vault; `lerSaude()` em `SaaS/Saude`; autorizações e links em `SaaS/Relatorio/config.json` | `companies`, `reports`, `tracking_sites`, `health_alerts`; configuração por cliente em `workspace_documents.structured_data` |
| `/api/relatorio` | GET, POST | `relatorio.ts` lê análise e ficha, grava `../site/src/data/relatorios/*.json` e escreve o campo `relatorio` na ficha; `publicar-relatorio.ts` executa Git; a rota também consulta o site externo | `lead_analyses` e `reports`; eliminar escrita no checkout, atualização da ficha e publicação por Git, ou delegar a ação fixa à ponte |
| `/api/saude` | GET | arquivos em `SaaS/Saude` | `health_alerts` |
| `/api/t` | GET | `hits.json` e throttle em memória | incremento atômico em `tracking_sites`; rate limit fora da memória local |
| `/api/upload` | POST | `ARQUIVOS_DIR` | upload server-side ao bucket e insert em `stored_files` |

## Ordem de migração em etapas pequenas

1. Provisionar um projeto separado de homologação. Aplicar `supabase/migrations/0001_init.sql`, criar o bucket privado e guardar credenciais somente no servidor.
2. Definir interfaces de domínio em uma camada única: empresas, leads, documentos, arquivos, finanças, agenda, relatórios e agentes. Criar adaptador legado e adaptador Supabase com os mesmos contratos e testes de contrato.
3. Construir um importador repetível com modos `scan`, `dry-run`, `apply` e `verify`. Nenhuma rota muda nesta etapa.
4. Importar primeiro o SQLite, depois mesclar fichas de leads e as 40 fichas de clientes, depois JSON e Markdown operacionais, incluindo `_scripts/orquestra/sala.json`, e por fim arquivos para Storage. Registrar checksum, contagens, rejeições e conflitos.
5. Migrar rotas somente leitura e de baixo risco: `/api/banco`, `/api/comercial`, `/api/files`, `/api/saude`, `/api/agenda` GET e `/api/data`.
6. Migrar escrita simples: `/api/agenda` POST, `/api/analytics`, `/api/inbox`, `/api/kanban`, uploads e remoção de arquivos. Usar transações ou RPC para operações de leitura, alteração e auditoria.
7. Migrar CRM: `/api/pipeline`, `/api/leads`, `/api/analise` e `/api/clientes`. Remover a escrita dupla entre ficha e SQLite somente depois de comparar resultados.
8. Migrar briefing, contratos, cofre, finanças e webhooks. Testar idempotência, criptografia e tokens antes do corte.
9. Migrar relatórios e rastreamento. Substituir o fluxo Git de `publicar-relatorio.ts` por leitura server-side de `reports` ou pela opção B.
10. Aplicar a decisão A ou B ao console, mirror, orquestra e prospector. Não levar `node-pty` ou `spawn` ao Hostinger gerenciado.
11. Fazer corte com janela curta: pausar escritas legadas, executar importação incremental, comparar contagens e amostras, trocar o adaptador, executar smoke tests e manter rollback para o adaptador legado.
12. Após período de observação, retirar variáveis e código legado em uma entrega separada. O vault original continua preservado como evidência até aprovação explícita.

## Plano do importador

Criar em etapa posterior um script versionado, por exemplo `scripts/importar-supabase.ts`, sem acoplá-lo ao runtime Next. O script deve:

1. Receber explicitamente `--vault /srv/asymmetrics/vault` e o caminho do SQLite. Não assumir diretório pessoal.
2. Em `scan`, listar fontes, formatos, contagens, IDs duplicados, datas inválidas e referências órfãs sem escrever no Supabase.
3. Em `dry-run`, normalizar frontmatter, datas, moeda e IDs; calcular o plano de `upsert`; emitir JSON de auditoria sem mostrar segredos.
4. Em `apply`, importar na ordem `companies`, filhos do SQLite, fichas e movimentos, documentos, dados operacionais e objetos do Storage. Usar lotes pequenos, chave natural estável e `upsert` idempotente.
5. Calcular SHA-256 dos arquivos, enviar para caminhos opacos e gravar metadados em `stored_files`. Não usar o nome original como caminho do objeto.
6. Em `verify`, comparar contagens, somas financeiras, IDs, checksums e uma amostra de conteúdo. Falhas devem produzir relatório e código de saída diferente de zero.
7. Gravar um manifesto local versionável sem segredos: data, versão do importador, fonte, total lido, importado, ignorado e falhas. Nunca registrar senha, token ou conteúdo de credencial decifrado.

Regras de merge:

- `companies.id` usa o slug atual para preservar URLs e referências.
- SQLite vence para `crm_stage`, valores, fechamento e relacionamentos já normalizados.
- Ficha Markdown vence para texto de prospecção, contato, análise e movimentos.
- Fichas de `40 Comercial/Clientes` complementam a empresa pelo mesmo slug; conflito com campo estruturado não vazio segue a autoridade do SQLite e é registrado no relatório.
- Mensagens de `_scripts/orquestra/sala.json` preservam ordem e remetente; como a fonte não possui vínculo obrigatório com demanda, `agent_messages.demand_id` pode ficar nulo.
- `raw_source` recebe frontmatter não mapeado, permitindo auditoria e migração posterior.
- Tokens de briefing e relatório existentes exigem uma decisão de compatibilidade. Para novos tokens, persistir apenas hash. Para tokens legados, importar temporariamente de forma compatível e rotacionar após o corte.
- Credenciais permanecem cifradas. Validar que `AGENCIA_COFRE_KEY` continuará disponível antes de importar; não decifrar durante o transporte.

## Novas variáveis de ambiente

| Variável | Uso | Exposição |
|---|---|---|
| `SUPABASE_URL` | URL do projeto | Servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | Acesso Postgres e Storage que contorna RLS | Segredo exclusivo do servidor, nunca `NEXT_PUBLIC_*` |
| `SUPABASE_STORAGE_BUCKET` | Nome do bucket privado, padrão planejado `plataforma-arquivos` | Servidor |
| `DATA_BACKEND` | Chave temporária de corte, `legacy` ou `supabase` | Servidor |
| `VPS_BRIDGE_URL` | Base HTTPS da ponte, apenas na opção B | Servidor |
| `VPS_BRIDGE_TOKEN` | Token rotacionável da ponte, apenas na opção B | Segredo exclusivo do servidor |
| `VPS_BRIDGE_HMAC_SECRET` | Assinatura de corpo, timestamp e nonce, recomendada na opção B | Segredo exclusivo do servidor |

Variáveis existentes de integrações, autenticação e cofre continuam até suas etapas específicas. `VAULT`, `AGENCIA_DB`, `ARQUIVOS_DIR`, `PI_CLI` e `AGENCIA_CWD` só podem ser removidas após todas as rotas dependentes terem sido cortadas e verificadas.

## Console do pi e prospector

### Opção A: remover da plataforma

Remover UI e rotas de console, mirror e execução do prospector. O pi e a prospecção continuam operados diretamente na VPS por CLI, fora da plataforma gerenciada.

Custo: menor superfície de ataque, operação e manutenção; nenhuma ponte, streaming ou daemon adicional. Em troca, perde-se controle e observação pelo painel web, exige acesso separado à VPS e há trabalho de remoção e ajuste de navegação. O prospector precisa virar rotina manual ou serviço separado sem comando pela plataforma.

### Opção B: ponte HTTP autenticada para serviço mínimo na VPS

Manter na VPS um serviço pequeno responsável por PTY, mirror e execução do prospector. A plataforma chama endpoints restritos e faz proxy de SSE ou WebSocket. A ponte deve usar TLS, allowlist de ações, token rotacionável, HMAC com timestamp e nonce, limites de taxa, tamanho e duração, logs sem segredos e uma conta Unix sem privilégio. Não aceitar comando de shell arbitrário.

Custo: preserva a experiência web e centraliza o disparo, mas exige daemon supervisionado, domínio ou túnel, certificados, monitoramento, rotação de segredo, protocolo de reconexão, controle de concorrência e resposta a incidentes. Também mantém a VPS como dependência operacional e amplia a superfície de segurança. O fluxo de relatório por Git, se delegado, deve ser uma ação fixa e não um endpoint de shell genérico.

A opção A foi escolhida nesta etapa. Não existe ponte HTTP, endpoint de shell ou dependência de processo filho na plataforma hospedada.

## Segurança e validação

- RLS está ligado em todas as tabelas, uma política explícita nega acesso a `anon` e `authenticated`, e seus grants são revogados.
- A service role fica apenas no servidor. O navegador usa as rotas existentes e nunca acessa Supabase diretamente.
- O bucket é privado. Downloads usam streaming pelo servidor ou URL assinada curta depois de autenticação.
- Tokens públicos devem ser aleatórios, expirar ou poder ser revogados e ser armazenados como hash quando a compatibilidade permitir.
- Webhooks precisam de autenticação do provedor, idempotência e armazenamento do identificador externo.
- Incrementos de rastreamento e mudanças de estágio devem ser atômicos.
- Antes de cada corte: testes de contrato, comparação legado versus Supabase, smoke test de autenticação e rollback documentado.

## Pendências de decisão

1. Definir projeto, região, plano, backups e retenção do Supabase.
2. Executar `scan`, `dry-run`, `apply` e `verify` com os caminhos reais do vault e do SQLite na janela de corte.
3. Rotacionar links legados de briefing e relatório. Tokens novos ficam somente como hash e usam versão para rotação.
4. Definir política de expiração dos links públicos. Revogação e rotação já estão disponíveis.
5. Confirmar `AGENCIA_COFRE_KEY` antes de importar credenciais cifradas.
6. Definir rate limit compartilhado para login, pixel e endpoints públicos.
7. Validar contagens, somas financeiras, arquivos e amostras antes de retirar as fontes locais.
8. Executar smoke tests no ambiente de homologação e documentar o rollback antes do deploy.
