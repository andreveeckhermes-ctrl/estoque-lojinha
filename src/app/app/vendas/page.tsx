'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Produto,
  Venda,
  listarProdutos,
  listarVendas,
  buscarProdutoPorCodigo,
  registrarVenda,
  contarVendasMes,
} from '@/lib/db/estoque';
import { usePlan } from '@/lib/auth/usePlan';
import { Paywall } from '@/components/paywall/Paywall';
import dynamic from 'next/dynamic';
const ScannerBarra = dynamic(() => import('@/components/estoque/ScannerBarra').then(m => m.ScannerBarra), { ssr: false });
import { supabase } from '@/lib/supabase/client';

const LIMITE_FREE_VENDAS_MES = 10;

interface CartItem {
  produto: Produto;
  quantidade: number;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function VendasPage() {
  const { isPro, isFree, loading: planLoading, email } = usePlan();

  // Data
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendasMes, setVendasMes] = useState(0);
  const [busca, setBusca] = useState('');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [formaPagamento, setFormaPagamento] = useState('dinheiro');

  // Scanner
  const [scannerAberto, setScannerAberto] = useState(false);

  // Paywall
  const [paywallAberto, setPaywallAberto] = useState(false);
  const [paywallMotivo, setPaywallMotivo] = useState('');

  // Confirmação
  const [confirmacao, setConfirmacao] = useState<{ ok: boolean; total: number } | null>(null);

  const recarregar = useCallback(async (termo?: string) => {
    const lista = await listarProdutos(termo);
    setProdutos(lista);
    setVendas(await listarVendas(20));
    setVendasMes(await contarVendasMes());
  }, []);

  useEffect(() => {
    if (!planLoading) recarregar();
  }, [planLoading, recarregar]);

  useEffect(() => {
    const t = setTimeout(() => recarregar(busca || undefined), 300);
    return () => clearTimeout(t);
  }, [busca, recarregar]);

  const total = cart.reduce((acc, item) => acc + item.produto.preco_venda * item.quantidade, 0);

  const itensTotal = cart.reduce((acc, item) => acc + item.quantidade, 0);

  function abrirPaywall(motivo: string) {
    setPaywallMotivo(motivo);
    setPaywallAberto(true);
  }

  // Scanner: ao escanear, adiciona no carrinho ou busca
  async function handleScan(codigo: string) {
    setScannerAberto(false);
    const produto = await buscarProdutoPorCodigo(codigo);
    if (produto) {
      adicionarAoCart(produto);
    } else {
      alert(`Produto com código "${codigo}" não encontrado. Cadastre-o primeiro no Dashboard.`);
    }
  }

