import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Meu App',
    short_name: 'App',
    description: 'App offline-first com SQLite',
    start_url: '/app',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#15803d',
    icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png' }],
  };
}
