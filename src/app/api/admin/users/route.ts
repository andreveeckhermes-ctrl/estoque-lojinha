import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, verifyAdminToken } from '@/lib/supabase/admin';

function unauthorized() {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
}

function getToken(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) return unauthorized();

  const user = await verifyAdminToken(token);
  if (!user) return forbidden();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const token = getToken(req);
  if (!token) return unauthorized();

  const user = await verifyAdminToken(token);
  if (!user) return forbidden();

  const body = await req.json();
  const { id, plan } = body as { id: string; plan: 'free' | 'pro' };
  if (!id || !plan) {
    return NextResponse.json({ error: 'id e plan são obrigatórios' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({
      plan,
      pro_ativo: plan === 'pro',
      pro_liberado_em: plan === 'pro' ? new Date().toISOString() : null,
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
