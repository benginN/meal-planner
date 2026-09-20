import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Eski iPhone/iPad Safari'leri yeni sözdizimini (?., ??, sınıf alanları) ayrıştıramayınca bütün paket
  // tek bir SyntaxError ile düşer ve ekran boş kalır; hedefi düşük tutup esbuild'e çevirtiriz.
  build: { target: ['es2019', 'safari13'] },
  server: { proxy: { '/api': 'http://localhost:3000' } },
});
