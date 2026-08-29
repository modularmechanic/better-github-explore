import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative, so the same build works at /<repo>/ on Pages or at a domain root.
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  // Honour the port assigned by the launcher; fall back to Vite's default.
  server: { port: process.env.PORT ? Number(process.env.PORT) : undefined },
  build: {
    rollupOptions: {
      output: {
        /*
         * franc's trigram tables are ~100 kB, a seventh of the bundle, and they
         * change only when the package is upgraded. Splitting them off means an
         * app deploy no longer invalidates them: the reader re-downloads the
         * application chunk and keeps the language data from cache.
         *
         * This does NOT defer the download — the import in
         * src/lib/spoken-language.ts is static, so the chunk is still fetched
         * on first load, just in parallel and under its own cache entry.
         * Making it load only when a written-language filter is actually used
         * means a dynamic import, and detectLanguage is called from synchronous
         * filter callbacks in four views.
         */
        manualChunks: (id) => (id.includes('franc-min') || id.includes('trigrams')
          ? 'language-detection'
          : undefined),
      },
    },
  },
  test: {
    // Node by default: most tests are pure logic. DOM-needing files opt in with
    // a `// @vitest-environment jsdom` docblock, so we don't pay jsdom everywhere.
    environment: 'node',
    // Pin the clock zone so relative-date formatting is reproducible off-machine.
    env: { TZ: 'UTC' },
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      // src/components/ui/** is generated shadcn code — never measured.
      include: ['src/lib/**/*.ts', 'src/hooks/**/*.ts'],
      exclude: ['**/*.test.ts'],
      reporter: ['text', 'json-summary'],
      // No thresholds: the v8 provider reports no instrumented rows in this
      // setup, so a percentage gate here would pass vacuously. The real gate is
      // scripts/check-tested-modules.ts, which npm run check enforces.
    },
  },
})
