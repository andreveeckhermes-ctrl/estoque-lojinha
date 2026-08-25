'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  resumoLucro,
  produtosMaisVendidos,
  curvaABC,
  produtosEstoqueBaixo,
  ResumoLucro,
  ProdutoMaisVendido,
  CurvaItem,
  Produto,
} from '@/lib/db/estoque';
import { usePlan } from '@/lib/auth/usePlan';
import { Paywall } from '@/components/paywall/Paywall';
import { exportCSV, exportPDF } from '@/lib/export/exportar';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const periodoLabel = (p: 'hoje' | 'mes' | 'ano') => (p === 'hoje' ? 'Hoje' : p === 'mes' ? 'Este mês' : 'Este ano');

export default function RelatoriosPage() {
  const { isPro, loading: planLoading, email } = usePlan();
  const [periodo, setPeriodo] = useState<'hoje' | 'mes' | 'ano'>('mes');
  const [resumo, setResumo] = useState<ResumoLucro>({ totalVendas: 0, receitaTotal: 0, custoTotal: 0, lucroBruto: 0, margemLucro: 0 });
  const [maisVendidos, setMaisVendidos] = useState<ProdutoMaisVendido[]>([]);
  const [curva, setCurva] = useState<CurvaItem[]>([]);
  const [estoqueBaixo, setEstoqueBaixo] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [paywallAberto, setPaywallAberto] = useState(false);
  const [paywallMotivo, setPaywallMotivo] = useState('');

  useEffect(() => {
    if (planLoading) return;
    carregar();
  }, [periodo, planLoading]);

  async function carregar() {
    try {
      setLoading(true);
      const estoque = await produtosEstoqueBaixo();
      setEstoqueBaixo(estoque);
      if (isPro) {
        const [res, vend, curv] = await Promise.all([
          resumoLucro(periodo),
          produtosMaisVendidos(10),
          curvaABC(),
        ]);
        setResumo(res);
        setMaisVendidos(vend);
        setCurva(curv);
      }
    } catch (e) {
      console.warn('Erro ao carregar relatórios:', e);
    } finally {
      setLoading(false);
    }
  }

  function abrirPaywall(motivo: string) {
    setPaywallMotivo(motivo);
    setPaywallAberto(true);
  }

  function exigirPro(motivo: string) {
    if (isPro) return true;
    abrirPaywall(motivo);
    return false;
  }

  function exportarEstoqueBaixoPDF() {
    exportPDF({
      titulo: 'Relatório de Estoque Baixo',
      secoes: [{
        cabecalho: ['Produto', 'Categoria', 'Estoque', 'Mínimo'],
        linhas: estoqueBaixo.map(p => [p.nome, p.categoria || '—', p.estoque, p.estoque_minimo]),
      }],
      isPro,
    });
  }

  function exportarEstoqueBaixoExcel() {
    if (!exigirPro('Exportar Excel é exclusivo do plano PRO.')) return;
    exportCSV(
      'estoque-baixo',
      ['Produto', 'Categoria', 'Estoque', 'Estoque mínimo'],
      estoqueBaixo.map(p => [p.nome, p.categoria || '', p.estoque, p.estoque_minimo])
    );
  }

  function exportarResumoPDF() {
    exportPDF({
      titulo: 'Resumo Financeiro',
      subtitulo: periodoLabel(periodo),
      secoes: [{
        cabecalho: ['Métrica', 'Valor'],
        linhas: [
          ['Vendas no período', resumo.totalVendas],
          ['Receita', fmt(resumo.receitaTotal)],
          ['Custo', fmt(resumo.custoTotal)],
          ['Lucro bruto', fmt(resumo.lucroBruto)],
          ['Margem de lucro', `${resumo.margemLucro.toFixed(1)}%`],
        ],
      }],
      isPro,
    });
  }

  function exportarMaisVendidosExcel() {
    if (!exigirPro('Exportar Excel é exclusivo do plano PRO.')) return;
    exportCSV(
      'produtos-mais-vendidos',
      ['#', 'Produto', 'Categoria', 'Qtd vendida', 'Receita'],
      maisVendidos.map((p, i) => [i + 1, p.nome, p.categoria || '', p.total_vendido, p.receita.toFixed(2).replace('.', ',')])
    );
  }

  function exportarCurvaABCExcel() {
    if (!exigirPro('Exportar Excel é exclusivo do plano PRO.')) return;
    exportCSV(
      'curva-abc',
      ['Produto', 'Receita', '% Individual', '% Acumulado', 'Classe'],
      curva.map(c => [c.nome, c.receita.toFixed(2).replace('.', ','), `${c.percentual.toFixed(1)}%`, `${c.acumulado.toFixed(1)}%`, c.classificacao])
    );
  }

  function handleProClick(motivo: string) {
    if (!isPro) {
      abrirPaywall(motivo);
      return;
    }
  }

  if (planLoading || loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-zinc-500">Carregando relatórios...</div>;
  }

  const colorClass = (c: string) => {
    if (c === 'A') return 'bg-green-50 text-green-700';
    if (c === 'B') return 'bg-yellow-50 text-yellow-700';
    return 'bg-zinc-100 text-zinc-600';
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
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
              Relatórios
            </span>
          </nav>

          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${isPro ? 'bg-primary-50 text-primary-700' : 'bg-zinc-100 text-zinc-500'}`}>
              {isPro ? 'PRO' : 'FREE'}
            </span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Relatórios</h1>
            <p className="text-sm text-zinc-500 mt-1">Análise de vendas e estoque</p>
          </div>
          <div className="flex gap-2">
            {(['hoje', 'mes', 'ano'] as const).map(p => (
              <button
                key={p}
                onClick={() => isPro ? setPeriodo(p) : handleProClick('Selecione um período para ver os relatórios completos.')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  periodo === p && isPro
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {p === 'hoje' ? 'Hoje' : p === 'mes' ? 'Este mês' : 'Este ano'}
              </button>
            ))}
          </div>
        </div>

        {/* === ESTOQUE BAIXO (FREE + PRO) === */}
        <section className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              ⚠️ Estoque Baixo
              {estoqueBaixo.length > 0 && (
                <span className="bg-danger-100 text-danger-600 rounded-full px-2.5 py-0.5 text-xs font-bold">
                  {estoqueBaixo.length}
                </span>
              )}
            </h2>
            {estoqueBaixo.length > 0 && (
              <div className="flex gap-2">
                <button onClick={exportarEstoqueBaixoPDF} className="btn-outline text-xs px-3 py-1.5">
                  📄 Exportar PDF {isPro ? '' : '(com marca)' }
                </button>
                <button
                  onClick={() => isPro ? exportarEstoqueBaixoExcel() : abrirPaywall('Exportar Excel é exclusivo do plano PRO.')}
                  className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1"
                >
                  📊 Exportar Excel {!isPro && <span className="bg-primary-50 text-primary-700 rounded-full px-1.5 text-[10px] font-bold">PRO</span>}
                </button>
              </div>
            )}
          </div>
          {estoqueBaixo.length === 0 ? (
            <div className="card-estoque p-6 text-center text-zinc-400">
              ✅ Todos os produtos estão com estoque adequado.
            </div>
          ) : (
            <div className="card-estoque overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="py-2.5 px-4 text-left font-semibold text-zinc-600">Produto</th>
                    <th className="py-2.5 px-4 text-left font-semibold text-zinc-600">Categoria</th>
                    <th className="py-2.5 px-4 text-center font-semibold text-zinc-600">Estoque</th>
                    <th className="py-2.5 px-4 text-center font-semibold text-zinc-600">Mínimo</th>
                    <th className="py-2.5 px-4 text-center font-semibold text-zinc-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {estoqueBaixo.map(p => (
                    <tr key={p.id} className="border-t border-zinc-50">
                      <td className="py-3 px-4 font-medium">{p.nome}</td>
                      <td className="py-3 px-4 text-zinc-500">{p.categoria || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-danger-600 font-bold">{p.estoque}</span>
                      </td>
                      <td className="py-3 px-4 text-center text-zinc-500">{p.estoque_minimo}</td>
                      <td className="py-3 px-4 text-center">
                        {p.estoque === 0 ? (
                          <span className="status-pill-red"><span>●</span> Sem estoque</span>
                        ) : (
                          <span className="status-pill-red"><span>●</span> Estoque baixo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* === LUCRO E VENDAS (PRO) === */}
        <section className="mb-8">          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900">💰 Resumo Financeiro</h2>
              {!isPro && (
                <span className="bg-primary-50 text-primary-700 rounded-full px-3 py-0.5 text-xs font-medium cursor-pointer" onClick={() => abrirPaywall('Relatórios financeiros completos são exclusivos do plano PRO.')}
                >
                  PRO
                </span>
              )}
            </div>
            {isPro && (
              <button onClick={exportarResumoPDF} className="btn-outline text-xs px-3 py-1.5">
                📄 Exportar PDF
              </button>
            )}
          </div>

          {!isPro ? (
            <div className="card-estoque p-8 text-center">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="font-bold text-zinc-900 mb-2">Relatórios completos no PRO</h3>
              <p className="text-sm text-zinc-500 mb-4">
                Veja lucro, margem, produtos mais vendidos e curva ABC com o plano PRO.
              </p>
              <button
                onClick={() => abrirPaywall('Desbloqueie relatórios completos com o plano PRO.')}
                className="btn-primary"
              >
                Desbloquear Relatórios PRO
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Vendas no período', value: String(resumo.totalVendas), icon: '🛒', cor: 'bg-primary-50' },
                  { label: 'Receita', value: fmt(resumo.receitaTotal), icon: '💰', cor: 'bg-primary-50' },
                  { label: 'Custo', value: fmt(resumo.custoTotal), icon: '📉', cor: 'bg-zinc-100' },
                  { label: 'Lucro Bruto', value: fmt(resumo.lucroBruto), icon: '📈', cor: resumo.lucroBruto >= 0 ? 'bg-primary-50' : 'bg-danger-100', alerta: resumo.lucroBruto < 0 },
                  { label: 'Margem', value: `${resumo.margemLucro.toFixed(1)}%`, icon: '🎯', cor: 'bg-primary-50' },
                ].map((card, i) => (
                  <div key={i} className="card-estoque p-5 text-center">
                    <div className={`w-12 h-12 rounded-full ${card.cor} flex items-center justify-center mx-auto text-xl`}>
                      {card.icon}
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">{card.label}</p>
                    <p className={`text-2xl font-extrabold mt-1 ${card.alerta ? 'text-danger-600' : 'text-zinc-900'}`}>
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* === PRODUTOS MAIS VENDIDOS (PRO) === */}
        {isPro && (
          <section className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-bold text-zinc-900">🏆 Produtos Mais Vendidos</h2>
              {maisVendidos.length > 0 && (
                <button onClick={exportarMaisVendidosExcel} className="btn-outline text-xs px-3 py-1.5">
                  📊 Exportar Excel
                </button>
              )}
            </div>
            {maisVendidos.length === 0 ? (
              <div className="card-estoque p-6 text-center text-zinc-400">
                Nenhuma venda registrada ainda.
              </div>
            ) : (
              <div className="card-estoque overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="py-2.5 px-4 text-left font-semibold text-zinc-600">#</th>
                      <th className="py-2.5 px-4 text-left font-semibold text-zinc-600">Produto</th>
                      <th className="py-2.5 px-4 text-left font-semibold text-zinc-600">Categoria</th>
                      <th className="py-2.5 px-4 text-center font-semibold text-zinc-600">Qtd Vendida</th>
                      <th className="py-2.5 px-4 text-right font-semibold text-zinc-600">Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maisVendidos.map((p, i) => (
                      <tr key={p.produto_id} className="border-t border-zinc-50">
                        <td className="py-3 px-4 font-bold text-zinc-400">{i + 1}</td>
                        <td className="py-3 px-4 font-medium">{p.nome}</td>
                        <td className="py-3 px-4 text-zinc-500">{p.categoria || '—'}</td>
                        <td className="py-3 px-4 text-center">{p.total_vendido}</td>
                        <td className="py-3 px-4 text-right font-medium">{fmt(p.receita)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* === CURVA ABC (PRO) === */}
        {isPro && (
          <section className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-bold text-zinc-900">📊 Curva ABC</h2>
              {curva.length > 0 && (
                <button onClick={exportarCurvaABCExcel} className="btn-outline text-xs px-3 py-1.5">
                  📊 Exportar Excel
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="card-estoque p-4 text-center">
                <span className="inline-block bg-green-50 text-green-700 rounded-full px-3 py-1 text-xs font-bold mb-1">A</span>
                <p className="text-xs text-zinc-500">Top 80% da receita</p>
                <p className="font-bold text-zinc-900">{curva.filter(c => c.classificacao === 'A').length} produtos</p>
              </div>
              <div className="card-estoque p-4 text-center">
                <span className="inline-block bg-yellow-50 text-yellow-700 rounded-full px-3 py-1 text-xs font-bold mb-1">B</span>
                <p className="text-xs text-zinc-500">80%–95% da receita</p>
                <p className="font-bold text-zinc-900">{curva.filter(c => c.classificacao === 'B').length} produtos</p>
              </div>
              <div className="card-estoque p-4 text-center">
                <span className="inline-block bg-zinc-100 text-zinc-600 rounded-full px-3 py-1 text-xs font-bold mb-1">C</span>
                <p className="text-xs text-zinc-500">Últimos 5% da receita</p>
                <p className="font-bold text-zinc-900">{curva.filter(c => c.classificacao === 'C').length} produtos</p>
              </div>
            </div>

            {curva.length === 0 ? (
              <div className="card-estoque p-6 text-center text-zinc-400">
                Registre vendas para gerar a curva ABC.
              </div>
            ) : (
              <div className="card-estoque overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="py-2.5 px-4 text-left font-semibold text-zinc-600">Produto</th>
                      <th className="py-2.5 px-4 text-right font-semibold text-zinc-600">Receita</th>
                      <th className="py-2.5 px-4 text-right font-semibold text-zinc-600">% Individual</th>
                      <th className="py-2.5 px-4 text-right font-semibold text-zinc-600">% Acumulado</th>
                      <th className="py-2.5 px-4 text-center font-semibold text-zinc-600">Classe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {curva.map(c => (
                      <tr key={c.produto_id} className="border-t border-zinc-50">
                        <td className="py-3 px-4 font-medium">{c.nome}</td>
                        <td className="py-3 px-4 text-right">{fmt(c.receita)}</td>
                        <td className="py-3 px-4 text-right text-zinc-500">{c.percentual.toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right text-zinc-500">{c.acumulado.toFixed(1)}%</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${colorClass(c.classificacao)}`}>
                            {c.classificacao}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Voltar */}
        <div className="text-center mt-8">
          <Link href="/app" className="btn-outline">
            ← Voltar ao Dashboard
          </Link>
        </div>
      </div>

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
    </div>
  );
}
