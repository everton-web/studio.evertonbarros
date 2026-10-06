# IDV v2 — "Comando"

> Identity visual da plataforma da agência Marca Digital (agencia-app).
> Reconstrução total: paleta do zero, **Inter para tudo**, layout/espaço/densidade/componentes novos.
> Âncoras visuais: card **"Impact."** + dashboard **"Predictive Churn Flagging"** (refs do Everton).
> Fundamentos: elevação por **superfície** (não sombra), **um** accent, densidade média, microestados completos.

---

## 1. Princípios (não negociáveis)

1. **Nunca preto puro.** Canvas é cinza-escuro aquecido; profundidade vem de degraus de luminosidade (3–6% por nível).
2. **Um accent.** `#FF4000` só para ação, estado ativo e foco. Nunca preenche card, nunca decora fundo.
3. **Borda é reforço, não muleta.** Hairline translúcida; quando a superfície já distingue, some a borda.
4. **Respiro médio.** Nem cockpit denso (Grafana), nem app vazio. Base 14px, card 20–24px de padding.
5. **Inter para tudo.** UI, números, rótulos e títulos. Sem segunda família de display. Números sempre tabulares.
6. **Microestados completos.** default · hover · focus-visible · active · disabled · loading · empty.
7. **Hierarquia por peso e cor, não por tamanho gigante.** Display só no topo da view.
8. **Piso legível:** nada abaixo de **11px**; texto de UI ≥ **12px**; contraste de texto ≥ **4.5:1**.

---

## 2. Cores

### Superfícies (degraus)
| Token | Hex | Uso |
|---|---|---|
| `--bg-0` | `#0A0A0B` | canvas (fundo do app) |
| `--bg-1` | `#101012` | painel, sidebar, coluna de board |
| `--bg-2` | `#141416` | card, superfície de conteúdo |
| `--bg-3` | `#1A1B1D` | raised / hover / inputs |
| `--bg-4` | `#212224` | overlay, popover, modal |

### Traços
| Token | Valor | Uso |
|---|---|---|
| `--line` | `rgba(255,255,255,.08)` | hairline padrão |
| `--line-2` | `rgba(255,255,255,.14)` | hover / divisor forte |

### Tinta
| Token | Hex | Uso |
|---|---|---|
| `--ink` | `#F5F5F4` | texto primário / títulos |
| `--ink-2` | `#C4C4C0` | corpo em cards |
| `--muted` | `#8C8C88` | secundário, rótulos |
| `--dim` | `#6A6A66` | placeholder, desabilitado |

### Marca e semânticas
| Token | Hex | Uso |
|---|---|---|
| `--accent` | `#FF4000` | ação primária, ativo, foco |
| `--accent-2` | `#FF5C22` | hover do accent |
| `--accent-ink` | `#0D0D0E` | texto sobre accent |
| `--success` | `#3DDC84` | ok, dinheiro, concluído |
| `--info` | `#54B8F0` | informação, em progresso |
| `--warn` | `#E0A83C` | atenção, dourado |
| `--danger` | `#FB6A6A` | erro, destrutivo |
| `--violet` | `#A86FF0` | agente/IA, terciário |

### Série de dados (gráficos em dark)
`--s1 #FF4000` · `--s2 #54B8F0` · `--s3 #3DDC84` · `--s4 #A86FF0` · `--s5 #E0A83C` · `--s6 #F06E9C`

---

## 3. Tipografia (Inter)

Família única: **Inter**. Números sempre com `font-variant-numeric: tabular-nums`.
JetBrains Mono apenas em superfície de código/terminal (exceção técnica, nunca em UI).

| Estilo | Size / line | Peso | Tracking | Uso |
|---|---|---|---|---|
| Display | 28px / 1.15 | 600 | -0.02em | número-herói da view |
| H1 (view) | 24px / 1.2 | 600 | -0.025em | título da página |
| H2 (seção) | 18px / 1.3 | 600 | -0.015em | título de bloco |
| H3 (card) | 15px / 1.4 | 600 | -0.01em | título de card |
| Body | 14px / 1.5 | 400 | -0.006em | texto padrão |
| Small | 13px / 1.5 | 400 | 0 | metadados |
| Label | 12px / 1.4 | 500 | +0.06em | rótulos (uppercase) |
| Micro | 11px / 1.4 | 500 | +0.04em | legenda mínima |
| Num | tabular | 500–600 | -0.01em | métricas |

