import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export type Plan = 'free' | 'pro';

export function usePlan() {
  const [plan, setPlan] = useState<Plan>('free');
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        setEmail(user.email || null);
        
        const { data } = await supabase.from('profiles').select('plan, pro_ativo').eq('id', user.id).single();
        if (data?.pro_ativo && data?.plan === 'pro') setPlan('pro');
        else setPlan('free');
      } catch (e) {
        console.warn('Erro ao carregar plano:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { plan, isPro: plan === 'pro', isFree: plan === 'free', loading, email };
}
