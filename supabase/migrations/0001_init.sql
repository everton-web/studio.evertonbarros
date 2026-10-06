-- Schema inicial da plataforma Asymmetrics no Supabase.
-- A aplicação deve usar somente SUPABASE_SERVICE_ROLE_KEY no servidor.
-- Nunca expor a service role em código cliente ou em variáveis NEXT_PUBLIC_*.

create extension if not exists pgcrypto;

create type public.crm_stage as enum ('lead', 'oportunidade', 'cliente');
create type public.demand_status as enum (
  'fila', 'em_andamento', 'aguardando_everton', 'bloqueada',
  'aguardando_cliente', 'concluida', 'cancelada'
);

create table public.companies (
  id text primary key,
  name text not null,
  segment text,
  city text,
  website text,
  google_rating numeric(3,2),
  review_count integer check (review_count is null or review_count >= 0),
  category text,
  crm_stage public.crm_stage not null default 'lead',
  funnel_stage smallint check (funnel_stage is null or funnel_stage between 0 and 5),
  status text,
  source text,
  project_value numeric(14,2),
  recurring_value numeric(14,2),
  closed_on date,
  raw_source jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index companies_crm_stage_idx on public.companies (crm_stage);
create index companies_status_idx on public.companies (status);
create index companies_source_idx on public.companies (source);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies(id) on delete cascade,
  name text,
  phone text,
  whatsapp text,
  email text,
  created_at timestamptz not null default now()
);
create index contacts_company_id_idx on public.contacts (company_id);

create table public.lead_movements (
  id bigint generated always as identity primary key,
  company_id text not null references public.companies(id) on delete cascade,
  from_stage smallint,
  to_stage smallint check (to_stage between 0 and 5),
  event_type text not null,
  note text,
  occurred_at timestamptz not null default now()
);
create index lead_movements_company_time_idx on public.lead_movements (company_id, occurred_at desc);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies(id) on delete cascade,
  value numeric(14,2),
  probability smallint check (probability is null or probability between 0 and 100),
  expected_on date,
  owner text,
  created_at timestamptz not null default now()
);
create index opportunities_company_id_idx on public.opportunities (company_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id text references public.companies(id) on delete set null,
  name text not null,
  internal boolean not null default false,
  stage text,
  status text,
  due_on date,
  production_url text,
  staging_url text,
  repository text,
  qa_checklist jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index projects_company_id_idx on public.projects (company_id);
create index projects_status_idx on public.projects (status);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies(id) on delete cascade,
  value numeric(14,2),
  payment_type text,
  installments integer check (installments is null or installments > 0),
  starts_on date,
  duration_months integer check (duration_months is null or duration_months > 0),
  storage_path text,
  content_markdown text,
  created_at timestamptz not null default now()
);
create index contracts_company_id_idx on public.contracts (company_id);

create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies(id) on delete cascade,
  label text not null,
  url text,
  username text,
  encrypted_password text not null,
  encryption_iv text not null,
  encryption_tag text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index credentials_company_id_idx on public.credentials (company_id);

create table public.briefings (
  id uuid primary key default gen_random_uuid(),
  company_id text references public.companies(id) on delete set null,
  token_hash text not null unique,
  token_version integer not null default 1 check (token_version > 0),
  page_type text,
  answers jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);
create index briefings_company_id_idx on public.briefings (company_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies(id) on delete cascade,
  report_month date not null,
  content jsonb not null default '{}'::jsonb,
  link_token_hash text unique,
  token_version integer not null default 1 check (token_version > 0),
  generated_at timestamptz,
  sent_at timestamptz,
  unique (company_id, report_month)
);
create index reports_company_month_idx on public.reports (company_id, report_month desc);

create table public.lead_analyses (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies(id) on delete cascade,
  score smallint check (score is null or score between 0 and 100),
  analysis jsonb not null,
  generated_at timestamptz not null default now()
);
create index lead_analyses_company_time_idx on public.lead_analyses (company_id, generated_at desc);

create table public.workspace_documents (
  key text primary key,
  title text not null,
  document_type text not null,
  content_markdown text not null default '',
  structured_data jsonb not null default '{}'::jsonb,
  source_path text,
  updated_at timestamptz not null default now()
);
create index workspace_documents_type_idx on public.workspace_documents (document_type);

create table public.meetings (
  id text primary key,
  title text not null,
  starts_at timestamptz not null,
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  participant text,
  created_at timestamptz not null default now()
);
create index meetings_starts_at_idx on public.meetings (starts_at);

create table public.campaigns (
  id text primary key,
  name text not null,
  channel text not null,
  investment numeric(14,2) not null default 0,
  clicks integer not null default 0 check (clicks >= 0),
  conversions integer not null default 0 check (conversions >= 0),
  status text not null,
  created_at timestamptz not null default now()
);
create index campaigns_status_idx on public.campaigns (status);

