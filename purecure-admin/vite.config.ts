import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://purecure-appointment-booking-app-g5ua.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
