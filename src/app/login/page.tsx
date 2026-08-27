'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

async function criarPerfil(userId: string, email: string) {
  await supabase.from('profiles').upsert({
    id: userId,
    email,
    plan: 'free',
    pro_ativo: false,
  });
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const acaoRef = useRef<'login' | 'signup'>('login');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (acaoRef.current === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setLoading(false);
        alert(error.message);
        return;
      }
      if (data.user) {
        await criarPerfil(data.user.id, email);
      }
      setLoading(false);
      alert('Conta criada! Verifique seu email e faça login.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) alert(error.message);
      else window.location.href = '/app';
    }
  }

  function handleLogin(e: React.MouseEvent) {
    acaoRef.current = 'login';
  }

  function handleSignup(e: React.MouseEvent) {
    acaoRef.current = 'signup';
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

        <form onSubmit={handleSubmit}>
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

          <button
            type="submit"
            onMouseDown={handleLogin}
            disabled={loading}
            className="btn-primary w-full mt-4 py-3 rounded-xl disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <button
            type="submit"
            onMouseDown={handleSignup}
            disabled={loading}
            className="btn-outline w-full mt-2 py-3 rounded-xl disabled:opacity-50"
          >
            Criar Conta Grátis
          </button>
        </form>

        <p className="text-xs text-zinc-400 text-center mt-4">
          <Link href="/" className="text-primary-600 hover:underline">← Voltar para a landing</Link>
        </p>
      </div>
    </div>
  );
}
