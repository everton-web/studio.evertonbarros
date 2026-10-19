---
name: portfolio-case
description: Adicionar, editar ou remover um case do portfólio em src/data/projects.ts e sua imagem de capa. Use ao incluir novo projeto, atualizar link do Behance, categoria, ano ou capa.
---

# Gerenciar cases do portfólio

Fonte de dados: `src/data/projects.ts` (interface `Project`, array `projects`).

```ts
export interface Project {
  slug: string;      // kebab-case, único
  title: string;     // nome do projeto/cliente
  category: string;  // ex.: "One Page · Web Design", "Landing Page", "Brand Identity"
  url: string;       // link do case (Behance) ou "#" se não houver
  cover: string;     // caminho público, ex.: "/projects/meu-case.png"
  year: number;
}
```

## Processo

1. **Imagem:** coloque a capa em `public/projects/<slug>.png`. Ideal ~16:10, otimizada (WebP/PNG comprimido). Evite arquivos > 500 KB.
2. **Entrada:** adicione o objeto no array `projects`, normalmente no topo (mais recente primeiro). `slug` em kebab-case sem acentos, igual ao nome do arquivo de imagem.
3. **Renderização:** `Portfolio.tsx` já lê o array — não precisa mexer no componente, a menos que o case exija destaque (ver skill `site-section`).
4. **Ordem/ano:** mantenha coerência cronológica decrescente.

## Checklist

- [ ] `slug` único e em kebab-case (sem acento/espaço)
- [ ] Arquivo de capa existe em `public/projects/`
- [ ] `url` válida (testar) ou `"#"` quando não houver case público
- [ ] `category` consistente com os existentes (use `·` como separador)
- [ ] `npx tsc --noEmit` limpo
