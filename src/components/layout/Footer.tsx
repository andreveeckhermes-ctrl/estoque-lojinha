import { DEVELOPER_CONTACT, APP_CONFIG } from '@/lib/constants';

export function Footer() {
  return (
    <footer className="w-full border-t bg-white py-6 md:py-8 mt-12">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
        <p>© {new Date().getFullYear()} {APP_CONFIG.name}. Dados salvos localmente no seu dispositivo.</p>
        <div className="flex gap-4">
          <a 
            href={DEVELOPER_CONTACT.getLink()}
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-medium text-black hover:underline"
          >
            💬 Fale com o desenvolvedor para sugestões e negócios
          </a>
        </div>
      </div>
    </footer>
  );
}
