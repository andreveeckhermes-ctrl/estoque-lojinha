#!/usr/bin/env node
/**
 * Verifica a configuração do Supabase usada pelo app Estoque Lojinha.
 *
 * Uso:
 *   node scripts/check-supabase.mjs          -> checa DNS, chaves, tabela e RLS
 *   node scripts/check-supabase.mjs --e2e    -> além disso, cria um usuário
 *                                               descartável, faz login real,
 *                                               lê o perfil e apaga o usuário
 *
 * Lê as credenciais de .env.local. Nunca imprime chaves.
 */
import { readFileSync } from 'node:fs';
import { lookup } from 'node:dns/promises';

const E2E = process.argv.includes('--e2e');
const envPath = new URL('../.env.local', import.meta.url);

function parseEnv(file) {
  const out = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  }
  return out;
}

const env = parseEnv(envPath);
const URL_BASE = (env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY || '';

let falhas = 0;

function ok(label, detalhe = '') {
  console.log(`  [OK]    ${label}${detalhe ? ' — ' + detalhe : ''}`);
}

function fail(label, detalhe = '') {
  falhas++;
  console.log(`  [FALHA] ${label}${detalhe ? ' — ' + detalhe : ''}`);
}

function info(label, detalhe = '') {
  console.log(`  [i]     ${label}${detalhe ? ' — ' + detalhe : ''}`);
}

async function req(path, { key, bearer, method = 'GET', body } = {}) {
  const headers = {};
  if (key) headers.apikey = key;
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(URL_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* resposta não-JSON */
  }
  return { status: res.status, json, text };
}

function hostname() {
  try {
    return new URL(URL_BASE).hostname;
  } catch {
    return null;
  }
}

async function main() {
  console.log('\n=== CONFIGURAÇÃO LIDA DO .env.local ===');
  if (!URL_BASE) fail('NEXT_PUBLIC_SUPABASE_URL ausente');
  if (!ANON) fail('NEXT_PUBLIC_SUPABASE_ANON_KEY ausente');
  if (!SERVICE) fail('SUPABASE_SERVICE_ROLE_KEY ausente');
  if (!URL_BASE || !ANON || !SERVICE) return resumo();
  const host = hostname();
  info('Host do projeto', host || 'URL inválida');
  if (host) {
    const ref = host.split('.')[0];
    info('Referência (ref) do projeto', ref);
    for (const [nome, chave] of [
      ['anon key', ANON],
      ['service_role key', SERVICE],
    ]) {
      const partes = chave.split('.');
      if (partes.length !== 3) {
        info(nome, 'formato novo (sb_...), sem ref para comparar');
        continue;
      }
      try {
        const payload = JSON.parse(Buffer.from(partes[1], 'base64url').toString());
        if (payload.ref && payload.ref !== ref) {
          fail(`${nome} é de outro projeto`, `ref da chave=${payload.ref} ≠ ref da URL=${ref}`);
        } else {
          ok(`${nome} corresponde ao projeto`);
        }
      } catch {
        info(nome, 'não foi possível ler o payload do JWT');
      }
    }
  }

  console.log('\n=== DNS ===');
  try {
    const { address } = await lookup(host);
    ok('Domínio resolve', address);
  } catch (e) {
    fail('Domínio NÃO resolve', `${e.code || e.message} — projeto apagado, pausado ou URL errada`);
    console.log('\nSem DNS não há login: pare aqui e confira a URL do projeto.');
    return resumo();
  }

  console.log('\n=== AUTH ===');
  try {
    const health = await req('/auth/v1/health', { key: ANON });
    if (health.status === 200) ok('Servidor de auth responde', 'health 200');
    else fail('Servidor de auth respondeu erro', `HTTP ${health.status}`);
  } catch (e) {
    fail('Não foi possível falar com o servidor de auth', e.message);
  }

  try {
    const settings = await req('/auth/v1/settings', { key: ANON });
    if (settings.status === 200) {
      ok('Chave anon aceita');
      const s = settings.json || {};
      info('Provider email habilitado', String(s.external?.email ?? 'desconhecido'));
      if (s.disable_signup === true) {
        fail('Cadastro desativado neste projeto', 'Authentication > Providers > Email');
      } else {
        ok('Cadastro de novos usuários permitido');
      }
    } else {
      fail('Chave anon recusada', `HTTP ${settings.status} ${settings.json?.message || ''}`);
    }
  } catch (e) {
    fail('Falha ao ler /auth/v1/settings', e.message);
  }

  console.log('\n=== BANCO (tabela profiles) ===');
  try {
    const svc = await req('/rest/v1/profiles?select=id&limit=1', { key: SERVICE });
    if (svc.status === 200) ok('service_role lê a tabela profiles');
    else if (svc.status === 404 || svc.status === 400) {
      fail('Tabela profiles não existe', 'rode supabase/setup-novo-projeto.sql no SQL Editor');
    } else {
      const msg = svc.json?.message || '';
      const dica = msg.includes('permission denied')
        ? 'falta GRANT na tabela — reaplique supabase/setup-novo-projeto.sql'
        : '';
      fail('service_role não conseguiu ler profiles', `HTTP ${svc.status} ${msg} ${dica}`.trim());
    }

    const anonRead = await req('/rest/v1/profiles?select=id', { key: ANON });
    if (anonRead.status === 200 && Array.isArray(anonRead.json) && anonRead.json.length === 0) {
      ok('RLS bloqueia leitura anônima', 'retornou 0 linhas');
    } else if (anonRead.status === 401 && !String(anonRead.json?.message || '').includes('permission denied')) {
      ok('RLS bloqueia leitura anônima', 'HTTP 401');
    } else {
      fail('RLS pode estar permissiva', `sem sessão retornou HTTP ${anonRead.status} com ${Array.isArray(anonRead.json) ? anonRead.json.length + ' linha(s)' : 'resposta inesperada'}`);
    }
  } catch (e) {
    fail('Erro ao consultar REST', e.message);
  }

  if (!E2E) {
    console.log('\n(rode com --e2e para testar um login real de ponta a ponta)\n');
    return resumo();
  }

  console.log('\n=== LOGIN DE PONTA A PONTA (usuário descartável) ===');
  const email = `teste.login+${Date.now()}@example.com`;
  const senha = 'Teste123456!';
  let userId = null;

  try {
    const criado = await req('/auth/v1/admin/users', {
      key: SERVICE,
      bearer: SERVICE,
      method: 'POST',
      body: { email, password: senha, email_confirm: true },
    });
    if (criado.status !== 200 && criado.status !== 201) {
      fail('Não foi possível criar usuário de teste', `HTTP ${criado.status} ${criado.json?.msg || criado.json?.message || ''}`);
      return resumo();
    }
    userId = criado.json?.id;
    ok('Usuário de teste criado (email confirmado)', userId || 'sem id');

    const login = await req('/auth/v1/token?grant_type=password', {
      key: ANON,
      method: 'POST',
      body: { email, password: senha },
    });
    if (login.status !== 200 || !login.json?.access_token) {
      fail('Login por email/senha falhou', `HTTP ${login.status} ${login.json?.error_description || login.json?.msg || ''}`);
      return resumo();
    }
    const token = login.json.access_token;
    ok('Login por email/senha funcionou', 'access_token recebido');

    const perfil = await req(`/rest/v1/profiles?select=id,email,plan,pro_ativo&id=eq.${userId}`, {
      key: ANON,
      bearer: token,
    });
    const linhas = Array.isArray(perfil.json) ? perfil.json : [];
    if (linhas.length === 1) {
      ok('Trigger criou o perfil e o usuário lê o próprio perfil', `plan=${linhas[0].plan} pro_ativo=${linhas[0].pro_ativo}`);
    } else {
      fail('Perfil não foi criado/legível', `a consulta retornou ${linhas.length} linha(s) — confira o trigger do SQL de setup`);
    }

    // Tenta se promover a PRO com o token do próprio usuário e confere no banco
    // (PostgREST costuma responder 204 sem alterar nada, então validamos o dado).
    await req(`/rest/v1/profiles?id=eq.${userId}`, {
      key: ANON,
      method: 'PATCH',
      bearer: token,
      body: { plan: 'pro', pro_ativo: true },
    });
    const apos = await req(`/rest/v1/profiles?select=plan,pro_ativo&id=eq.${userId}`, { key: SERVICE });
    const linha = Array.isArray(apos.json) ? apos.json[0] : null;
    if (!linha) {
      info('Não foi possível verificar a promoção a PRO', 'perfil ausente/ilegível');
    } else if (linha.plan === 'free' && linha.pro_ativo === false) {
      ok('Usuário NÃO consegue se promover a PRO');
    } else {
      fail('Usuário conseguiu alterar o próprio plano', `estado atual: ${JSON.stringify(linha)} — revise as políticas de UPDATE`);
    }
  } catch (e) {
    fail('Erro no teste de ponta a ponta', e.message);
  } finally {
    if (userId) {
      try {
        const del = await req(`/auth/v1/admin/users/${userId}`, { key: SERVICE, bearer: SERVICE, method: 'DELETE' });
        if (del.status === 200 || del.status === 204) ok('Usuário de teste removido');
        else fail('Não foi possível remover o usuário de teste', `HTTP ${del.status} — apague ${userId} manualmente`);
      } catch (e) {
        fail('Erro ao remover usuário de teste', e.message);
      }
    }
  }

  return resumo();
}

function resumo() {
  console.log('\n=== RESUMO ===');
  if (falhas === 0) {
    console.log('Tudo certo: a configuração do Supabase está válida para o login do app.\n');
    process.exitCode = 0;
  } else {
    console.log(`${falhas} problema(s) encontrado(s).\n`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('Erro inesperado:', e);
  process.exitCode = 1;
});
