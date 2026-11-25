-- ============================================================
-- SETUP COMPLETO — Estoque Lojinha (projeto Supabase NOVO)
-- ============================================================
-- Rode este arquivo INTEIRO no SQL Editor do Supabase.
-- É idempotente: pode rodar mais de uma vez sem erro.
--
-- Este arquivo substitui supabase/profiles.sql e
-- supabase/migrations/001_fix_profiles_rls.sql — NÃO precisa rodar os dois.
-- Motivo: o 001 cria uma policy de INSERT sem restrição de plano
-- (auth.uid() = id, sem checar plan='free'), o que permitiria a um usuário
-- técnico inserir o próprio perfil já como PRO. Aqui a policy é estrita.
-- ============================================================

-- 1) Tabela de perfis
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  pro_ativo boolean not null default false,
  pro_liberado_em timestamptz,
  pro_expira_em timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 1.1) Permissões de tabela (GRANT)
-- Necessário porque a tabela pode ser criada por um papel (ex.: via Management API)
-- que não aplica os privilégios padrão do Supabase. Sem isto o PostgREST
-- responde "permission denied for table profiles" (HTTP 401), mesmo com RLS correto.
grant usage on schema public to anon, authenticated, service_role;
grant select on public.profiles to anon;
grant select, insert on public.profiles to authenticated;
grant all privileges on public.profiles to service_role;

-- 2) Limpa políticas antigas (dos dois padrões de nome já usados no projeto)
drop policy if exists "user pode ver seu proprio perfil" on public.profiles;
drop policy if exists "user pode criar seu proprio perfil" on public.profiles;
drop policy if exists "user pode atualizar seu proprio perfil" on public.profiles;
drop policy if exists "user pode criar proprio perfil free" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own_free" on public.profiles;

-- 3) Políticas do usuário comum: SOMENTE leitura e criação do perfil FREE
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own_free"
  on public.profiles for insert
  with check (
    auth.uid() = id
    and plan = 'free'
    and pro_ativo = false
  );

-- NÃO criar policy de UPDATE nem DELETE para usuário comum.
-- Liberação PRO acontece só via /api/admin/users com SERVICE_ROLE_KEY.

-- 4) Trigger: cria o perfil free automaticamente no signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, plan, pro_ativo)
  values (new.id, new.email, 'free', false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) Verificação rápida (deve retornar 0 linhas e sem erro)
select count(*) as perfis_atuais from public.profiles;
