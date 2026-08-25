# BLUEPRINT COMPLETO - Sistema de Vendas e Estoque Gratuito para Lojinha
> App: Gestor de Estoque Offline para Lojinha / Instagram / Brechó
> Stack Base: v5 Generico - 100% Client-First, SQLite WASM, SEO Forte, Paywall Manual

## 1. OBJETIVO DO APP

Criar o substituto definitivo da planilha de estoque para lojistas de Instagram, brechós e lojas pequenas. 100% offline, privado, com leitor de código de barras via câmera do celular e backup com 1 clique.

**Proposta de valor:** "O sistema de vendas e estoque gratuito que funciona offline, com leitor de código de barras grátis, sem planilha travada."

## 2. STACK OBRIGATÓRIA (Mesma da Stack Base)

- **Frontend:** Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui
- **DB:** sql.js (SQLite WASM) + IndexedDB via idb-keyval
- **Auth & Planos:** Supabase Auth + tabela profiles
- **Leitor Código Barras:** html5-qrcode (roda 100% no navegador)
- **Deploy:** GitHub + Vercel
- **Pagamento:** Link de recorrência PagSeguro + liberação manual via /admin

## 3. ESTRUTURA DE PASTAS DO APP

```
/src/app/
  /(landing)/page.tsx -> Landing SEO: sistema de vendas e estoque gratuito
  /(landing)/codigo-de-barras/page.tsx -> controle de estoque com código de barras grátis
  /(landing)/para-loja-de-roupas/page.tsx -> nicho moda
  /(landing)/offline/page.tsx -> controle de estoque offline grátis
  /app/page.tsx -> App principal (protegido)
  /app/produtos/page.tsx
  /app/vendas/page.tsx
  /app/relatorios/page.tsx
  /login/page.tsx
  /admin/page.tsx -> Liberação manual PRO
  /sitemap.ts, /robots.ts, /manifest.ts

/src/lib/db/
  schema.ts -> Schema SQLite do estoque
  client.ts -> getDb() e saveDb()
  backup.ts -> export/import .db

/src/components/
  /layout/Footer.tsx -> Obrigatório com wa.me/5551991251325
  /estoque/ScannerBarra.tsx -> Leitor via câmera
  /estoque/ProdutoForm.tsx
  /estoque/TabelaProdutos.tsx
  /backup/BackupControls.tsx
  /paywall/Paywall.tsx
```

## 4. SCHEMA SQLITE COMPLETO (src/lib/db/schema.ts)

```sql
-- Produtos
CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  codigo_barras TEXT UNIQUE,
  categoria TEXT,
  quantidade INTEGER DEFAULT 0,
  quantidade_minima INTEGER DEFAULT 5,
  preco_custo REAL DEFAULT 0,
  preco_venda REAL NOT NULL,
  fornecedor TEXT,
  foto_url TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Movimentações (entrada/saída)
CREATE TABLE IF NOT EXISTS movimentacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  produto_id INTEGER NOT NULL,
  tipo TEXT CHECK(tipo IN ('entrada','saida','venda','perda')) NOT NULL,
  quantidade INTEGER NOT NULL,
  motivo TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

-- Vendas
CREATE TABLE IF NOT EXISTS vendas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  total REAL NOT NULL,
  desconto REAL DEFAULT 0,
  forma_pagamento TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendas_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venda_id INTEGER NOT NULL,
  produto_id INTEGER NOT NULL,
  quantidade INTEGER NOT NULL,
  preco_unitario REAL NOT NULL,
  FOREIGN KEY (venda_id) REFERENCES vendas(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_produtos_barras ON produtos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_mov_produto ON movimentacoes(produto_id);
```

## 5. FUNCIONALIDADES - FREE vs PRO

| Funcionalidade | FREE (até 50 produtos) | PRO (Ilimitado - R$29/mês) |
|---|---|---|
| Cadastro de produtos | 50 produtos | Ilimitado |
| Leitor código de barras | ✅ Via câmera | ✅ Via câmera |
| Controle entrada/saída | ✅ | ✅ |
| Alerta estoque baixo | ✅ | ✅ |
| Vendas e caixa | 10 vendas/mês | Ilimitado |
| Relatórios | Básico | Completo + lucro |
| Export Excel | ❌ | ✅ |
| Export PDF com marca d'água | ✅ Com marca | ✅ Sem marca |
| Suporte WhatsApp | Comunidade | Prioritário 5551991251325 |
| Backup/Restore | ✅ | ✅ |

