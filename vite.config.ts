import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/e-sarabun/',          // ✅ ตรงกับ URL: /e-sarabun/
  build: {
    outDir: 'docs',             // ✅ สั่งให้ build ออกไปที่โฟลเดอร์ docs
  },
  plugins: [react()],
})
