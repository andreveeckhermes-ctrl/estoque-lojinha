#!/usr/bin/env node
/**
 * Cria/configura o projeto Supabase do Estoque Lojinha via Management API.
 *
 * Pré-requisito: um Personal Access Token do Supabase gravado em
 *   .supabase-token          (uma linha, sem espaços)
 * ou na variável de ambiente SUPABASE_ACCESS_TOKEN.
 * Gere em: https://supabase.com/dashboard/account/tokens
 * O token NUNCA é impresso por este script.
 *
 * Uso:
 *   node scripts/setup-supabase.mjs --list          -> só lista as organizações
 *   node scripts/setup-supabase.mjs                 -> cria projeto + SQL + .env.local
 *   node scripts/setup-supabase.mjs --ref=abcdefgh  -> usa um projeto que já existe
 *
 * Opções: --org=<slug> --region=sa-east-1 --name="Estoque Lojinha"
 */
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const API = 'https://api.supabase.com/v1';
const ROOT = new URL('../', import.meta.url);
const ENV_LOCAL = new URL('.env.local', ROOT);
const TOKEN_FILE = new URL('.supabase-token', ROOT);
const STATE_FILE = new URL('.supabase-projeto.json', ROOT);
const DB_PASS_FILE = new URL('.supabase-db-password.txt', ROOT);
const SQL_FILE = new URL('supabase/setup-novo-projeto.sql', ROOT);

const args = process.argv.slice(2);
const flag = (nome, padrao = null) => {
  const arg = args.find((a) => a.startsWith(`--${nome}=`));
  if (arg) return arg.split('=').slice(1).join('=');
  return args.includes(`--${nome}`) ? true : padrao;
};

const LIST_ONLY = args.includes('--list');
const REGION = flag('region', 'sa-east-1');
const NAME = flag('name', 'Estoque Lojinha');
const ORG = flag('org');
const EXISTING_REF = flag('ref');

function lerToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  if (existsSync(TOKEN_FILE)) return readFileSync(TOKEN_FILE, 'utf8').trim();
  // também aceita o token dentro do .env.local
  if (existsSync(ENV_LOCAL)) {
    // aceita SUPABASE_ACCESS_TOKEN e também o nome com typo SUPABASE_ACESS_TOKEN
    const m = readFileSync(ENV_LOCAL, 'utf8').match(/^\s*SUPABASE_AC+ESS_TOKEN\s*=\s*(.*)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

const TOKEN = lerToken();

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* não-JSON */
  }
  return { status: res.status, json, text };
}

class Parar extends Error {}

function die(msg) {
  console.error(`\n[ERRO] ${msg}\n`);
  throw new Parar(msg);
}

