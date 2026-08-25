-- Profiles: planos Free/Pro
-- Execute no SQL Editor do Supabase antes de usar auth + paywall.
--
-- SEGURANÇA: usuários podem apenas LER o próprio perfil.
-- Alterações de plan/pro_ativo ocorrem SOMENTE via API admin (SERVICE_ROLE_KEY).

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

-- Remove políticas permissivas antigas (se existirem)
drop policy if exists "user pode ver seu proprio perfil" on public.profiles;
drop policy if exists "user pode atualizar seu proprio perfil" on public.profiles;
drop policy if exists "user pode criar proprio perfil free" on public.profiles;

-- Usuário: apenas leitura do próprio perfil
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Usuário: pode criar APENAS perfil free (fallback se trigger falhar)
create policy "profiles_insert_own_free"
  on public.profiles for insert
  with check (
    auth.uid() = id
    and plan = 'free'
    and pro_ativo = false
  );

-- NÃO criar policy de UPDATE para usuários comuns.
-- Liberação PRO: exclusivamente via /api/admin/users (service role).

-- Trigger: cria perfil free automaticamente no signup
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
