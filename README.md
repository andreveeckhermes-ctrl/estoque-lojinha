# 📦 Estoque Lojinha

Sistema de vendas e estoque gratuito, offline-first e com leitor de código de barras. Feito para lojinha que quer organizar o estoque sem pagar nada.

🔗 **[Acesse agora](https://estoque-lojinha.vercel.app)**

## ✨ Funcionalidades

- **100% Offline** — dados salvos no navegador via SQLite WASM + IndexedDB
- **Leitor de Código de Barras** — escaneie pela câmera do celular
- **Controle de Estoque** — cadastro, entrada, saída e alertas de estoque baixo
- **PDV (Ponto de Venda)** — carrinho, formas de pagamento e finalização
- **Relatórios** — lucro, curva ABC, produtos mais vendidos
- **Export Excel e PDF** — com marca d'água no plano FREE
- **Backup e Restauração** — exporte e importe seu banco com 1 clique
- **Login e Planos** — FREE (50 produtos, 10 vendas/mês) e PRO (ilimitado)
- **SEO Otimizado** — sitemap, robots, manifest, landing pages

## 🚀 Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Estilo | Tailwind CSS |
| Banco Client | SQLite WASM + IndexedDB |
| Auth | Supabase Auth |
| Deploy | Vercel |

## 📦 Setup Local

```bash
# 1. Clone o repositório
git clone https://github.com/andreveeckhermes-ctrl/estoque-lojinha.git
cd estoque-lojinha

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais

# 4. Rode o desenvolvimento
npm run dev
```

## 🔧 Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_APP_NAME=estoque-lojinha
NEXT_PUBLIC_APP_URL=https://estoque-lojinha.vercel.app

# Supabase (obtido em: Supabase Dashboard > Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role

# Pagamento
NEXT_PUBLIC_PAGSEGURO_LINK=https://pag.ae/seu-link

# Contato
NEXT_PUBLIC_DEV_WHATSAPP=5551991251325
NEXT_PUBLIC_ADMIN_EMAIL=seu-email@gmail.com

# SEO
GOOGLE_VERIFICATION_ID=
```

## 🗄️ Setup Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Vá em **SQL Editor** e rode o script abaixo:

```sql
-- Tabela de perfis (planos)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free','pro')),
  pro_ativo BOOLEAN DEFAULT false,
  pro_liberado_em TIMESTAMPTZ,
  pro_expira_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Usuário pode VER seu próprio perfil
CREATE POLICY "user pode ver seu proprio perfil"
ON profiles FOR SELECT USING (auth.uid() = id);

-- Usuário pode CRIAR seu próprio perfil (signup)
CREATE POLICY "user pode criar seu proprio perfil"
ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ⚠️ NÃO criar política de UPDATE para o usuário comum!
-- O plano SÓ pode ser alterado via service_role (rota /api/admin/users)
```

3. Ative **Email Signups**: Authentication > Providers > Email > "Allow new users to sign up"
4. (Opcional) Desative "Confirm email" para desenvolvimento

## 🚢 Deploy na Vercel

1. Faça push para o GitHub:
```bash
git add .
git commit -m "feat: initial deploy"
git push origin main
```

2. No [Vercel](https://vercel.com), importe o repositório
3. Configure as Environment Variables (as mesmas do `.env.local`)
4. Deploy automático! 🎉

## 📁 Estrutura

```
src/
├── app/
│   ├── (landing)/          # Páginas públicas (SEO)
│   ├── app/                # Área autenticada
│   │   ├── page.tsx        # Dashboard principal
│   │   ├── vendas/page.tsx # PDV (Ponto de Venda)
│   │   └── relatorios/page.tsx
│   ├── admin/page.tsx      # Painel de liberação PRO
│   └── login/page.tsx      # Login/Cadastro
├── components/
│   ├── backup/             # Exportar/Importar backup
│   ├── layout/             # AuthGuard, Footer
│   ├── paywall/            # Paywall com PagBank
│   └── landing/            # Landing pages SEO
└── lib/
    ├── db/                 # SQLite WASM + queries
    ├── auth/               # usePlan hook
    ├── supabase/           # Client + Admin
    └── export/             # CSV + PDF
```

## 📄 Licença

Projeto privado — André Veek Hermes
