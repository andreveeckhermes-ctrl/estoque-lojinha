import { NextRequest, NextResponse } from 'next/server';
import { getPlanFromToken } from '@/core/auth/getPlanFromToken';

function getToken(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

/** Retorna plano verificado server-side. Usuário não pode falsificar via client. */
export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const result = await getPlanFromToken(token);
  if (!result) {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
  }

  return NextResponse.json({
    plan: result.plan,
    email: result.email,
    isPro: result.plan === 'pro',
    isFree: result.plan === 'free',
  });
}
