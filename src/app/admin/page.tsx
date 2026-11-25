'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

interface Profile {
  id: string;
  email: string;
  plan: 'free' | 'pro';
  pro_ativo: boolean;
  created_at: string;
}

async function adminFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sessão expirada');

  const res = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erro na requisição');
  }
  return res.json();
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [myEmail, setMyEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email || '';
      setMyEmail(email);

      const admin = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      if (!user || (admin && email !== admin)) {
        setLoading(false);
        router.replace('/');
        return;
      }

      try {
        const data = await adminFetch('/api/admin/users');
        setUsers(data);
      } catch (e: any) {
        setErro(e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  async function togglePro(id: string, isPro: boolean) {
    try {
      await adminFetch('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ id, plan: isPro ? 'free' : 'pro' }),
      });
      const data = await adminFetch('/api/admin/users');
      setUsers(data);
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (loading) {
    return <div className="container mx-auto px-4 py-6 sm:py-10 text-zinc-500">Carregando painel...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-10 max-w-4xl">
      <Link href="/app" className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 font-medium">
        ← Voltar ao app
      </Link>
      <h1 className="text-xl sm:text-2xl font-bold mt-2">Painel Admin — Liberação Manual</h1>
      <p className="text-xs sm:text-sm text-zinc-500 mt-1 break-all">Logado como: {myEmail}</p>

      {erro && (
        <div className="mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {erro}
          {!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost') && (
            <p className="mt-2">Verifique se SUPABASE_SERVICE_ROLE_KEY está configurada no servidor.</p>
          )}
        </div>
      )}

      <div className="card-estoque mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="p-2.5 sm:p-3 text-left">Email</th>
              <th className="p-2.5 sm:p-3 text-center">Plano</th>
              <th className="hidden sm:table-cell p-2.5 sm:p-3 text-center">Cadastro</th>
              <th className="p-2.5 sm:p-3 text-center">Ação</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-zinc-100">
                <td className="p-2.5 sm:p-3 break-all text-xs sm:text-sm">{u.email}</td>
                <td className="p-2.5 sm:p-3 text-center">
                  <span className={u.plan === 'pro' ? 'status-pill-green' : 'bg-zinc-100 text-zinc-600 rounded-full px-2.5 sm:px-3 py-1 text-xs'}>
                    {u.plan.toUpperCase()}
                  </span>
                </td>
                <td className="hidden sm:table-cell p-2.5 sm:p-3 text-center text-zinc-500">
                  {new Date(u.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="p-2.5 sm:p-3 text-center">
                  <button
                    onClick={() => togglePro(u.id, u.plan === 'pro')}
                    className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${
                      u.plan === 'pro'
                        ? 'border border-zinc-300 text-zinc-700'
                        : 'bg-primary-600 text-white'
                    }`}
                  >
                    {u.plan === 'pro' ? 'Remover PRO' : 'Liberar PRO'}
                  </button>
                </td>
              </tr>
            ))}
            {!users.length && !erro && (
              <tr>
                <td colSpan={4} className="p-6 sm:p-8 text-center text-zinc-500">
                  Nenhum usuário cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
