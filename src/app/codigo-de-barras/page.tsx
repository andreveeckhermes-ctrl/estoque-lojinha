import type { Metadata } from 'next';
import { LandingSeoPage } from '@/components/landing/LandingSeoPage';

export const metadata: Metadata = {
  title: 'Controle de Estoque com Código de Barras Grátis',
  description: 'Controle de estoque com código de barras grátis via câmera do celular. Sistema offline para lojinhas, sem planilha travada. 50 produtos grátis.',
};

export default function CodigoDeBarrasPage() {
  return (
    <LandingSeoPage
      badge="📷 Leitor de código de barras grátis"
      h1="Controle de Estoque com Código de Barras Grátis"
      description="Escaneie produtos com a câmera do celular e atualize seu estoque em segundos. Sem app para instalar, funciona direto no navegador e 100% offline."
      keywords={[
        'controle de estoque com código de barras grátis',
        'leitor de código de barras grátis',
        'sistema de vendas e estoque gratuito',
      ]}
    />
  );
}
