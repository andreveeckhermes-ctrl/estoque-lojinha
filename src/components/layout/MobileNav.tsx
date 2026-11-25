'use client';
import Link from 'next/link';

type Tela = 'estoque' | 'vendas' | 'relatorios';

const itens: { href: string; label: string; tela: Tela; icone: string }[] = [
  { href: '/app', label: 'Estoque', tela: 'estoque', icone: '📦' },
  { href: '/app/vendas', label: 'PDV', tela: 'vendas', icone: '🛒' },
  { href: '/app/relatorios', label: 'Relatórios', tela: 'relatorios', icone: '📊' },
];

/**
 * Barra de navegação fixa no topo do conteúdo, só no celular.
 * Antes cada tela repetia (ou não tinha) a sua, e o PDV/Relatórios
 * ficavam sem nenhum atalho no mobile.
 */
export function MobileNav({ ativo }: { ativo: Tela }) {
  return (
    <nav className="sm:hidden sticky top-16 z-30 bg-white border-b border-zinc-100">
      <div className="flex gap-1 px-2 py-2">
        {itens.map(item => {
          const selecionado = item.tela === ativo;
          return (
            <Link
              key={item.tela}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition-colors ${
                selecionado ? 'bg-primary-50 text-primary-700' : 'text-zinc-500 active:bg-zinc-50'
              }`}
            >
              <span className="text-base leading-none">{item.icone}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
