import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// When building for Capacitor (--base=/), use '/' paths; otherwise use GitHub Pages path
const base = process.env.VITE_BUILD_TARGET === 'capacitor' ? '/' : '/domanga/'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Karcha',
        short_name: 'Karcha',
        description: 'Expense tracker for couples',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__:  JSON.stringify(new Date().toISOString()),
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
