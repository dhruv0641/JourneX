import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'JournalX — Personal Operating System',
    short_name: 'JournalX',
    description:
      'Modular personal operating system for topics, tasks, journaling, calculators, time tracking, and analytics.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#f7f3eb',
    theme_color: '#643450',
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
