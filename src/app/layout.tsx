import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { APP_CONFIG } from "@/lib/constants";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://meu-app.vercel.app"),
  title: {
    default: "Sistema de Vendas e Estoque Gratuito com Scanner QR Code Offline",
    template: `%s | ${APP_CONFIG.name}`,
  },
  description: "Sistema de controle de vendas e estoque gratuito e offline. 50 produtos grátis, scanner QR code via câmera do celular, funciona sem internet. Adeus planilha travada.",
  verification: {
    google: process.env.GOOGLE_VERIFICATION_ID,
  },
  openGraph: {
    title: APP_CONFIG.name,
    description: "App privado, rápido e offline-first",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen flex flex-col antialiased bg-white text-black font-sans">
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
