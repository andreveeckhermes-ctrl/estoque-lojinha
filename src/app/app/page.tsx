'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Produto,
  listarProdutos,
  contarProdutos,
  criarProduto,
  atualizarProduto,
  excluirProduto,
  buscarProdutoPorCodigo,
  buscarProdutoPorId,
  incrementarEstoque,
  contarVendasHoje,
  totalVendasHoje,
  extrairProdutoIdDaUrl,
  gerarUrlProduto,
} from '@/lib/db/estoque';
import { usePlan } from '@/lib/auth/usePlan';
import { Paywall } from '@/components/paywall/Paywall';
import { BackupControls } from '@/components/backup/BackupControls';
import dynamic from 'next/dynamic';
const ScannerBarra = dynamic(() => import('@/components/estoque/ScannerBarra').then(m => m.ScannerBarra), { ssr: false });
import { supabase } from '@/lib/supabase/client';

const LIMITE_FREE_PRODUTOS = 50;
const LIMITE_FREE_VENDAS_MES = 10;

const produtoVazio = {
  nome: '',
  codigo_barras: '',
  categoria: '',
  preco_custo: 0,
  preco_venda: 0,
  estoque: 0,
  estoque_minimo: 5,
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AppPage() {
  const { isPro, isFree, loading, email } = usePlan();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [totalProdutos, setTotalProdutos] = useState(0);
  const [vendasHoje, setVendasHoje] = useState(0);
  const [faturamentoHoje, setFaturamentoHoje] = useState(0);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState<'estoque' | 'vendas'>('estoque');

  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [form, setForm] = useState(produtoVazio);



  const [scannerAberto, setScannerAberto] = useState(false);
  const [paywallAberto, setPaywallAberto] = useState(false);
  const [paywallMotivo, setPaywallMotivo] = useState('');
  const [onboarding, setOnboarding] = useState(false);
  const [produtoSalvo, setProdutoSalvo] = useState<Produto | null>(null); // produto recém-salvo para mostrar QR

  const recarregar = useCallback(async (termo?: string) => {
    const lista = await listarProdutos(termo);
    setProdutos(lista);
    setTotalProdutos(await contarProdutos());
    setVendasHoje(await contarVendasHoje());
    setFaturamentoHoje(await totalVendasHoje());
    if (!termo && lista.length === 0) setOnboarding(true);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  useEffect(() => {
    const t = setTimeout(() => recarregar(busca || undefined), 300);
    return () => clearTimeout(t);
  }, [busca, recarregar]);

  function abrirPaywall(motivo: string) {
    setPaywallMotivo(motivo);
    setPaywallAberto(true);
  }

  function abrirNovo(codigoBarras?: string) {
    if (isFree && totalProdutos >= LIMITE_FREE_PRODUTOS) {
      abrirPaywall(`Limite do plano FREE: ${LIMITE_FREE_PRODUTOS} produtos. Assine o PRO para cadastrar ilimitado.`);
      return;
    }
    setEditando(null);
    setForm({ ...produtoVazio, codigo_barras: codigoBarras || '' });
    setFormAberto(true);
    setOnboarding(false);
  }

  function abrirEdicao(p: Produto) {
    setEditando(p);
    setForm({
      nome: p.nome,
      codigo_barras: p.codigo_barras || '',
      categoria: p.categoria || '',
      preco_custo: p.preco_custo,
      preco_venda: p.preco_venda,
      estoque: p.estoque,
      estoque_minimo: p.estoque_minimo,
    });
    setFormAberto(true);
  }

  async function salvarProduto(e: React.FormEvent) {
    e.preventDefault();
    const dados = {
      ...form,
      codigo_barras: form.codigo_barras || null,
      categoria: form.categoria || null,
    };
    try {
      if (editando) {
        await atualizarProduto({ ...editando, ...dados } as Produto);
        setFormAberto(false);
        await recarregar(busca || undefined);
      } else {
        await criarProduto(dados as Omit<Produto, 'id' | 'created_at'>);
        // Após salvar, recarrega para pegar o ID e mostrar QR code
        await recarregar(busca || undefined);
        const lista = await listarProdutos();
        const novo = lista.find(p => p.nome === form.nome);
        if (novo) setProdutoSalvo(novo);
        setFormAberto(false);
      }
    } catch (err: any) {
      alert('Erro ao salvar produto: ' + (err?.message || 'Erro desconhecido'));
      console.error('[salvarProduto]', err);
    }
  }

  async function removerProduto(p: Produto) {
    if (!confirm(`Excluir "${p.nome}"? Esta ação não pode ser desfeita.`)) return;
    await excluirProduto(p.id);
    await recarregar(busca || undefined);
  }



  // Detector de URL: extrai ID do produto de links do app
  function handleScan(codigo: string) {
    setScannerAberto(false);

    // 1. Tenta extrair ID de uma URL do app
    const produtoId = extrairProdutoIdDaUrl(codigo);
    if (produtoId) {
      handleScanPorId(produtoId);
      return;
    }

    // 2. Busca por código de barras / hash normal
    handleScanPorCodigo(codigo);
  }

  async function handleScanPorId(id: number) {
    const produto = await buscarProdutoPorId(id);
    if (produto) {
      await incrementarEstoque(produto.id, 1);
      await recarregar(busca || undefined);
      alert(`✅ "+1 unidade" adicionada em "${produto.nome}" (estoque: ${produto.estoque + 1})`);
      return;
    }
    // Produto não encontrado localmente
    alert(`Produto com ID ${id} não encontrado no banco local.\nSe você escaneou um QR code de outro dispositivo, cadastre este produto manualmente.`);
  }

  async function handleScanPorCodigo(codigo: string) {
    const existente = await buscarProdutoPorCodigo(codigo);
    if (existente) {
      await incrementarEstoque(existente.id, 1);
      await recarregar(busca || undefined);
      alert(`+1 unidade adicionada em "${existente.nome}"`);
      return;
    }
    abrirNovo(codigo);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-zinc-500">Carregando...</div>;
  }

  const estoqueBaixo = produtos.filter(p => p.estoque <= p.estoque_minimo);
  const valorEstoque = produtos.reduce((acc, p) => acc + p.estoque * p.preco_custo, 0);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Navbar */}
      <header className="h-16 bg-white border-b border-zinc-100 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center text-lg">📦</div>
            <div>
              <p className="font-bold text-sm leading-tight">Estoque</p>
              <p className="font-bold text-sm leading-tight text-primary-600">Lojinha</p>
            </div>
          </div>

          <nav className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => setAba('estoque')}
              className={aba === 'estoque' ? 'bg-primary-600 text-white px-4 py-1.5 rounded-full text-sm font-medium' : 'text-zinc-500 px-4 py-1.5 text-sm'}
            >
              Dashboard
            </button>
            <Link
              href="/app/vendas"
              className="text-zinc-500 px-4 py-1.5 rounded-full text-sm font-medium hover:text-zinc-900 transition-colors"
            >
              PDV
            </Link>
            <Link
              href="/app/relatorios"
              className="text-zinc-500 px-4 py-1.5 rounded-full text-sm font-medium hover:text-zinc-900 transition-colors"
            >
              Relatórios
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-xs text-zinc-500">
              {isPro ? 'PRO' : `FREE ${totalProdutos}/${LIMITE_FREE_PRODUTOS}`}
            </span>
            <button onClick={handleLogout} className="text-xs text-zinc-400 hover:text-zinc-600">Sair</button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
            <p className="text-sm text-zinc-500 mt-1">{email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <BackupControls />
            <button onClick={() => abrirNovo()} className="btn-primary">+ Novo Produto</button>
          </div>
        </div>

        {/* Cards métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total produtos', value: String(totalProdutos), icon: '📦', cor: 'bg-primary-50' },
            { label: 'Valor em estoque', value: fmt(valorEstoque), icon: '💰', cor: 'bg-primary-50' },
            { label: 'Estoque baixo', value: String(estoqueBaixo.length), icon: '⚠️', cor: estoqueBaixo.length ? 'bg-danger-100' : 'bg-primary-50', alerta: estoqueBaixo.length > 0 },
            { label: 'Vendas hoje', value: String(vendasHoje), sub: fmt(faturamentoHoje), icon: '🛒', cor: 'bg-primary-50' },
          ].map((card, i) => (
            <div key={i} className="card-estoque p-6 text-center">
              <div className={`w-14 h-14 rounded-full ${card.cor} flex items-center justify-center mx-auto text-2xl`}>
                {card.icon}
              </div>
              <p className="text-sm text-zinc-500 mt-3">{card.label}</p>
              <p className={`text-3xl font-extrabold mt-1 ${card.alerta ? 'text-danger-600' : 'text-zinc-900'}`}>
                {card.value}
              </p>
              {card.sub && <p className="text-xs text-primary-600 mt-1">{card.sub}</p>}
            </div>
          ))}
        </div>

        {/* Abas mobile */}
        <div className="flex sm:hidden gap-2 mb-4">
          <button onClick={() => setAba('estoque')} className={`flex-1 py-2 rounded-xl text-sm font-medium ${aba === 'estoque' ? 'bg-primary-600 text-white' : 'bg-white border'}`}>Estoque</button>
          <Link href="/app/vendas" className="flex-1 py-2 rounded-xl text-sm font-medium bg-white border text-center text-zinc-600">PDV</Link>
          <Link href="/app/relatorios" className="flex-1 py-2 rounded-xl text-sm font-medium bg-white border text-center text-zinc-600">Relatórios</Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tabela principal */}
          <div className="lg:col-span-8">
            {aba === 'estoque' && (
              <div className="card-estoque p-6">
                <div className="flex flex-wrap gap-3 mb-4">
                  <input
                    type="text"
                    placeholder="Buscar produto, código ou QR code..."
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    className="input-search flex-1 min-w-[200px]"
                  />
                  <Link href="/app/vendas" className="btn-outline">Ir para PDV</Link>
                </div>

                <div className="overflow-x-auto">
                  <div className="overflow-x-auto -mx-6 px-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-zinc-100 rounded-lg">
                        <th className="py-2.5 px-3 text-left font-semibold text-zinc-600 rounded-l-lg">Produto</th>
                        <th className="hidden md:table-cell py-2.5 px-3 text-left font-semibold text-zinc-600">Código</th>
                        <th className="py-2.5 px-3 text-left font-semibold text-zinc-600">Preço</th>
                        <th className="py-2.5 px-3 text-left font-semibold text-zinc-600">Estoque</th>
                        <th className="py-2.5 px-3 text-center font-semibold text-zinc-600">Link</th>
                        <th className="py-2.5 px-3 rounded-r-lg"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {produtos.map(p => (
                        <tr key={p.id} className="border-b border-zinc-50">
                          <td className="py-3 px-3">
                            <div className="font-medium">{p.nome}</div>
                            {p.categoria && <div className="text-xs text-zinc-400">{p.categoria}</div>}
                          </td>
                          <td className="hidden md:table-cell py-3 px-3">
                            {p.codigo_barras ? (
                              <span className="bg-zinc-100 rounded-full px-3 py-1 text-xs font-mono">{p.codigo_barras}</span>
                            ) : '—'}
                          </td>
                          <td className="py-3 px-3">{fmt(p.preco_venda)}</td>
                          <td className="py-3 px-3">
                            {p.estoque <= p.estoque_minimo ? (
                              <span className="status-pill-red"><span>●</span> <span className="hidden sm:inline">Estoque baixo</span> ({p.estoque})</span>
                            ) : (
                              <span className="status-pill-green"><span>●</span> <span className="hidden sm:inline">Em estoque</span> ({p.estoque})</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(gerarUrlProduto(p.id));
                                alert('Link copiado! Cole no gerador de QR Code.');
                              }}
                              className="inline-flex items-center gap-1 bg-zinc-100 hover:bg-zinc-200 rounded-lg px-2 py-1 text-[11px] text-zinc-600 font-medium transition-colors"
                              title="Copiar link do produto"
                            >
                              📋 <span className="hidden sm:inline">Link</span>
                            </button>
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <button onClick={() => abrirEdicao(p)} className="text-primary-600 text-xs font-medium mr-2">Editar</button>
                            <button onClick={() => removerProduto(p)} className="text-danger-600 text-xs font-medium">Excluir</button>
                          </td>
                        </tr>
                      ))}
                      {!produtos.length && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-zinc-400">
                            Nenhum produto ainda. Escaneie o primeiro QR code ou clique em + Novo Produto.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>
            )}


          </div>

          {/* Scanner lateral */}
          <div className="lg:col-span-4">
            <div className="card-estoque p-6 sticky top-24">
              <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                <span className="text-primary-600">📷</span> Scanner QR Code
              </h3>
              <div className="mt-4 bg-zinc-900 rounded-2xl h-40 flex items-center justify-center text-5xl">
                📱
              </div>
              <p className="text-xs text-zinc-500 text-center mt-3">
                Leitura em tempo real para entrada rápida de estoque
              </p>
              <button
                onClick={() => setScannerAberto(true)}
                className="btn-primary w-full mt-4 py-3 rounded-xl"
              >
                Iniciar Escaneamento
              </button>
              <button onClick={() => abrirNovo()} className="btn-outline w-full mt-2 py-2.5 rounded-xl">
                Cadastrar Manualmente
              </button>
              <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 mt-4 text-xs text-primary-700 space-y-1">
                <p>💡 <strong>QR Code:</strong> escaneie o QR do produto para +1 unidade automaticamente.</p>
                <p>📏 <strong>Código de barras:</strong> escaneie ou digite o código para cadastrar.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding */}
      {onboarding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card-estoque p-8 max-w-md w-full text-center">
            <div className="text-4xl mb-4">👋</div>
            <h2 className="text-xl font-bold">Bem-vindo ao Estoque Lojinha!</h2>
            <p className="text-sm text-zinc-500 mt-2">
              Escaneie seu primeiro produto com a câmera ou cadastre manualmente. Seus dados ficam salvos no seu dispositivo.
            </p>
            <div className="flex flex-col gap-2 mt-6">
              <button onClick={() => { setOnboarding(false); setScannerAberto(true); }} className="btn-primary py-3 rounded-xl">
                Escanear Primeiro QR Code
              </button>
              <button onClick={() => { setOnboarding(false); abrirNovo(); }} className="btn-outline py-3 rounded-xl">
                Cadastrar Manualmente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal produto */}
      {formAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={salvarProduto} className="card-estoque p-6 w-full max-w-md space-y-3">
            <h2 className="text-xl font-bold">{editando ? 'Editar Produto' : 'Novo Produto'}</h2>
            <input required placeholder="Nome *" value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-200 rounded-xl" />
            <input placeholder="Código de barras" value={form.codigo_barras}
              onChange={e => setForm({ ...form, codigo_barras: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-200 rounded-xl font-mono" />
            <input placeholder="Categoria" value={form.categoria}
              onChange={e => setForm({ ...form, categoria: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-200 rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Preço custo', key: 'preco_custo' as const },
                { label: 'Preço venda *', key: 'preco_venda' as const, required: true },
                { label: 'Estoque', key: 'estoque' as const },
                { label: 'Estoque mínimo', key: 'estoque_minimo' as const },
              ].map(f => (
                <label key={f.key} className="text-sm">
                  {f.label}
                  <input
                    required={f.required}
                    type="number"
                    step="0.01"
                    min="0"
                    value={form[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl mt-1"
                  />
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="btn-primary flex-1 py-2.5 rounded-xl">Salvar</button>
              <button type="button" onClick={() => setFormAberto(false)} className="btn-outline px-5 py-2.5 rounded-xl">Cancelar</button>
            </div>
          </form>
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

      {scannerAberto && (
        <ScannerBarra onScan={handleScan} onClose={() => setScannerAberto(false)} />
      )}

      {/* Modal QR Code do produto salvo */}
      {produtoSalvo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card-estoque p-6 max-w-sm w-full text-center">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-lg font-bold text-zinc-900">Produto cadastrado!</h2>
            <p className="text-sm text-zinc-500 mt-1">{produtoSalvo.nome}</p>

            {/* QR Code */}
            <div className="mt-4 bg-white border-2 border-zinc-100 rounded-xl p-4 inline-block">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(gerarUrlProduto(produtoSalvo.id))}`}
                alt="QR Code do produto"
                width={200}
                height={200}
                className="rounded-lg"
              />
            </div>

            {/* Link */}
            <div className="mt-3 bg-zinc-50 rounded-xl p-3">
              <p className="text-[10px] text-zinc-400 mb-1">Link para QR Code:</p>
              <p className="text-xs font-mono text-zinc-700 break-all">
                {gerarUrlProduto(produtoSalvo.id)}
              </p>
            </div>

            <p className="text-xs text-zinc-500 mt-3">
              🖨️ Copie o link e cole no gerador de QR Code para imprimir a etiqueta.
            </p>

            {/* Link para ferramenta QR */}
            <a
              href="https://www.qr-code-generator.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              🔗 Gerar QR Code online (grátis)
            </a>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(gerarUrlProduto(produtoSalvo.id));
                  alert('Link copiado! Cole no gerador de QR Code.');
                }}
                className="btn-primary flex-1 py-2.5 rounded-xl text-sm"
              >
                📋 Copiar Link
              </button>
              <button
                onClick={() => setProdutoSalvo(null)}
                className="btn-outline px-5 py-2.5 rounded-xl text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