create table public.tracking_sites (
  site_key text primary key,
  hit_count bigint not null default 0 check (hit_count >= 0),
  first_hit_at timestamptz,
  last_hit_at timestamptz
);
create index tracking_sites_last_hit_idx on public.tracking_sites (last_hit_at desc);

-- Incremento atômico usado pelo pixel. O upsert evita a sequência sujeita a
-- corrida de SELECT seguido de INSERT/UPDATE e preserva o primeiro acesso.
create or replace function public.increment_tracking_site(
  p_site_key text,
  p_hit_at timestamptz default now()
)
returns public.tracking_sites
language sql
set search_path = public
as $$
  insert into public.tracking_sites (site_key, hit_count, first_hit_at, last_hit_at)
  values (p_site_key, 1, p_hit_at, p_hit_at)
  on conflict (site_key) do update
    set hit_count = public.tracking_sites.hit_count + 1,
        first_hit_at = coalesce(public.tracking_sites.first_hit_at, excluded.first_hit_at),
        last_hit_at = greatest(public.tracking_sites.last_hit_at, excluded.last_hit_at)
  returning *;
$$;

revoke all on function public.increment_tracking_site(text, timestamptz) from public, anon, authenticated;
grant execute on function public.increment_tracking_site(text, timestamptz) to service_role;

create table public.financial_transactions (
  id text primary key,
  company_id text references public.companies(id) on delete set null,
  provider text not null default 'infinitepay',
  provider_reference text,
  kind text,
  status text,
  amount numeric(14,2),
  payment_url text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index financial_transactions_provider_ref_idx
  on public.financial_transactions (provider, provider_reference)
  where provider_reference is not null;
create index financial_transactions_status_idx on public.financial_transactions (status);

create table public.agent_demands (
  id text primary key,
  title text not null,
  persona text not null,
  status public.demand_status not null default 'fila',
  origin text,
  due_at timestamptz,
  content_markdown text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index agent_demands_status_idx on public.agent_demands (status, created_at desc);
create index agent_demands_persona_idx on public.agent_demands (persona, status);

create table public.agent_messages (
  id bigint generated always as identity primary key,
  demand_id text references public.agent_demands(id) on delete cascade,
  sender text not null,
  recipient text,
  body text not null,
  created_at timestamptz not null default now()
);
create index agent_messages_demand_time_idx on public.agent_messages (demand_id, created_at);

create table public.health_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_key text,
  severity text,
  title text not null,
  details jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index health_alerts_open_idx on public.health_alerts (resolved_at, severity);

create table public.prospector_runs (
  id uuid primary key default gen_random_uuid(),
  niche text,
  city text,
  region text,
  fronts jsonb not null default '[]'::jsonb,
  status text not null,
  summary jsonb not null default '{}'::jsonb,
  rotation_state jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index prospector_runs_started_at_idx on public.prospector_runs (started_at desc);

create table public.stored_files (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'plataforma-arquivos',
  object_path text not null unique,
  original_name text not null,
  mime_type text,
  size_bytes bigint not null check (size_bytes >= 0),
  checksum_sha256 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stored_files_created_at_idx on public.stored_files (created_at desc);

-- Segurança: RLS fica ativo em todas as tabelas. Uma política explícita nega
-- leitura e escrita a anon e authenticated, que também perdem seus grants. A
-- service role usada apenas no servidor contorna RLS, como previsto pelo Supabase.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'companies', 'contacts', 'lead_movements', 'opportunities', 'projects',
    'contracts', 'credentials', 'briefings', 'reports', 'lead_analyses',
    'workspace_documents', 'meetings', 'campaigns', 'tracking_sites',
    'financial_transactions', 'agent_demands', 'agent_messages',
    'health_alerts', 'prospector_runs', 'stored_files'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (false) with check (false)',
      table_name || '_deny_direct_access',
      table_name
    );
  end loop;
end $$;

-- O Supabase concede acesso padrao a tabelas novas. Revogamos os privilegios
-- atuais e futuros para que toda tabela criada depois desta migration continue
-- acessivel somente pela service role no servidor.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;

-- Storage, executar no projeto Supabase depois de revisar limite e MIME types:
-- insert into storage.buckets (id, name, public, file_size_limit)
-- values ('plataforma-arquivos', 'plataforma-arquivos', false, 26214400);
-- Não criar políticas em storage.objects para anon ou authenticated. Upload,
-- leitura e remoção devem passar pelas rotas autenticadas do servidor usando a
-- service role. Use object_path opaco, nunca o nome enviado pelo usuário.
