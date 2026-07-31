import type { MetadataRoute } from 'next';
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const dynamic = 'force-static';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NaijaRide — Intercity Car Trips',
    short_name: 'NaijaRide',
    description: 'Book verified drivers for safe, affordable intercity trips across Nigeria.',
    start_url: `${BASE}/`,
    scope: `${BASE}/`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#16a34a',
    categories: ['travel', 'navigation'],
    icons: [
      { src: `${BASE}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${BASE}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${BASE}/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
