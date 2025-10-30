import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'

// Load shared environment variables so the dev proxy matches the backend port
dotenv.config()

const devServerPort = Number(process.env.VITE_DEV_SERVER_PORT) || 3000
const backendHost = process.env.BACKEND_HOST || 'localhost'
// Default to Python backend (port 8000), fallback to JavaScript backend (port 5000) for legacy support
const backendPort = Number(process.env.PORT || process.env.BACKEND_PORT || 8000)

const apiBasePath = (process.env.VITE_API_URL || '/api').replace(/\/$/, '')
const authBasePath = (process.env.VITE_AUTH_URL || '/auth').replace(/\/$/, '')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: devServerPort,
    proxy: {
      '/api': {
        target: `http://${backendHost}:${backendPort}`,
        changeOrigin: true,
      },
      '/auth': {
        target: `http://${backendHost}:${backendPort}`,
        changeOrigin: true,
      },
    },
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(apiBasePath),
    'import.meta.env.VITE_AUTH_URL': JSON.stringify(authBasePath),
  },
})
