import { defineConfig } from 'vite'

export default defineConfig({
  // The viewer ships large assets and three.js; a plain Vite app needs no plugins.
  build: { target: 'es2022' },
  esbuild: { target: 'es2022' }
})
