-- ============================================================
-- CORREÇÃO DE SEGURANÇA: Políticas RLS da tabela profiles
-- ============================================================
-- Problema: a política original permitia que o próprio usuário
-- fizesse UPDATE em qualquer coluna, incluindo 'plan' e 'pro_ativo'.
-- Isso permitia liberar o PRO sem pagar.
--
-- Solução: remover a política de UPDATE do usuário comum.
-- Apenas o service_role (admin) pode alterar o plano.
-- ============================================================

-- Garantir que RLS está ativo
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: usuário pode ver seu próprio perfil ✅
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'user pode ver seu proprio perfil' 
    AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "user pode ver seu proprio perfil" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);
  END IF;
END $$;

-- INSERT: usuário pode criar seu próprio perfil (necessário para o signup) ✅
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'user pode criar seu proprio perfil' 
    AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "user pode criar seu proprio perfil" 
    ON profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- ❌ REMOVIDO: política de UPDATE do usuário comum
-- O plano SÓ pode ser alterado via /api/admin/users (service_role)
-- Se existir a política antiga, remova-a:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'user pode atualizar seu proprio perfil' 
    AND tablename = 'profiles'
  ) THEN
    DROP POLICY "user pode atualizar seu proprio perfil" ON profiles;
  END IF;
END $$;
