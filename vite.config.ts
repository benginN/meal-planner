import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Older iPhone/iPad Safari cannot parse newer syntax (?., ??, class fields); the whole bundle then dies
  // with a single SyntaxError and the screen stays blank, so keep the target low and let esbuild transpile.
  build: { target: ['es2019', 'safari13'] },
  server: { proxy: { '/api': 'http://localhost:3000' } },
});
