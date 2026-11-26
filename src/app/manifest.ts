import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NEXORA — Personal Operating System',
    short_name: 'NEXORA',
    description:
      'Modular personal operating system for topics, tasks, journaling, calculators, time tracking, and analytics.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#090d16',
    theme_color: '#1e40af',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
