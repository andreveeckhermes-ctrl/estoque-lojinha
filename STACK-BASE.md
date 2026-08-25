# STACK BASE - Blueprint Padrão para Aplicações Web

> Este documento define a estrutura técnica obrigatória para qualquer aplicação web desenvolvida. Todas as novas aplicações devem seguir este padrão.

## 1. Objetivo

Desenvolver aplicações web que rodam 100% no navegador do usuário (client-first), com performance alta, privacidade total, custo zero de backend inicial e preparadas para SEO forte e indexação no Google.

## 2. Stack Core Obrigatória

### Frontend
- **React 18+ com Next.js 14+ (App Router):** Framework obrigatório para SSR/SSG e SEO.
- **TypeScript:** Tipagem obrigatória.
- **Tailwind CSS:** Estilização padrão. Componentes UI customizados via Tailwind (shadcn/ui opcional).
- **Node.js 20+ LTS:** Ambiente de desenvolvimento e build.

### Banco de Dados - Client-Side First
- **SQLite no Navegador:** `sql.js` ou `@sqlite.org/sqlite-wasm` (WASM).
- **Persistência:** Arquivo `.db` salvo no `IndexedDB` via `idb-keyval` ou `Dexie.js`.
- **Princípio:** Dados do usuário ficam no navegador. Nenhum envio para servidor sem consentimento.

### Backend Complementar (Quando Necessário)
- **Supabase (Opcional/Eventual):** Usado SOMENTE quando necessário para:
  - Autenticação de usuários
  - Controle de planos e assinaturas
  - Sincronização entre dispositivos
  - Storage
- **Regra:** App deve funcionar offline mesmo sem Supabase, exceto quando houver monetização. Com monetização, Supabase se torna obrigatório para Auth e controle de plano.

### Versionamento e Deploy
- **GitHub:** Versionamento único. Commits semânticos.
- **Vercel:** Deploy automático conectado ao GitHub. `main` -> produção.

## 3. Arquitetura Padrão

```
[Navegador] -> React + SQLite WASM + IndexedDB + Backup/Restore + Footer WhatsApp
[Vercel] -> Frontend + Rota /admin protegida
[Supabase] -> Auth + Tabela profiles (quando houver pagamento)
[Pagamento Externo] -> Link de Recorrência (PagSeguro) -> Aviso Email/WhatsApp
```

## 4. Estrutura de Pastas Padrão

```
/src/app/(landing) /app/app /app/admin /app/login
/src/components/backup /components/layout /components/paywall
/src/lib/db /lib/supabase /lib/auth /lib/constants.ts
```

## 5. Requisito Obrigatório: SEO Forte

- [x] Metadata API em toda página
- [x] Sitemap dinâmico `app/sitemap.ts`
- [x] Robots `app/robots.ts`
- [ ] Imagens com `next/image` e `alt` (quando houver)
- [ ] JSON-LD (opcional, adicionar quando necessário)
- [x] Open Graph 1200x630
- [x] Conteúdo indexável em SSR (LandingSeoPage como server component)

## 6. Requisito Obrigatório: Google Search Console

- [x] `metadata.verification.google`
- [x] Sitemap e Robots acessíveis
- [x] Canonical URL (metadataBase)
- [x] 404 personalizado (`not-found.tsx`)
- [x] Loading states (`loading.tsx`)
- [x] Error boundaries (`error.tsx`)

## 7. Requisito Obrigatório: Backup e Restauração Local

Toda aplicação com SQLite DEVE ter:

- [x] **Exportar Backup:** Botão que baixa `.db` completo. Nome padrão `backup-NOME-APP-AAAA-MM-DD.db`
- [x] **Importar Backup:** Input file aceitando `.db`/`.sqlite` com validação e modal de confirmação de sobrescrita.
- [x] **100% Offline:** Sem envio para nuvem.

## 8. Requisito Obrigatório: Rodapé com Contato do Desenvolvedor

- [x] Footer global em todas as páginas
- [x] Link WhatsApp com mensagem pré-preenchida usando `wa.me`