**Regra de negócio:** Se `produtos.count >= 50` e `plan == 'free'` -> mostra Paywall.

## 6. FLUXO DE PAGAMENTO MANUAL (Obrigatório Stack Base)

1. Usuário cria conta em /login (Supabase Auth) -> cria profiles com plan='free'
2. Ao tentar cadastrar 51º produto ou fazer 11ª venda, vê Paywall
3. Paywall tem 2 botões:
   - Botão 1: `Assinar PRO - PagSeguro` -> link de recorrência (env var NEXT_PUBLIC_PAGSEGURO_LINK)
   - Botão 2: `Já paguei, liberar via WhatsApp` -> wa.me/5551991251325?text=Olá André! Paguei o PRO do app de estoque. Meu email é X. Libera?
4. Dev recebe email do PagSeguro ou mensagem no WhatsApp
5. Dev entra em /admin (protegido por NEXT_PUBLIC_ADMIN_EMAIL) e clica em "Liberar PRO"
6. Usuário vira PRO instantaneamente

**Tabela Supabase obrigatória:**
```sql
create table profiles (
  id uuid references auth.users(id) primary key,
  email text,
  plan text default 'free' check (plan in ('free','pro')),
  pro_ativo boolean default false,
  pro_liberado_em timestamptz,
  created_at timestamptz default now()
);
```

## 7. COMPONENTES OBRIGATÓRIOS

### 7.1 ScannerBarra.tsx
- Usar html5-qrcode
- Botão "Escanear Código" abre câmera traseira
- Ao ler, preenche campo codigo_barras no ProdutoForm
- Se produto já existe, já adiciona +1 no estoque

### 7.2 BackupControls.tsx (Regra Stack Base)
- Botão Exportar Backup -> baixa backup-estoque-lojinha-AAAA-MM-DD.db
- Botão Importar Backup -> input file .db com validação header SQLite format 3 + confirm de sobrescrita

### 7.3 Footer.tsx (Regra Stack Base)
- Em TODAS as páginas
- Texto: © 2026 Estoque Lojinha. Dados salvos localmente no seu dispositivo.
- Link: "💬 Fale com o desenvolvedor" -> DEVELOPER_CONTACT.getLink() com wa.me/5551991251325

### 7.4 Paywall.tsx
- Genérico, recebe email do usuário
- Mostra comparação FREE vs PRO
- 2 CTAs: PagSeguro + WhatsApp

## 8. SEO - PLANO IMPLEMENTADO (Baseado no PLANO-SEO-ESTOQUE)

**Title principal:**
`Sistema de Vendas e Estoque Gratuito com Leitor de Código de Barras Offline`

**Meta Description:**
`Sistema de controle de vendas e estoque gratuito e offline. 50 produtos grátis, leitor de código de barras via câmera do celular, funciona sem internet. Adeus planilha travada.`

**H1 Landing /:**
`Sistema de Vendas e Estoque Gratuito e Offline para Lojinha`

**Keywords para inserir no texto da landing (densidade natural):**
- sistema de vendas e estoque gratuito
- sistema de controle de vendas e estoque gratuito
- controle de estoque gratuito
- controle de estoque com código de barras grátis
- controle de estoque offline grátis
- aplicativo para controle de estoque grátis
- programa controle de estoque gratuito

**Sitemap:**
- / -> foco principal
- /codigo-de-barras -> foco código de barras
- /para-loja-de-roupas -> foco nicho moda
- /offline -> foco offline
- /app -> noindex (app interno)

**JSON-LD:**
SoftwareApplication com offer free e paid.

## 9. FLUXO DO USUÁRIO NO APP

1. Entra na landing, vê "50 produtos grátis + leitor código de barras"
2. Clica em "Começar Grátis" -> /login
3. Cria conta
4. Cai no /app vazio, modal "Importe sua planilha ou escaneie seu primeiro produto"
5. Escaneia código com câmera -> cria produto
6. Usa até 50 produtos. No 51º, Paywall.
7. Paga, avisa no WhatsApp, é liberado via /admin

## 10. TELAS DO APP (/app)

