import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/whitelabel-validator-frontend/' : '/',
  plugins: [
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
      // Include all polyfills
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Polyfill specific modules - use empty array to include all
      include: [],
      // Exclude nothing
      exclude: [],
    }),
    react(),
    // Custom plugin to fix libsodium-wrappers-sumo import issue
    {
      name: 'fix-libsodium-import',
      resolveId(id, importer) {
        // Fix the relative import from libsodium-wrappers-sumo
        if (importer && importer.includes('libsodium-wrappers-sumo') && id === './libsodium-sumo.mjs') {
          // Resolve to the actual libsodium-sumo.mjs file
          return path.resolve(__dirname, 'node_modules/libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs')
        }
        return null
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      process: 'process/browser',
      buffer: 'buffer',
      stream: 'stream-browserify',
      // Force readable-stream to use the polyfilled version
      'readable-stream': 'readable-stream',
      // Handle nested readable-stream in hash-base
      'hash-base/node_modules/readable-stream': 'readable-stream',
    },
    // Fix libsodium-wrappers-sumo import issue by using a custom resolver
    dedupe: ['libsodium-wrappers-sumo'],
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
    include: [
      'buffer',
      'process',
      'readable-stream',
      'stream-browserify',
      'hash-base',
    ],
    // Exclude problematic packages from optimization
    exclude: [
      'libsodium-wrappers-sumo',
      'libsodium-sumo',
    ],
    // Force pre-bundling of problematic deps
    force: true,
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      external: (id) => {
        // Don't externalize these, but handle them specially
        if (id.includes('libsodium')) {
          return false
        }
        return false
      },
    },
  },
})
