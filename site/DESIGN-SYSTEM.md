# Design System — evertonbrito.com

## Identidade Visual (IDV preservada)

### Marca
- **Símbolo:** Triângulo côncavo (`M50 10 Q58.6 45 84.6 70 Q50 60 15.4 70 Q41.4 45 50 10Z`)
- **Logotipo:** "everton." — DM Sans Semibold, ponto em accent
- **Voz:** Direta, confiante, sem arrogância. Fala como parceiro, não como prestador.

### Cores

| Token | Valor | Uso |
|---|---|---|
| `--accent` | `#FF4000` | CTAs, destaques, links ativos, ponto do logo |
| `--accent-hover` | `#E63800` | Hover de primários |
| `--accent-glow` | `rgba(255,64,0,0.15)` | Box-shadow em hover de botões |
| `--accent-subtle` | `rgba(255,64,0,0.08)` | Backgrounds de ícones, badges |
| `--bg` | `#040404` | Background principal |
| `--bg-soft` | `#0C0C0C` | Seções alternadas |
| `--bg-card` | `#111111` | Cards, inputs |
| `--bg-elevated` | `#1A1A1A` | Cards hover, dropdowns |
| `--text` | `#FBFBFB` | Texto principal |
| `--text-secondary` | `#AAAAAA` | Subtítulos, descrições |
| `--text-muted` | `#888888` | Labels, captions, meta |
| `--text-dim` | `#555555` | Textos desabilitados |
| `--border` | `rgba(255,255,255,0.08)` | Bordas default |
| `--border-hover` | `rgba(255,255,255,0.14)` | Bordas em hover |
| `--border-active` | `rgba(255,255,255,0.24)` | Bordas em foco |

### Tipografia

| Escala | Font | Size | Weight | Line-height | Letter-spacing | Uso |
|---|---|---|---|---|---|---|
| Display | DM Sans | `clamp(4rem, 10vw, 8rem)` | 700 | 0.85 | -0.04em | Hero headline, statement |
| H1 | DM Sans | `clamp(3rem, 7vw, 5.5rem)` | 600 | 0.9 | -0.03em | Headline principal |
| H2 | DM Sans | `clamp(2rem, 4.5vw, 3.5rem)` | 500 | 1.1 | -0.02em | Títulos de seção |
| H3 | DM Sans | `clamp(1.25rem, 2vw, 1.5rem)` | 500 | 1.3 | -0.01em | Subtítulos |
| Body L | DM Sans | 1.125rem | 400 | 1.7 | 0 | Descrições longas |
| Body | DM Sans | 0.95rem | 400 | 1.7 | 0 | Texto corrido |
| Body S | DM Sans | 0.875rem | 400 | 1.5 | 0 | Descrições curtas |
| Caption | DM Sans | 0.8rem | 500 | 1.4 | 0.06em | Labels, categorias |
| Tag | DM Sans | 0.65rem | 600 | 1.2 | 0.12em | Micro-labels, badges |

**Classe `.serif`:** DM Sans Light Italic em `--accent`. Usada para palavras-chave editoriais dentro de headlines (ex: "experiências", "resultado", "selecionados"). Não é Playfair Display — é DM Sans 300 italic.

### Espaçamento

| Token | Valor | Uso |
|---|---|---|
| `--section-y` | `clamp(6rem, 12vh, 10rem)` | Padding vertical de seções |
| `--section-gap` | `clamp(4rem, 8vh, 8rem)` | Gap entre blocos dentro de seção |
| `--container` | 1280px | Max-width do conteúdo |
| `--gutter` | 2rem (32px) / 1.5rem mobile | Padding lateral |
| `--radius-sm` | 12px | Inputs, chips |
| `--radius-md` | 16px | Cards menores |
| `--radius-lg` | 20px | Cards grandes, modais |
| `--radius-full` | 9999px | Botões, pills |

### Botões

| Variante | BG | Border | Texto | Hover |
|---|---|---|---|---|
| Primary | `--accent` | `--accent` | `--text` | `--accent-hover`, shadow glow, y -2px |
| Outline | transparent | `--border` | `--text` | border → `--text`, y -2px |
| Ghost | transparent | none | `--text-muted` | texto → `--text` |
| Icon | `--accent-subtle` | none | `--accent` | bg mais intenso |

Todos: `rounded-full`, `padding: 14px 32px`, `font-size: 0.875rem`, `font-weight: 500`.

### Motion

| Tipo | Config | Uso |
|---|---|---|
| Ease principal | `[0.22, 1, 0.36, 1]` | Todas as transições |
| Reveal | `opacity 0→1, y 30→0, blur 4→0` | Entrada de elementos no viewport |
| Stagger | `0.08s` entre items | Listas, grids |
| Hover card | `y: -4px` | Cards de serviço, portfolio |
| Hover button | `y: -2px, shadow glow` | CTAs |
| Magnetic | `strength: 0.3` | Botões primários |
| Parallax hero | `useScroll + useTransform` | Texto cinético, card flutuante |
| Custom cursor | `spring: {damping:25, stiffness:400}` | Bolinha mix-blend-difference |
| Text reveal | `y: 110% → 0%, rotateX: -15 → 0` | Hero headline, word by word |
| Duration reveal | 0.8s | Entrada |
| Duration hover | 0.4s | Interações |
| Duration micro | 0.2s | Feedback imediato |

