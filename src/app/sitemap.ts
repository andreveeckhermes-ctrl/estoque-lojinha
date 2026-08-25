import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://meu-app.vercel.app';
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/codigo-de-barras`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/offline`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/para-loja-de-roupas`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