**/app - Dashboard:**
- Cards: Total produtos, Valor em estoque, Produtos com estoque baixo, Vendas hoje
- Tabela produtos com busca por nome/código barras
- Botão + Novo Produto
- Botão Escanear para dar entrada rápida

**/app/vendas - PDV Simples:**
- Escaneia produtos, adiciona na lista, finaliza venda, baixa estoque automaticamente, registra em vendas

**/app/relatorios:**
- FREE: lista de produtos com estoque baixo
- PRO: lucro, produtos mais vendidos, curva ABC, export Excel

## 11. VARIÁVEIS DE AMBIENTE

```
NEXT_PUBLIC_APP_NAME=estoque-lojinha-offline
NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_PAGSEGURO_LINK=https://pagseguro.com.br/seu-link-recorrencia-29
NEXT_PUBLIC_DEV_WHATSAPP=5551991251325
NEXT_PUBLIC_ADMIN_EMAIL=seu-email@gmail.com
GOOGLE_VERIFICATION_ID=
```

## 12. CHECKLIST FINAL PARA AGENTE - NÃO ENTREGAR SEM ISSO

- [ ] SQLite WASM funcionando e salvando no IndexedDB
- [ ] BackupControls com Exportar e Importar .db (validação header + confirm)
- [ ] Footer global com link WhatsApp 5551991251325 com mensagem dinâmica
- [ ] Supabase Auth funcionando
- [ ] Tabela profiles criada com RLS
- [ ] /admin protegido apenas para ADMIN_EMAIL
- [ ] Paywall com 2 botões: PagSeguro + WhatsApp Já Paguei
- [ ] Scanner de código de barras via html5-qrcode funcionando no celular
- [ ] Limite FREE 50 produtos bloqueando com Paywall
- [ ] sitemap.ts e robots.ts acessíveis
- [ ] metadataBase + title + description com keywords âncora
- [ ] Landing com H1 "Sistema de Vendas e Estoque Gratuito e Offline"
- [ ] Deploy Vercel conectado ao GitHub funcionando

## 13. DESIGN SYSTEM - ESTILO VISUAL BASEADO NA REFERÊNCIA (Dashboard Estoque Lojinha)

> **Referência visual obrigatória:** Usar o screenshot `estoque_lojinha_dashboard.webp` como guia de UI. O agente deve replicar fielmente este estilo.

### 13.1 Identidade e Logo
- **Nome:** Estoque Lojinha
- **Logo:** Ícone de caixa/pacote em fundo verde arredondado (rounded-xl) + texto "Estoque" em cima e "Lojinha" embaixo, bold, cor #1a1a1a
- **Favicon:** Mesmo ícone de caixa verde

### 13.2 Paleta de Cores (Tailwind Config)

```typescript
// tailwind.config.ts - colors
colors: {
  primary: {
    50: '#f0fdf4',   // fundo claro cards verdes
    100: '#dcfce7',  // bg ícone Total produtos
    500: '#16a34a',  // verde principal
    600: '#15803d',  // verde botão + Novo Produto, Iniciar Escaneamento
    700: '#14532d',  // hover
  },
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',  // bg ícone Estoque baixo
    500: '#ef4444',
    600: '#dc2626',  // texto 12 itens
  },
  zinc: {
    50: '#fafafa',   // bg pagina
    100: '#f4f4f5',  // bg header tabela
    500: '#71717a',
    900: '#18181b',
  }
}
```

- **Fundo da página:** `bg-[#f5f5f5]` ou `bg-zinc-50` cinza bem claro
- **Cards:** `bg-white rounded-2xl shadow-lg border border-zinc-100`

### 13.3 Tipografia
- **Fonte:** Inter ou Geist Sans (Next.js font)
- **Dashboard Título:** `text-3xl font-bold tracking-tight text-zinc-900`
- **Números grandes nos cards:** `text-4xl font-extrabold text-zinc-900`
- **Valores R$:** `text-3xl font-bold`
- **Tabela header:** `text-sm font-semibold text-zinc-600`

### 13.4 Componentes UI (Baseado na Imagem)

**Header / Navbar:**
- `h-16 bg-white border-b sticky top-0`
- Menu: Dashboard com pill verde `bg-primary-600 text-white px-4 py-1.5 rounded-full font-medium`, demais itens `text-zinc-500 hover:text-zinc-900`
- Direita: ícones busca e sino + avatar JL verde + nome João Lima

