import type { Metadata } from 'next';
import { LandingSeoPage } from '@/components/landing/LandingSeoPage';

export const metadata: Metadata = {
  title: 'Controle de Estoque para Loja de Roupas Grátis',
  description: 'Controle de estoque loja de roupas grátis. Gerencie tamanhos, cores e variações com leitor de código de barras e alertas de estoque baixo. 50 produtos grátis.',
};

export default function LojaDeRoupasPage() {
  return (
    <LandingSeoPage
      badge="👗 Feito para lojas de moda"
      h1="Controle de Estoque para Loja de Roupas Grátis"
      description="Organize seu estoque de roupas, acessórios e brechó com categorias, alertas de estoque baixo e leitor de código de barras. Perfeito para lojistas de Instagram e lojas físicas pequenas."
      keywords={[
        'controle de estoque loja de roupas gratis',
        'controle de estoque gratuito',
        'estoque para loja virtual',
      ]}
    />
  );
}