function ok(msg, detalhe = '') {
  console.log(`  [OK] ${msg}${detalhe ? ' — ' + detalhe : ''}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function patchEnvLocal(valores) {
  const linhas = existsSync(ENV_LOCAL)
    ? readFileSync(ENV_LOCAL, 'utf8').split(/\r?\n/)
    : [];
  const restantes = new Map(Object.entries(valores));
  const saida = linhas.map((linha) => {
    const m = linha.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (m && restantes.has(m[1])) {
      const v = restantes.get(m[1]);
      restantes.delete(m[1]);
      return `${m[1]}=${v}`;
    }
    return linha;
  });
  for (const [k, v] of restantes) saida.push(`${k}=${v}`);
  // remove linhas vazias duplicadas no fim
  while (saida.length && saida[saida.length - 1].trim() === '') saida.pop();
  writeFileSync(ENV_LOCAL, saida.join('\n') + '\n', 'utf8');
}

async function main() {
  if (!TOKEN) {
    die(
      'Token não encontrado.\n' +
        '  1. Gere em https://supabase.com/dashboard/account/tokens (Generate new token)\n' +
        '  2. Salve o valor em template-generico-com-doc/generic-template/.supabase-token\n' +
        '  (o arquivo já está no .gitignore; não cole o token no chat)'
    );
  }

  console.log('\n=== TOKEN ===');
  const teste = await api('/organizations');
  let orgs = [];
  if (teste.status === 200) {
    ok('Token válido (acesso total)');
    orgs = Array.isArray(teste.json) ? teste.json : [];
    console.log('\n=== ORGANIZAÇÕES DISPONÍVEIS ===');
    orgs.forEach((o) => console.log(`  - ${o.name}  (slug: ${o.slug || '—'}, id: ${o.id}, plano: ${o.plan || '—'})`));
    if (!orgs.length) console.log('  (nenhuma organização visível para este token)');
    if (LIST_ONLY) return;
  } else if (teste.status === 401) {
    die('Token inválido (HTTP 401). Gere outro token e regrave .supabase-token.');
  } else if (teste.status === 403) {
    // Token escopado: pode operar num projeto existente, mas não listar organizações.
    ok('Token aceito (escopo limitado a projetos)');
    console.log('  [i] Sem permissão organizations_read: não dá para listar nem criar projeto.');
    if (LIST_ONLY) return;
    if (!EXISTING_REF) {
      die(
        'Este token não tem organizations_read, então não posso criar um projeto novo.\n' +
          '  Use --ref=<ref> de um projeto existente ou gere um token sem escopo (acesso total).'
      );
    }
  } else {
    die(`API respondeu HTTP ${teste.status}: ${teste.text.slice(0, 300)}`);
  }

  let org = null;
  if (orgs.length) {
    org = ORG ? orgs.find((o) => o.slug === ORG || o.id === ORG) : orgs[0];
    if (!org) die(`Organização "${ORG}" não encontrada. Use --list para ver os slugs.`);
    ok('Organização escolhida', `${org.name} (${org.slug || org.id})`);
  }

  let ref = EXISTING_REF;
  if (ref) {
    console.log('\n=== PROJETO EXISTENTE ===');
    ok('Usando projeto informado', ref);
  } else {
    console.log('\n=== CRIAÇÃO DO PROJETO ===');
    const senhaBanco = randomBytes(24).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 24) + 'Aa1!';
    writeFileSync(DB_PASS_FILE, senhaBanco + '\n', 'utf8');

    const corpo = { name: NAME, organization_slug: org.slug, organization_id: org.id, db_pass: senhaBanco, region: REGION };
    const criado = await api('/projects', { method: 'POST', body: corpo });
    if (criado.status !== 200 && criado.status !== 201) {
      die(
        `Falha ao criar projeto (HTTP ${criado.status}): ${
          criado.json?.message || criado.json?.error || criado.text.slice(0, 400)
        }\n  Dica: confira o limite de projetos do plano gratuito (2) e a região (${REGION}).`
      );
    }
    ref = criado.json?.id || criado.json?.ref;
    if (!ref) die(`Resposta inesperada ao criar projeto: ${criado.text.slice(0, 400)}`);
    ok('Projeto criado', ref);
    console.log('  [i] Senha do banco salva em .supabase-db-password.txt (guardada no .gitignore)');

    console.log('\n=== AGUARDANDO PROJETO FICAR PRONTO ===');
    for (let i = 0; i < 60; i++) {
      const st = await api(`/projects/${ref}`);
      const status = st.json?.status || 'desconhecido';
      process.stdout.write(`  ... ${status}\n`);
      if (status === 'ACTIVE_HEALTHY') {
        ok('Projeto ativo');
        break;
      }
      if (['INIT_FAILED', 'INACTIVE', 'REMOVED', 'PAUSED'].includes(status)) {
        die(`Projeto entrou no estado ${status}. Veja o dashboard.`);
      }
      if (i === 59) die('Tempo esgotado aguardando o projeto ficar ativo. Rode de novo com --ref=' + ref);
      await sleep(10000);
    }
  }

  writeFileSync(
    STATE_FILE,
    JSON.stringify({ ref, name: NAME, region: REGION, organization: org ? org.slug || org.id : null }, null, 2) + '\n',
    'utf8'
  );

  console.log('\n=== SQL DE SETUP ===');
  const sql = readFileSync(SQL_FILE, 'utf8');
  // O endpoint responde 404/5xx enquanto o banco ainda está subindo: tentamos de novo.
  let run = null;
  for (let tentativa = 1; tentativa <= 5; tentativa++) {
    run = await api(`/projects/${ref}/database/query`, { method: 'POST', body: { query: sql } });
    const okStatus = run.status === 200 || run.status === 201;
    if (okStatus) break;
    const transitorio = run.status === 404 || run.status >= 500 || run.status === 429;
    if (!transitorio || tentativa === 5) {
      die(`Erro ao rodar o SQL (HTTP ${run.status}): ${run.json?.message || run.text.slice(0, 500)}`);
    }
    console.log(`  [i] HTTP ${run.status} — banco ainda não pronto, tentando de novo em 10s (${tentativa}/5)`);
    await sleep(10000);
  }
  ok('SQL aplicado', 'tabela profiles, RLS, políticas e trigger criados');
  if (Array.isArray(run.json) && run.json.length) {
    console.log('  [i] Resultado da verificação final:', JSON.stringify(run.json));
  }

  console.log('\n=== CHAVES DA API ===');
  const chaves = await api(`/projects/${ref}/api-keys?reveal=true`);
  let lista = Array.isArray(chaves.json) ? chaves.json : chaves.json?.data || [];
  if (!lista.length) {
    const semReveal = await api(`/projects/${ref}/api-keys`);
    lista = Array.isArray(semReveal.json) ? semReveal.json : semReveal.json?.data || [];
  }
  if (!lista.length) {
    die('Não foi possível ler as chaves. Copie em Project Settings > API e cole no .env.local para eu continuar.');
  }

  const porTipo = (t) => lista.find((k) => k.type === t);
  const anon = porTipo('publishable') || lista.find((k) => k.name === 'anon') || lista.find((k) => k.type === 'legacy' && k.name === 'anon');
  const service = porTipo('secret') || lista.find((k) => k.name === 'service_role') || lista.find((k) => k.name?.includes('service'));

  if (!anon?.api_key) die('Chave pública (anon/publishable) não encontrada na resposta da API.');
  if (!service?.api_key) die('Chave secreta (service_role/secret) não encontrada na resposta da API.');

  console.log('  [i] Chaves disponíveis:', lista.map((k) => `${k.name}/${k.type}`).join(', '));
  ok('Chave pública obtida', `${anon.name} (${String(anon.api_key).length} caracteres)`);
  ok('Chave secreta obtida', `${service.name} (${String(service.api_key).length} caracteres)`);

  patchEnvLocal({
    NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon.api_key,
    SUPABASE_SERVICE_ROLE_KEY: service.api_key,
  });
  ok('.env.local atualizado', 'URL + anon + service_role');

  console.log('\n=== CONFIGURAÇÃO DE AUTH ===');
  const conf = await api(`/projects/${ref}/config/auth`);
  if (conf.status === 200) {
    const c = conf.json || {};
    console.log(`  [i] Cadastro habilitado: ${c.disable_signup === false || c.disable_signup === undefined}`);
    console.log(`  [i] Confirmação de email obrigatória: ${c.mailer_autoconfirm === false}`);
  }
  const ajustar = await api(`/projects/${ref}/config/auth`, {
    method: 'PATCH',
    body: { disable_signup: false, external_email_enabled: true, mailer_autoconfirm: true },
  });
  if (ajustar.status === 200) ok('Auth ajustado', 'cadastro liberado e confirmação de email desligada (dev)');
  else console.log(`  [!] Não foi possível ajustar o Auth automaticamente (HTTP ${ajustar.status}). Ajuste em Authentication > Providers > Email.`);

  console.log('\n=== PRÓXIMO PASSO ===');
  console.log(`  node scripts/check-supabase.mjs --e2e\n`);
  console.log(`  Projeto: https://${ref}.supabase.co`);
}

main().catch((e) => {
  // process.exit() aqui derruba conexões HTTP abertas e, no Windows, gera
  // "Assertion failed ... UV_HANDLE_CLOSING". Saída limpa via exitCode.
  if (e instanceof Parar) {
    process.exitCode = 1;
  } else {
    console.error('\n[ERRO INESPERADO]', e?.stack || e);
    process.exitCode = 1;
  }
});