---

## 4. Espaço, raio, layout

- **Escala (base 4):** 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64.
- **Raio:** sm `8` · md `12` · lg `16` (card) · full `999` (chip/botão pill).
- **Sidebar:** `256px` expandida · `68px` colapsada (só ícones + tooltip).
- **Conteúdo:** `max-w 1440px`, gutter `24px`; padding da página `24px` mobile → `40px` desktop.
- **Ritmo de componente:**
  - Card de conteúdo: padding `24px`.
  - Card de item (task/lead): padding `14–16px`.
  - Altura de controle: `36px` (sm) · `40px` (md) · `44px` (lg).
  - Gap entre cards: `10–12px`; entre seções: `32–40px`.

---

## 5. Componentes

- **Sidebar** (`--bg-1`, border-right hairline): marca (triângulo + nome), grupos Operar/Crescer, item ativo com barra accent e fundo `bg-3`, rodapé com placar + sair.
- **Header de view:** label (kicker) + H1 + subtítulo + ações à direita. Um só padrão em todas as views.
- **Card / Section:** `--bg-2`, raio 16, padding 24, hairline. Sem glow.
- **StatCard:** label + número (Display) + delta (12px, cor semântica) + sparkline opcional.
- **Chip/Tag:** pill, `--bg-3`, texto 12px.
- **BoardColumn:** `--bg-1`, raio 16, largura fixa `300px`, cabeçalho (nome + contador em chip), corpo com scroll interno, rodapé "adicionar".
- **TaskCard:** `--bg-2`, raio 12, padding 14–16, **ações reveladas no hover/focus** (rodapé próprio — nunca inline ao lado do texto).
- **Botões:** primário (accent + ink escuro), secundário (`bg-3` + hairline), ghost (só texto). Alturas 36/40.
- **Input:** `bg-3`, hairline, altura 40, foco = ring accent 3px translúcido.
- **Empty state:** ícone + frase + CTA. Nunca só "vazio".
- **Assistente (transversal):** botão flutuante / `⌘K` em qualquer tela; **não** é aba.

---

## 6. Navegação (Auditoria de Abas embutida)

De **11 abas → 6 destinos** + assistente transversal:

```
OPERAR (o dia)                 CRESCER (o resultado)
Início                         Comercial
Time & Fila                    Resultados
Projetos                       Conteúdo
                               ─────────────
                               Assistente (⌘K · transversal)
```

| Destino | Absorve | Por quê |
|---|---|---|
| **Início** | Início + captura rápida (Caixa) | KPIs, decisões pendentes e captura inline (INBOX vira ação, não aba) |
| **Comercial** | Prospecção | Pipeline 0→5 + propostas |
| **Projetos** | Projetos | Entrega (kanban) |
| **Time & Fila** | Time + Demandas + Fila | Um lugar para a agência virtual |
| **Resultados** | Métricas + Finanças | Tráfego/CPL/ROI + placar/dinheiro |
| **Conteúdo** | Arquivos + Portfólio | Insumo (uploads) + saída (cases) |
| **Assistente** | (deixa de ser aba) | `⌘K` / botão flutuante em toda tela |

**Regra herdada:** aba só nasce com fluxo de trabalho próprio — nunca com arquivo do vault.
Arquivo do vault vira card, seção ou ação.

---

## 7. Regras de qualidade (impeccable)

Antes de entregar, rodar `impeccable` (desktop 1440 + mobile 390) e zerar:
`undersized-ui-text` (< 11px) · `low-contrast` (< 4.5:1) · `clipped-overflow-container` · `radial-spotlight-glow` · `kicker-above-heading` (sem excessos).

---

## 8. Migração

1. Tokens (`globals.css`) — esta entrega.
2. Primitivos (`ui/kit.tsx`) — esta entrega.
3. Shell (sidebar, header, topbar) + **aba Projetos** — esta entrega.
4. Demais views — por release, 1 passe visual com screenshots antes/depois (`_scripts/shots/`).
