import type { Metadata } from 'next';
import { LandingSeoPage } from '@/components/landing/LandingSeoPage';

export const metadata: Metadata = {
  title: 'Controle de Estoque Offline Grátis',
  description: 'Controle de estoque offline grátis para lojinhas. Funciona sem internet, dados salvos no seu dispositivo com backup com 1 clique. Privacidade total.',
};

export default function OfflinePage() {
  return (
    <LandingSeoPage
      badge="📶 100% offline — sem internet"
      h1="Controle de Estoque Offline Grátis para Lojinha"
      description="Seu estoque funciona mesmo sem internet. Dados salvos localmente no navegador com SQLite, backup com 1 clique e total privacidade. Ninguém mais acessa suas informações."
      keywords={[
        'controle de estoque offline grátis',
        'aplicativo controle de estoque gratuito',
        'sistema de controle de vendas e estoque gratuito',
      ]}
    />
  );
}
