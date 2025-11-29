import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/e-sarabun/',   // 👈 เพิ่มบรรทัดนี้
  plugins: [react()],
})
