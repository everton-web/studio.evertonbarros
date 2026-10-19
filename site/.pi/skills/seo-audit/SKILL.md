---
name: seo-audit
description: Auditar SEO técnico do site — metadata, Open Graph, JSON-LD, sitemap, robots, canonical, headings e alt text. Use ao revisar SEO, publicar nova seção/página ou antes de deploy.
---

# Auditoria de SEO

Arquivos-chave: `src/app/layout.tsx` (metadata + JSON-LD), `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/icon.svg`.

## Verificações

**Metadata (`layout.tsx`)**
- `title`, `description` (keyword + benefício), `keywords`, `authors`, `metadataBase`, `alternates.canonical`.
- Open Graph completo (`title`, `description`, `url`, `siteName`, `locale`, `type`) e imagem 1200×630 (`og:image`).
- Twitter card `summary_large_image` + `twitter:image`.
- `robots` com `index`/`follow` corretos para produção.

**JSON-LD**
- `Person` + `WebSite` + `ProfessionalService` coerentes com o conteúdo real; `sameAs` com perfis (Behance, Instagram, LinkedIn).

**Estrutura**
- Um único `<h1>` (Hero). Headings em ordem.
- `alt` significativo em todas as imagens (capas de portfólio, ícones decorativos com `alt=""`).
- Links internos com âncoras válidas; `url` de cases sem `"#"` quando existe case público.

**Infra**
- `robots.ts` referencia o sitemap; `sitemap.ts` inclui todas as rotas/URLs canônicas.
- `lang` do `<html>` atualizado dinamicamente (PT-BR/EN via `LanguageContext`).
- Sem `noindex` acidental; sem `localhost` em URLs de produção.

## Saída

Lista priorizada `[alto/médio/baixo] arquivo:linha — problema → correção`, com exemplos de snippet quando útil. Não altere arquivos sem confirmar, a menos que o usuário peça.