### Cards

| Propriedade | Valor |
|---|---|
| Background | `--bg-card` |
| Border | `1px solid --border` |
| Border radius | `--radius-lg` (20px) |
| Padding | 40px (p-10) |
| Hover border | `--border-hover` |
| Hover translate | y: -4px |
| Accent line | 3px bottom, `scaleX 0→1` on hover |

### Inputs

| Propriedade | Valor |
|---|---|
| Background | `rgba(255,255,255,0.04)` |
| Border | `1px solid --border` |
| Border radius | `--radius-sm` (12px) |
| Padding | 14px 16px |
| Focus border | `--accent` |
| Focus background | `rgba(255,64,0,0.04)` |
| Placeholder | `rgba(255,255,255,0.2)` |

---

## Arquitetura de Seções (Redesign)

### Fluxo narrativo proposto

O site deve contar uma história em 7 beats, não apenas listar informações:

```
1. IMPACTO        → Hero com statement bold + prova visual
2. CREDIBILIDADE  → Números + logos/badges
3. POSICIONAMENTO → Quem é + como trabalha (editorial, não bio)
4. ENTREGA        → Serviços com hierarquia (core vs. complementar)
5. PROVA          → Portfolio com destaque pro case mais forte
6. CONFIANÇA      → Depoimentos ou resultados reais
7. AÇÃO           → CTA forte + formulário enxuto + WhatsApp direto
```

### 1. Hero — Impacto

**Problema atual:** "Criando experiências digitais" é genérica. Headline + subtexto + CTA + card flutuante + kinetic text = muita informação competindo.

**Proposta:**
- Headline bold: statement de resultado, não de atividade. Ex: "Sites que vendem. Não só existem."
- Subtexto curto (1 frase)
- Um CTA apenas
- Texto cinético no fundo (manter — é assinatura da IDV)
- Remover card flutuante (distrai, não converte)
- Adicionar um indicador de scroll sutil

### 2. Social Proof Bar — Credibilidade

**Problema atual:** Não existe.

**Proposta:**
- Strip horizontal com números: "40+ projetos", "6 anos", "100% online"
- Ou logos de clientes (se tiver)
- Background `--bg-soft`, sem padding excessivo
- Animação: contagem up dos números ao entrar no viewport

### 3. About — Posicionamento

**Problema atual:** Lê como bio genérica. "6+ anos guiando clientes..." é irrelevante.

**Proposta:**
- Layout editorial assimétrico (texto grande à esquerda, bloco complementar à direita)
- Frase de posicionamento: falar sobre o problema do cliente, não sobre si
- Destaque para processo ou diferencial real
- Possível: foto ou visual que humanize

### 4. Services — Entrega

**Problema atual:** 6 cards iguais. Sem hierarquia. O visitante não sabe o que é principal.

**Proposta:**
- 2 serviços core em destaque (cards grandes, 2 colunas)
- 3-4 complementares menores abaixo
- Cada card com micro-resultado esperado, não descrição genérica
- Ícones mais expressivos ou ilustrações

### 5. Portfolio — Prova

**Problema atual:** 7 cards iguais numa grid 3col. Nenhum destaque.

**Proposta:**
- Projeto destaque: card grande, full-width ou 2/3, com contexto (problema → solução)
- Restante em grid menor
- Hover com parallax (manter)
- Cada card mostrando resultado ou tipo mais claramente

### 6. Testimonials / Results — Confiança (NOVA SEÇÃO)

**Problema atual:** Não existe. Zero prova social.

**Proposta:**
- Se tiver depoimentos: carousel mínimo com aspas + nome + resultado
- Se não tiver: seção de "Resultados" com métricas reais dos projetos
- Placeholder aceito: "Resultados reais de clientes reais" com 2-3 bullet points

### 7. Contact — Ação

**Problema atual:** 5 campos, form não funciona, sem social proof pré-CTA.

**Proposta:**
- Reduzir para 3 campos: Nome, WhatsApp, Tipo de Projeto
- Integrar com WhatsApp (link direto com mensagem pré-formatada)
- Headline de urgência/benefício antes do form
- Frase de confiança embaixo ("Respondo em até 24h")

### 8. Footer — Fechamento

**Problema atual:** Só copyright e "voltar ao topo".

**Proposta:**
- Links sociais (Behance, Instagram, LinkedIn)
- Mini-nav
- "Feito com ▲ por Everton Brito"

---

## SEO & Performance (Plano Técnico)

### SEO
- [ ] JSON-LD: Person + WebSite + ProfessionalService
- [ ] robots.ts
- [ ] sitemap.ts
- [ ] OG Image 1200×630 com triângulo + nome
- [ ] Canonical URL
- [ ] H1 único (hero headline)
- [ ] Alt text significativo em todas as imagens
- [ ] Meta description com keyword + benefício

### Performance
- [ ] Server Components para Header, Footer, About, Services (sem "use client" onde não precisa)
- [ ] Dynamic import + lazy load para seções below-the-fold
- [ ] Framer Motion: importar apenas o necessário (`LazyMotion` + `domAnimation`)
- [ ] Images: WebP com `priority` só na hero, `loading="lazy"` no resto
- [ ] Font: `display: swap` já está, mas remover Playfair se não está sendo usada de fato
- [ ] Preconnect para Google Fonts
- [ ] Lighthouse meta: target 95+ em tudo
