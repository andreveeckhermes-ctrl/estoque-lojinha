import Link from 'next/link';
import { BackupControls } from '@/components/backup/BackupControls';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            🚀 50 produtos grátis • 100% offline
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 leading-tight">
            Sistema de Vendas e Estoque Gratuito e Offline para Lojinha
          </h1>
          <p className="text-lg md:text-xl text-zinc-600 mt-6 max-w-2xl mx-auto leading-relaxed">
            O sistema de controle de vendas e estoque gratuito que funciona sem internet. 
            Scanner QR code via câmera do celular, backup com 1 clique. 
            Adeus planilha travada!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link href="/login" className="btn-primary text-center px-8 py-3.5 text-base">
              Começar Grátis Agora
            </Link>
            <Link href="/login" className="btn-outline text-center px-8 py-3.5 text-base">
              Fazer Login
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-16 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-zinc-900 mb-12">
            Tudo que sua lojinha precisa
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '📦', title: 'Controle de Estoque', desc: 'Cadastre até 50 produtos grátis. Controle entrada e saída com alertas de estoque baixo.' },
              { icon: '📷', title: 'Scanner QR Code', desc: 'Escaneie QR codes e códigos de barras pela câmera. Entrada rápida de produtos.' },
              { icon: '📶', title: '100% Offline', desc: 'Funciona sem internet. Seus dados ficam salvos no seu dispositivo, com total privacidade.' },
              { icon: '💾', title: 'Backup com 1 Clique', desc: 'Exporte e importe seu banco de dados. Nunca perca suas informações.' },
            ].map((f, i) => (
              <div key={i} className="card-estoque p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center mx-auto text-2xl">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-zinc-900 mt-4">{f.title}</h3>
                <p className="text-sm text-zinc-500 mt-2">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FREE vs PRO Section */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-zinc-900 mb-4">Planos</h2>
          <p className="text-zinc-500 text-center mb-12">Comece grátis, evolua quando precisar</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* FREE */}
            <div className="card-estoque p-8">
              <h3 className="text-xl font-bold text-zinc-900">FREE</h3>
              <p className="text-4xl font-extrabold text-zinc-900 mt-2">R$ 0</p>
              <p className="text-sm text-zinc-500 mt-1">para sempre</p>
              <ul className="mt-6 space-y-3 text-sm text-zinc-600">
                <li>✅ Até 50 produtos</li>
                <li>✅ Scanner QR Code</li>
                <li>✅ Controle de entrada/saída</li>
                <li>✅ Alerta de estoque baixo</li>
                <li>✅ Backup e restauração</li>
                <li>✅ 10 vendas/mês</li>
              </ul>
            </div>
            {/* PRO */}
            <div className="card-estoque p-8 border-primary-500 border-2 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white rounded-full px-4 py-1 text-xs font-medium">
                Recomendado
              </span>
              <h3 className="text-xl font-bold text-zinc-900">PRO</h3>
              <p className="text-4xl font-extrabold text-primary-600 mt-2">R$ 29</p>
              <p className="text-sm text-zinc-500 mt-1">por mês</p>
              <ul className="mt-6 space-y-3 text-sm text-zinc-600">
                <li>✅ Tudo do FREE +</li>
                <li>✅ Produtos ilimitados</li>
                <li>✅ Vendas ilimitadas</li>
                <li>✅ Relatórios completos</li>
                <li>✅ Export Excel</li>
                <li>✅ Suporte prioritário WhatsApp</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-600 py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto para organizar seu estoque?
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-xl mx-auto">
            Comece agora mesmo, sem cadastro de cartão de crédito. 
            Aplicativo para controle de estoque grátis, direto no seu navegador.
          </p>
          <Link href="/app" className="inline-flex items-center gap-2 bg-white text-primary-700 rounded-full px-8 py-3.5 font-bold hover:bg-primary-50 transition-colors">
            Começar Grátis 🚀
          </Link>
        </div>
      </section>

      {/* Backup Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="card-estoque p-8 max-w-xl mx-auto text-center">
          <h2 className="text-xl font-bold text-zinc-900 mb-4">Backup e Restauração</h2>
          <BackupControls />
        </div>
      </section>
    </div>
  );
}
