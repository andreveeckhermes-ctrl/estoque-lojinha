'use client';
import { DEVELOPER_CONTACT, APP_CONFIG } from '@/lib/constants';

export function Paywall({ email }: { email: string | null }) {
  const pagseguroLink = APP_CONFIG.pagseguroLink;
  const waLink = DEVELOPER_CONTACT.getPaymentLink(email || 'não informado');

  return (
    <div className="p-8 card-estoque text-center max-w-lg mx-auto">
      <h3 className="text-xl font-bold">Recurso exclusivo PRO</h3>
      <p className="text-zinc-500 mt-2 text-sm">Assine o PRO para liberar este recurso e todos os outros.</p>

      <div className="grid grid-cols-2 gap-3 mt-6 text-xs text-left">
        <div className="bg-zinc-50 rounded-xl p-3">
          <p className="font-bold mb-2">FREE</p>
          <ul className="space-y-1 text-zinc-600">
            <li>50 produtos</li>
            <li>10 vendas/mês</li>
            <li>Leitor de barras</li>
          </ul>
        </div>
        <div className="bg-primary-50 rounded-xl p-3 border border-primary-200">
          <p className="font-bold text-primary-700 mb-2">PRO — R$29/mês</p>
          <ul className="space-y-1 text-zinc-600">
            <li>Produtos ilimitados</li>
            <li>Vendas ilimitadas</li>
            <li>Relatórios completos</li>
          </ul>
        </div>
      </div>
      
      <div className="flex flex-col gap-3 mt-6">
        {pagseguroLink ? (
          <a 
            href={pagseguroLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center rounded-xl overflow-hidden border border-zinc-200 hover:border-primary-300 transition-colors"
            title="Pagar com PagBank"
          >
            <img 
              src="https://assets.pagseguro.com.br/ps-integration-assets/botoes/pagamentos/205x30-pagar.gif"
              alt="Assinar PRO — Pague com PagBank"
              className="h-[30px]"
            />
          </a>
        ) : (
          <div className="w-full py-3 bg-zinc-100 rounded-xl text-center text-sm text-zinc-500">
            Link de pagamento não configurado
          </div>
        )}
        
        <a 
          href={waLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full py-3 border border-zinc-300 rounded-xl font-medium block text-center hover:bg-zinc-50 transition-colors text-sm"
        >
          Já paguei, liberar via WhatsApp
        </a>
      </div>
      
      <div className="flex items-center justify-center gap-2 mt-4">
        <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-zinc-400">
          Pagamento seguro via PagBank • Após pagar, avise no WhatsApp
        </p>
      </div>
    </div>
  );
}
