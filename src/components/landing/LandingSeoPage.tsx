import Link from 'next/link';
import { DEVELOPER_CONTACT, APP_CONFIG } from '@/lib/constants';

interface LandingSeoProps {
  badge: string;
  h1: string;
  description: string;
  keywords: string[];
  ctaText?: string;
}

export function LandingSeoPage({ badge, h1, description, keywords, ctaText = 'Começar Grátis Agora' }: LandingSeoProps) {
  return (
    <div className="min-h-screen">
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            {badge}
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 leading-tight">
            {h1}
          </h1>
          <p className="text-lg text-zinc-600 mt-6 leading-relaxed">{description}</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link href="/login" className="btn-primary text-center px-8 py-3.5">{ctaText}</Link>
            <Link href="/" className="btn-outline text-center px-8 py-3.5">Ver página principal</Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl font-bold text-center mb-8">Por que escolher o {APP_CONFIG.name}?</h2>
          <div className="grid gap-4">
            {[
              '100% offline — seus dados ficam no seu dispositivo',
              'Scanner QR code grátis via câmera do celular',
              'Backup com 1 clique — exporte e importe seu banco .db',
              '50 produtos grátis para começar sem pagar nada',
            ].map((item, i) => (
              <div key={i} className="card-estoque p-4 flex items-center gap-3">
                <span className="text-primary-600 font-bold">✓</span>
                <span className="text-zinc-700">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-400 text-center mt-8">
            Palavras-chave: {keywords.join(' • ')}
          </p>
          <p className="text-center mt-4">
            <a href={DEVELOPER_CONTACT.getLink()} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-sm hover:underline">
              Fale com o desenvolvedor no WhatsApp
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