**Cards de Métricas (4 colunas):**
```tsx
<div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border">
  <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center mx-auto">
    <BoxIcon className="text-primary-600" />
  </div>
  <p className="text-sm text-zinc-500 text-center mt-3">Total produtos</p>
  <p className="text-4xl font-bold text-center">1.247</p>
  <p className="text-xs text-primary-600 text-center mt-1">↗ 12% vs mês passado</p>
</div>
```
- Para Estoque Baixo: `bg-danger-100` ícone vermelho, número `text-danger-600`

**Tabela Produtos em estoque:**
- Container: `bg-white rounded-2xl shadow-lg p-6`
- Input busca: `rounded-full border px-4 py-2` com placeholder "Buscar produto, código de barras..."
- Botão Filtros: `rounded-full border px-4`
- Header tabela: `bg-zinc-100 rounded-lg`
- Linha: foto 40x40 rounded-lg + nome bold + variação "Preto • Tamanho M" em text-xs
- Código barras: `bg-zinc-100 rounded-full px-3 py-1 text-xs font-mono`
- Status: Pill `bg-green-100 text-green-700` com bolinha "● Em estoque" ou `bg-red-100 text-red-700` "● Estoque baixo"
- Paginação: botões Anterior/Próximo rounded-lg + números, página ativa `bg-primary-600 text-white rounded-full`

**Card Leitor de Código de Barras (Lateral direita):**
- `bg-white rounded-2xl shadow-lg p-6`
- Título com ícone câmera `text-primary-600`
- Mockup celular: imagem centralizada de smartphone com scanner verde escaneando código de barras
- Texto: "Leitura em tempo real para entrada rápida de estoque" text-xs center
- Botão principal: `w-full bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-3 font-medium`
- Botão secundário: `w-full border border-zinc-300 rounded-xl py-2.5`
- Dica verde clara: `bg-green-50 border border-green-200 rounded-lg p-3 text-xs`

**Botão + Novo Produto (Topo direita):**
- `bg-primary-600 hover:bg-primary-700 text-white rounded-full px-5 py-2.5 font-medium shadow`

### 13.5 Regras de Estilo para o Agente

- [ ] NUNCA usar cores neon ou azul. O app é VERDE (#15803d) + ZINC + VERMELHO apenas para alerta
- [ ] Tudo com `rounded-2xl` e `rounded-full` - nada quadrado seco
- [ ] Sombras suaves `shadow-[0_4px_20px_rgba(0,0,0,0.05)]` não shadow forte preta
- [ ] Ícones sempre dentro de círculo claro (bg-primary-50 ou bg-danger-100)
- [ ] Status sempre com bolinha colorida + texto
- [ ] Dashboard sempre com 4 cards métricos em cima + tabela grande + card scanner lateral (layout grid 12 colunas: 8 para tabela, 4 para scanner)
- [ ] Mobile: cards empilham, scanner vai para baixo da tabela
- [ ] Footer da imagem: "Estoque Lojinha • v1.2.0 • Feito com Next.js + Tailwind + shadcn/ui • Deployado na Vercel" em text-xs center zinc-400

### 13.6 Exemplo de Classe CSS Global

```css
/* globals.css */
:root {
  --primary: 142 76% 36%; /* #15803d */
  --primary-foreground: 0 0% 98%;
}
body {
  background-color: #f6f6f6;
  font-family: 'Inter', sans-serif;
}
.card-estoque {
  @apply bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-zinc-100;
}
```

## 14. REGRA DE OURO

> Se funciona 100% offline no SQLite do navegador, escaneia código de barras pela câmera, tem backup com 1 clique, tem login, tem paywall manual liberado via /admin, tem footer com WhatsApp 5551991251325, rankeia para "sistema de vendas e estoque gratuito" E tem o visual verde clean com cards arredondados e scanner lateral igual à referência estoque_lojinha_dashboard.webp, estamos seguindo o blueprint.

---
**Arquivos de referência obrigatórios para o agente ler antes de codar:**
- STACK-BASE-v5-GENERICO.md
- PLANO-SEO-ESTOQUE-GESTOR-LOJINHA.md
- estoque_lojinha_dashboard.webp (referência visual obrigatória - copiar cores, cards, tipografia)
- Este arquivo BLUEPRINT
