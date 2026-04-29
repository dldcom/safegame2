import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// 개발 모드: /api 와 /assets 를 로컬 Express(3002) 로 프록시.
// 빌드 모드: 정적 dist/. /assets 는 vite 가 public/ 에서 직접 서빙.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/assets': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
});
