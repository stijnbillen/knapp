import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Site draait op https://<gebruiker>.github.io/knapp/
  base: '/knapp/',
  plugins: [
    react(),
    VitePWA({
      // Nieuwe versie wordt stil opgehaald zodra het toestel online is;
      // offline blijft de vorige versie gewoon werken.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Knapp — oefenen en spelen',
        short_name: 'Knapp',
        description: 'Leeroefeningen en spelletjes voor kinderen',
        lang: 'nl-BE',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#3b7fd6',
        background_color: '#f6f4ee',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Alles vooraf cachen zodat de app na installatie 100% offline werkt.
        // De woordenlijsten (JSON) zitten mee in de JS-bundel; er zijn geen
        // externe URL's of CDN's.
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,ico,json,woff2}'],
      },
    }),
  ],
})
