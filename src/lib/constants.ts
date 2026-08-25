export const APP_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "Meu App Generico",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://meu-app.vercel.app",
  whatsapp: process.env.NEXT_PUBLIC_DEV_WHATSAPP || "5551991251325",
  pagseguroLink: process.env.NEXT_PUBLIC_PAGSEGURO_LINK || "",
  adminEmail: process.env.NEXT_PUBLIC_ADMIN_EMAIL || "",
};

export const DEVELOPER_CONTACT = {
  whatsapp: APP_CONFIG.whatsapp,
  getLink: (appName?: string) => {
    const name = appName || APP_CONFIG.name;
    const url = typeof window !== 'undefined' ? window.location.href : APP_CONFIG.url;
    const msg = `Olá André! Vim pelo app ${name} (${url}) e gostaria de falar sobre sugestões e negócios.`;
    return `https://wa.me/${APP_CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
  },
  getPaymentLink: (email: string, appName?: string) => {
    const name = appName || APP_CONFIG.name;
    const msg = `Olá André! Acabei de pagar o PRO do app ${name}. Meu email de cadastro é ${email}. Pode liberar meu acesso?`;
    return `https://wa.me/${APP_CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
  }
};
