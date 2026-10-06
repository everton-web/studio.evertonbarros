-- Migration 0002: bucket privado de arquivos e colunas usadas pela camada
-- src/lib/data que não estavam na 0001. Pode rodar mais de uma vez.

-- Bucket privado para uploads da plataforma (25 MB por arquivo).
-- Sem restrição de MIME: a plataforma já aceitava qualquer tipo. O download
-- passa pela rota autenticada /api/file, que força download para tipos que o
-- navegador poderia executar (HTML, SVG e afins).
-- Se mudar o nome aqui, ajuste SUPABASE_STORAGE_BUCKET no servidor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('plataforma-arquivos', 'plataforma-arquivos', false, 26214400, null)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Nenhuma política em storage.objects para anon ou authenticated: só a service
-- role, usada pelas rotas autenticadas do servidor, lê e grava no bucket.

-- Relatórios: o mensal do cliente (/r/<token>) e o diagnóstico público do lead
-- (por slug) dividem a tabela reports.
alter table public.reports
  add column if not exists kind text not null default 'mensal',
  add column if not exists slug text,
  add column if not exists token_version integer not null default 1,
  add column if not exists published_at timestamptz;

alter table public.reports drop column if exists link_token;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reports_kind_check') then
    alter table public.reports
      add constraint reports_kind_check check (kind in ('mensal', 'lead_publico'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reports_lead_slug_check') then
    alter table public.reports
      add constraint reports_lead_slug_check check (kind <> 'lead_publico' or slug is not null);
  end if;
end $$;

-- O único (empresa, mês) da 0001 valia para qualquer relatório e travaria o
-- diagnóstico do lead no mesmo mês do mensal. Passa a valer só para o mensal.
alter table public.reports drop constraint if exists reports_company_id_report_month_key;
create unique index if not exists reports_mensal_empresa_mes_idx
  on public.reports (company_id, report_month) where kind = 'mensal';
create unique index if not exists reports_lead_slug_idx
  on public.reports (slug) where kind = 'lead_publico';

-- Tokens publicos ficam somente como hash. O servidor reconstroi o valor com
-- AGENCIA_SECRET, id e versao. Links legados devem ser rotacionados no corte.
alter table public.briefings add column if not exists token_version integer not null default 1;
alter table public.briefings drop column if exists token;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'briefings_token_version_check') then
    alter table public.briefings add constraint briefings_token_version_check check (token_version > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reports_token_version_check') then
    alter table public.reports add constraint reports_token_version_check check (token_version > 0);
  end if;
end $$;

-- Defesa para objetos existentes e futuros, inclusive os criados depois da
-- migration por scripts executados como postgres.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;