  function adicionarAoCart(produto: Produto) {
    if (produto.estoque <= 0) {
      alert(`"${produto.nome}" está sem estoque.`);
      return;
    }
    setCart(prev => {
      const existente = prev.find(item => item.produto.id === produto.id);
      if (existente) {
        // Verifica estoque
        if (existente.quantidade >= produto.estoque) {
          alert(`Estoque insuficiente para "${produto.nome}" (disponível: ${produto.estoque}).`);
          return prev;
        }
        return prev.map(item =>
          item.produto.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...prev, { produto, quantidade: 1 }];
    });
  }

  function removerDoCart(produtoId: number) {
    setCart(prev => prev.filter(item => item.produto.id !== produtoId));
  }

  function atualizarQuantidade(produtoId: number, novaQtd: number) {
    if (novaQtd <= 0) {
      removerDoCart(produtoId);
      return;
    }
    setCart(prev =>
      prev.map(item => {
        if (item.produto.id !== produtoId) return item;
        if (novaQtd > item.produto.estoque) {
          alert(`Estoque insuficiente. Disponível: ${item.produto.estoque}`);
          return item;
        }
        return { ...item, quantidade: novaQtd };
      })
    );
  }

  async function finalizarVenda() {
    if (cart.length === 0) {
      alert('Adicione produtos ao carrinho antes de finalizar.');
      return;
    }
    if (isFree && vendasMes >= LIMITE_FREE_VENDAS_MES) {
      abrirPaywall(`Limite do plano FREE: ${LIMITE_FREE_VENDAS_MES} vendas por mês. Assine o PRO para vendas ilimitadas.`);
      return;
    }

    const itens = cart.map(item => ({
      produto_id: item.produto.id,
      quantidade: item.quantidade,
      preco_unitario: item.produto.preco_venda,
    }));

    const res = await registrarVenda(itens);
    if (!res.ok) {
      alert(res.erro);
      return;
    }

    setConfirmacao({ ok: true, total });
    setCart([]);
    await recarregar(busca || undefined);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  if (planLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-zinc-500">Carregando...</div>;
  }

  const produtosComEstoque = busca
    ? produtos.filter(p => p.estoque > 0)
    : produtos.filter(p => p.estoque > 0).slice(0, 20);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Navbar */}
      <header className="h-16 bg-white border-b border-zinc-100 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/app" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center text-lg">📦</div>
              <div>
                <p className="font-bold text-sm leading-tight">Estoque</p>
                <p className="font-bold text-sm leading-tight text-primary-600">Lojinha</p>
              </div>
            </Link>
          </div>

          <nav className="hidden sm:flex items-center gap-1">
            <Link href="/app" className="text-zinc-500 px-4 py-1.5 rounded-full text-sm font-medium hover:text-zinc-900 transition-colors">
              Dashboard
            </Link>
            <span className="bg-primary-600 text-white px-4 py-1.5 rounded-full text-sm font-medium">
              PDV
            </span>
            <Link href="/app/relatorios" className="text-zinc-500 px-4 py-1.5 rounded-full text-sm font-medium hover:text-zinc-900 transition-colors">
              Relatórios
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${isPro ? 'bg-primary-50 text-primary-700' : 'bg-zinc-100 text-zinc-500'}`}>
              {isPro ? 'PRO' : `${vendasMes}/${LIMITE_FREE_VENDAS_MES} vendas`}
            </span>
            <button onClick={handleLogout} className="text-xs text-zinc-400 hover:text-zinc-600">Sair</button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">PDV — Ponto de Venda</h1>
            <p className="text-sm text-zinc-500 mt-1">Escaneie ou busque produtos para adicionar à venda</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna esquerda: Busca + Lista de Produtos */}
          <div className="lg:col-span-5">
            {/* Busca + Scanner */}
            <div className="card-estoque p-4 mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Buscar produto por nome ou código..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  className="input-search flex-1"
                />
                <button
                  onClick={() => setScannerAberto(true)}
                  className="btn-primary px-4 whitespace-nowrap"
                >
                  📷 Escanear
                </button>
              </div>
            </div>

            {/* Lista de Produtos */}
            <div className="card-estoque overflow-hidden">
              <div className="bg-zinc-50 px-4 py-2.5 border-b border-zinc-100">
                <p className="text-sm font-semibold text-zinc-600">
                  Produtos disponíveis ({produtosComEstoque.length})
                </p>
              </div>
              <div className="max-h-[50vh] overflow-y-auto divide-y divide-zinc-50">
                {produtosComEstoque.map(p => (
                  <button
                    key={p.id}
                    onClick={() => adicionarAoCart(p)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary-50/50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-zinc-900 truncate">{p.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.categoria && <span className="text-xs text-zinc-400">{p.categoria}</span>}
                        {p.codigo_barras && (
                          <span className="bg-zinc-100 rounded-full px-2 py-0.5 text-[10px] font-mono text-zinc-500">
                            {p.codigo_barras}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-sm font-bold text-primary-600">{fmt(p.preco_venda)}</p>
                      <p className="text-[10px] text-zinc-400">estoque: {p.estoque}</p>
                    </div>
                  </button>
                ))}
                {produtosComEstoque.length === 0 && (
                  <div className="py-12 text-center text-zinc-400 text-sm">
                    {busca ? 'Nenhum produto encontrado.' : 'Nenhum produto com estoque disponível.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Coluna direita: Carrinho */}
          <div className="lg:col-span-7">
            <div className="card-estoque p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  🛒 Carrinho
                  {itensTotal > 0 && (
                    <span className="bg-primary-50 text-primary-700 rounded-full px-2.5 py-0.5 text-xs font-bold">
                      {itensTotal} {itensTotal === 1 ? 'item' : 'itens'}
                    </span>
                  )}
                </h2>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs text-danger-600 hover:text-danger-700 font-medium"
                  >
                    Limpar tudo
                  </button>
                )}
              </div>

              {/* Itens do carrinho */}
              {cart.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-4xl mb-3">🛒</div>
                  <p className="text-zinc-400 text-sm">Carrinho vazio</p>
                  <p className="text-zinc-300 text-xs mt-1">Busque um produto ou escaneie o código de barras</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4 max-h-[35vh] overflow-y-auto">
                    {cart.map(item => (
                      <div
                        key={item.produto.id}
                        className="flex items-center gap-3 bg-zinc-50 rounded-xl px-4 py-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-zinc-900 truncate">{item.produto.nome}</p>
                          <p className="text-xs text-zinc-500">{fmt(item.produto.preco_venda)} un.</p>
                        </div>

                        {/* Controle de quantidade */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => atualizarQuantidade(item.produto.id, item.quantidade - 1)}
                            className="w-7 h-7 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-50 text-sm font-bold"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm font-bold">{item.quantidade}</span>
                          <button
                            onClick={() => atualizarQuantidade(item.produto.id, item.quantidade + 1)}
                            className="w-7 h-7 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-50 text-sm font-bold"
                          >
                            +
                          </button>
                        </div>

                        {/* Subtotal */}
                        <p className="text-sm font-bold text-zinc-900 w-20 text-right">
                          {fmt(item.produto.preco_venda * item.quantidade)}
                        </p>

                        {/* Remover */}
                        <button
                          onClick={() => removerDoCart(item.produto.id)}
                          className="w-7 h-7 rounded-full bg-danger-50 flex items-center justify-center text-danger-600 hover:bg-danger-100 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Forma de pagamento */}
                  <div className="border-t border-zinc-100 pt-4 mb-4">
                    <label className="text-sm font-medium text-zinc-700 block mb-2">Forma de pagamento</label>
                    <div className="flex gap-2">
                      {[
                        { value: 'dinheiro', label: '💵 Dinheiro' },
                        { value: 'pix', label: '📱 PIX' },
                        { value: 'cartao', label: '💳 Cartão' },
                      ].map(fp => (
                        <button
                          key={fp.value}
                          onClick={() => setFormaPagamento(fp.value)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                            formaPagamento === fp.value
                              ? 'bg-primary-50 border-primary-200 text-primary-700'
                              : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                          }`}
                        >
                          {fp.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Total + Finalizar */}
                  <div className="border-t border-zinc-100 pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-bold text-zinc-900">Total</span>
                      <span className="text-2xl font-extrabold text-primary-600">{fmt(total)}</span>
                    </div>
                    <button
                      onClick={finalizarVenda}
                      className="btn-primary w-full py-3.5 rounded-xl text-base"
                    >
                      Finalizar Venda 🎉
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Últimas vendas */}
            {vendas.length > 0 && (
              <div className="card-estoque p-6 mt-6">
                <h3 className="font-bold text-sm text-zinc-900 mb-3">Últimas vendas</h3>
                <div className="space-y-2">
                  {vendas.slice(0, 5).map(v => (
                    <div key={v.id} className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500">
                        #{v.id} — {new Date(v.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                      <span className="font-medium text-zinc-900">{fmt(v.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmação de venda */}
      {confirmacao && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card-estoque p-8 max-w-sm w-full text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-zinc-900">Venda finalizada!</h2>
            <p className="text-3xl font-extrabold text-primary-600 mt-2">{fmt(confirmacao.total)}</p>
            <p className="text-sm text-zinc-500 mt-2">Venda registrada com sucesso.</p>
            <button
              onClick={() => setConfirmacao(null)}
              className="btn-primary w-full mt-6 py-3 rounded-xl"
            >
              Nova Venda
            </button>
          </div>
        </div>
      )}

      {/* Paywall modal */}
      {paywallAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="relative w-full max-w-lg">
            <button
              onClick={() => setPaywallAberto(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow text-zinc-500 z-10"
            >
              ✕
            </button>
            {paywallMotivo && (
              <p className="text-center text-white text-sm mb-3">{paywallMotivo}</p>
            )}
            <Paywall email={email} />
          </div>
        </div>
      )}

      {/* Scanner */}
      {scannerAberto && (
        <ScannerBarra onScan={handleScan} onClose={() => setScannerAberto(false)} />
      )}
    </div>
  );
}
