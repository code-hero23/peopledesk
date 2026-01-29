import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      includeAssets: ['favicon.ico', 'orbix-logo.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'PeopleDesk',
        short_name: 'PeopleDesk',
        description: 'PeopleDesk Employee Dashboard & Worklog',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'orbix-logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'orbix-logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
