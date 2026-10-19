# Segundo cérebro da agência

Base de conhecimento que os agentes da plataforma leem antes de responder. Cada arquivo em
`biblioteca/` é um módulo de estudo convertido de PDF para Markdown, com marcadores de página
(`<!-- p. N -->`) para citação.

## Como um agente usa esta pasta

1. Descobre a área dele em `areas.md`.
2. Carrega só os módulos dessa área, nunca a pasta inteira. Os módulos são grandes e o contexto é limitado.
3. Cita o módulo e a página quando usa uma ideia dele (ex.: "segundo Princípios de UX, p. 12").

## Módulos da biblioteca

| Arquivo | Módulo | Área principal |
|---|---|---|
| `biblioteca/ux.md` | Princípios de UX | design |
| `biblioteca/ui.md` | Princípios de UI | design |
| `biblioteca/design-de-interface.md` | Design de interface | design |
| `biblioteca/design-de-interacao.md` | Design de interação | design |
| `biblioteca/arquitetura-da-informacao.md` | Arquitetura da informação | design |
| `biblioteca/gamificacao.md` | Gamificação | design |
| `biblioteca/libras.md` | LIBRAS (acessibilidade) | design |
| `biblioteca/design-thinking.md` | Design Thinking | design |
| `biblioteca/introducao-design-thinking.md` | Introdução ao design thinking | design |
| `biblioteca/pratica-design-thinking.md` | Prática do design thinking | design |
| `biblioteca/ferramentas-design-thinking.md` | Ferramentas de design thinking | design |
| `biblioteca/prototipacao-storytelling.md` | Prototipação e storytelling | design |
| `biblioteca/comportamento-do-consumidor.md` | Comportamento do consumidor e design de interação | marketing |
| `biblioteca/inovacoes-tecnologicas.md` | Inovações tecnológicas | tecnologia |
| `biblioteca/business-model-generation.md` | Business model generation | negócio |
| `biblioteca/gerenciamento-de-projetos.md` | Fundamentos e gerenciamento integrado de projetos | negócio |
| `biblioteca/etica-profissional.md` | Ética profissional | geral |
| `biblioteca/avaliacao-etica.md` | Avaliação de ética (nota 100/100, resumo) | geral |
| `biblioteca/metodologia-cientifica.md` | Metodologia científica | geral |
| `biblioteca/direitos-humanos.md` | Direitos humanos | jurídico |
| `biblioteca/docencia-ensino-superior.md` | Docência no ensino superior | geral |

## Fontes e observações

- Dois zips foram usados: "UX e UI" (13 módulos) e "MBA em Design Thinking" (12 módulos). Onze
  módulos aparecem nos dois, com o mesmo arquivo (conferido por hash), então a biblioteca guarda
  uma cópia de cada.
- `avaliacao-etica.md` é uma prova escaneada, sem texto extraível. O resumo foi feito lendo as
  imagens, então é fiel ao conteúdo, mas não é texto literal.
- Os PDFs originais não estão no repositório. Eles ficam com o dono do material.
