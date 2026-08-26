import type { Metadata } from 'next';
import { LandingSeoPage } from '@/components/landing/LandingSeoPage';

export const metadata: Metadata = {
  title: 'Controle de Estoque com Scanner QR Code Grátis',
  description: 'Controle de estoque com scanner QR code e código de barras grátis via câmera do celular. Sistema offline para lojinhas, sem planilha travada. 50 produtos grátis.',
};

export default function CodigoDeBarrasPage() {
  return (
    <LandingSeoPage
      badge="📷 Scanner QR Code grátis"
      h1="Controle de Estoque com Scanner QR Code Grátis"
      description="Escaneie QR codes e códigos de barras com a câmera do celular e atualize seu estoque em segundos. Sem app para instalar, funciona direto no navegador e 100% offline."
      keywords={[
        'controle de estoque com qr code grátis',
        'scanner qr code grátis',
        'leitor de código de barras grátis',
        'sistema de vendas e estoque gratuito',
      ]}
    />
  );
}
