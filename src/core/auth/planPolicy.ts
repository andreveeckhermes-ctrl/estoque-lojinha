/**
 * Política de planos — leia antes de implementar limites.
 *
 * CAMADA 1 — Plano (servidor, confiável)
 *   GET /api/plan valida JWT e lê profiles via RLS (somente SELECT).
 *   Usuário NÃO pode alterar plan/pro_ativo (sem policy de UPDATE).
 *
 * CAMADA 2 — Paywall UI (cliente, UX)
 *   usePlan() consome /api/plan. Bloqueia botões e exibe Paywall.
 *
 * CAMADA 3 — Dados locais SQLite (cliente, isolado por dispositivo)
 *   Limites FREE (50 produtos, 10 vendas/mês) são gates de UX.
 *   Como os dados ficam no IndexedDB do navegador, um usuário técnico
 *   pode contornar via DevTools — isso é aceitável para dados locais.
 *   Se no futuro houver sync server-side, a validação DEVE ir para API.
 */

export type Plan = 'free' | 'pro';

export interface PlanInfo {
  plan: Plan;
  email: string | null;
  isPro: boolean;
  isFree: boolean;
}

export function toPlanInfo(plan: Plan, email: string | null): PlanInfo {
  return {
    plan,
    email,
    isPro: plan === 'pro',
    isFree: plan === 'free',
  };
}
