import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
  },

  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: 'autoUpdate',

      includeAssets: [
        'favicon.ico',
        'pwa-192x192.png',
        'pwa-512x512.png',
      ],

      manifest: {
        name: 'LEBAN Moto Seguro',
        short_name: 'LEBAN Polícia',
        description:
          'Aplicativo policial para consulta e fiscalização de motas.',

        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/police-mobile',
        scope: '/',

        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        navigateFallback: '/index.html',

        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,woff2}',
        ],

        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === 'image',

            handler: 'CacheFirst',

            options: {
              cacheName: 'leban-images',
              expiration: {
                maxEntries: 150,
                maxAgeSeconds:
                  60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },

      devOptions: {
        enabled: true,
      },
    }),
  ],
});