```typescript
// /src/lib/constants.ts
export const DEVELOPER_CONTACT = {
  whatsapp: '5551991251325',
  getLink: (appName: string) => {
    const msg = `Olá André! Vim pelo app ${appName} e gostaria de falar sobre sugestões e negócios. Site: ${typeof window !== 'undefined' ? window.location.href : ''}`;
    return `https://wa.me/5551991251325?text=${encodeURIComponent(msg)}`;
  }
}
```

## 9. Requisito Obrigatório: Fluxo de Monetização e Pagamento Manual

Este é o fluxo padrão de cobrança para QUALQUER aplicação. O objetivo é validar rápido sem automação complexa de webhook.

### 9.1 Princípio do Modelo
- Todo app terá dois níveis: `FREE` e `PRO`
- As limitações do FREE e benefícios do PRO são definidos por app, mas o FLUXO de pagamento é sempre o mesmo.
- Cobrança via **link de pagamento recorrente** (PagSeguro ou similar) já configurado.
- Liberação de acesso é **manual** via painel admin.

### 9.2 Fluxo Completo Padrão
1. Usuário cria conta com login e senha (Supabase Auth)
2. Sistema cria perfil na tabela `profiles` com `plan='free'`
3. Usuário usa recursos FREE. Ao tentar usar recurso PRO, vê Paywall
4. Paywall exibe botão para Link de Pagamento Recorrente
5. Usuário paga no link externo
6. PagSeguro avisa desenvolvedor por email OU usuário avisa via WhatsApp do rodapé
7. Desenvolvedor acessa rota `/admin` e libera PRO manualmente
8. Usuário passa a ter `plan='pro'` e acesso liberado

### 9.3 Tabela Supabase Padrão (Obrigatória para Apps Pagos)

```sql
create table profiles (
  id uuid references auth.users(id) primary key,
  email text,
  plan text default 'free' check (plan in ('free','pro')),
  pro_ativo boolean default false,
  pro_liberado_em timestamp with time zone,
  pro_expira_em timestamp with time zone,
  created_at timestamp default now()
);

alter table profiles enable row level security;
create policy "user pode ver seu proprio perfil" on profiles for select using (auth.uid() = id);
create policy "user pode criar seu proprio perfil" on profiles for insert with check (auth.uid() = id);
-- ❌ NÃO criar política de UPDATE para o usuário comum!
-- O plano SÓ pode ser alterado via service_role (rota /api/admin/users).
-- Isso impede que o usuário libere o PRO sem pagar.
```

### 9.4 Painel Admin - Liberação Manual

- [x] **Rota:** `/admin`
- [x] **Proteção:** Acesso restrito apenas ao email do administrador. Validar no layout:
  ```typescript
  if (user?.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) redirect('/');
  ```
- [ ] **Funcionalidades obrigatórias:**
  - [x] Listar usuários (email, plano, data cadastro)
  - [x] Botão "Liberar PRO" -> `plan='pro', pro_ativo=true`
  - [x] Botão "Remover PRO" -> `plan='free', pro_ativo=false`

### 9.5 Componente de Paywall Genérico

```tsx
// Componente padrão para usar em qualquer app
export function Paywall({ email, pagseguroLink }: { email: string, pagseguroLink: string }) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'este app';
  const waLink = `https://wa.me/5551991251325?text=${encodeURIComponent(
    `Olá André! Acabei de pagar o PRO do app ${appName}. Meu email de cadastro é ${email}. Pode liberar meu acesso?`
  )}`;

  return (
    <div className="paywall">
      <h3>Recurso exclusivo PRO</h3>
      <p>Assine para liberar este e outros recursos</p>
      <a href={pagseguroLink} target="_blank" rel="noopener noreferrer">Assinar PRO</a>
      <a href={waLink} target="_blank" rel="noopener noreferrer">Já paguei, liberar via WhatsApp</a>
    </div>
  )
}
```

### 9.6 Regras Gerais
- [x] Nunca depender de webhook no MVP
- [x] Sempre ter botão "Já paguei, avisar no WhatsApp" levando para `wa.me/5551991251325`
- [x] Links de recorrência configurados via variável de ambiente `NEXT_PUBLIC_PAGSEGURO_LINK`
- [x] Lógica de `usePlan()` para verificar `plan` e bloquear/liberar recursos

## 10. Fluxo de Trabalho Padrão

1. Clone template base
2. Configurar `.env.local` (Supabase, PagSeguro, WhatsApp, Admin Email)
3. Rodar migration SQL no Supabase (001_fix_profiles_rls.sql)
4. `npm run dev`
5. Push GitHub -> Deploy Vercel
6. Criar usuário admin
7. Testar fluxo: cadastro -> paywall -> pagamento teste -> liberação /admin
8. Enviar sitemap no Search Console

## 11. Variáveis de Ambiente Padrão

```
NEXT_PUBLIC_APP_NAME=nome-do-app
NEXT_PUBLIC_APP_URL=https://seu-app.vercel.app
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_PAGSEGURO_LINK=https://pagseguro.com.br/seu-link-recorrencia
NEXT_PUBLIC_DEV_WHATSAPP=5551991251325
NEXT_PUBLIC_ADMIN_EMAIL=seu-email@gmail.com
GOOGLE_VERIFICATION_ID=
```

## 12. Regra de Ouro

> **Se funciona offline no SQLite, tem backup com 1 clique, tem login, tem paywall com liberação manual via /admin, tem footer com WhatsApp para contato e é indexável no Google, estamos seguindo o blueprint.**

Nenhum app deve ser criado fora desta estrutura sem justificativa documentada.
