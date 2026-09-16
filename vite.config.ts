import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Observação de privacidade: o service worker faz pré-cache apenas do "casco"
// da aplicação (JS/CSS/ícones). Nenhuma resposta de API, documento ou dado de
// cliente é armazenada offline — isso depende de definição técnica e validação
// de segurança específicas, ainda não aprovadas.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'logo-simbolo.svg', 'logo-horizontal.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
      manifest: {
        id: '/',
        name: 'Alcance Isenções',
        short_name: 'Alcance',
        description:
          'Painel de acompanhamento de processos de isenção para pessoas com deficiência.',
        lang: 'pt-BR',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#ffffff',
        theme_color: '#840da8',
        categories: ['business', 'productivity'],
        // Conjunto mínimo verificado. O ícone `maskable` (com zona de segurança)
        // deve ser gerado a partir do kit de marca antes da publicação.
        icons: [
          { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/favicon-96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173 },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
})
