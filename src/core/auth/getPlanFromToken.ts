import { createClient } from '@supabase/supabase-js';
import type { Plan } from './planPolicy';

export async function getPlanFromToken(token: string): Promise<{ plan: Plan; email: string | null } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;

  const { data } = await client
    .from('profiles')
    .select('plan, pro_ativo')
    .eq('id', user.id)
    .single();

  const plan: Plan = data?.pro_ativo && data?.plan === 'pro' ? 'pro' : 'free';
  return { plan, email: user.email ?? null };
}
