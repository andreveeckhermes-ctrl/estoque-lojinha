'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

/**
 * Garante que o usuário tenha um perfil em `profiles`.
 * O trigger on_auth_user_created (supabase/profiles.sql) já cria no signup;
 * este insert cobre projetos onde o trigger não foi instalado.
 * Usa INSERT (e não UPSERT) porque o usuário não tem policy de UPDATE.
 */
async function garantirPerfil(userId: string, email: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (data) return;

  const { error } = await supabase
    .from('profiles')
    .insert({ id: userId, email, plan: 'free', pro_ativo: false });

  if (error && error.code !== '23505') {
    console.warn('Não foi possível criar o perfil:', error.message);
  }
}

function mensagemDeErro(message: string) {
  const m = message.toLowerCase();
  if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed')) {
    return 'Não foi possível conectar ao servidor de login. Verifique sua conexão e se NEXT_PUBLIC_SUPABASE_URL está correta e ativa.';
  }
  if (m.includes('invalid login credentials')) return 'Email ou senha incorretos.';
  if (m.includes('email not confirmed')) {
    return 'Confirme seu email antes de entrar. Verifique sua caixa de entrada (e o spam).';
  }
  if (m.includes('user already registered')) return 'Este email já possui conta. Use o botão "Entrar".';
  if (m.includes('password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('invalid api key') || m.includes('no api key')) {
    return 'Chave do Supabase inválida. Confira NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local.';
  }
  return message;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<'login' | 'signup' | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setAviso('');
    setLoading('login');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(null);
      setErro(mensagemDeErro(error.message));
      return;
    }

    if (data.user) await garantirPerfil(data.user.id, data.user.email ?? email);

    setLoading(null);
    window.location.href = '/app';
  }

  async function handleSignup() {
    setErro('');
    setAviso('');
    setLoading('signup');

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setLoading(null);
      setErro(mensagemDeErro(error.message));
      return;
    }

    // Com "Confirm email" desativado o Supabase já devolve sessão: segue para o app.
    if (data.session && data.user) {
      await garantirPerfil(data.user.id, data.user.email ?? email);
      setLoading(null);
      window.location.href = '/app';
      return;
    }

    setLoading(null);
    setAviso('Conta criada! Confirme seu email e depois faça login.');
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="card-estoque w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center mx-auto text-xl">
            📦
          </div>
          <h1 className="text-2xl font-bold mt-4">Estoque Lojinha</h1>
          <p className="text-sm text-zinc-500 mt-1">Entre para gerenciar seu estoque</p>
        </div>

        <form onSubmit={handleLogin}>
          <input
            className="w-full border border-zinc-200 px-4 py-3 rounded-xl mt-2"
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className="w-full border border-zinc-200 px-4 py-3 rounded-xl mt-2"
            type="password"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {erro && (
            <p className="mt-3 text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-xl px-3 py-2">
              {erro}
            </p>
          )}
          {aviso && (
            <p className="mt-3 text-sm text-primary-700 bg-primary-50 border border-primary-100 rounded-xl px-3 py-2">
              {aviso}
            </p>
          )}

          <button
            type="submit"
            disabled={loading !== null}
            className="btn-primary w-full mt-4 py-3 rounded-xl disabled:opacity-50"
          >
            {loading === 'login' ? 'Entrando...' : 'Entrar'}
          </button>
          <button
            type="button"
            onClick={handleSignup}
            disabled={loading !== null}
            className="btn-outline w-full mt-2 py-3 rounded-xl disabled:opacity-50"
          >
            {loading === 'signup' ? 'Criando conta...' : 'Criar Conta Grátis'}
          </button>
        </form>

        <p className="text-xs text-zinc-400 text-center mt-4">
          <Link href="/" className="text-primary-600 hover:underline">← Voltar para a landing</Link>
        </p>
      </div>
    </div>
  );
}
