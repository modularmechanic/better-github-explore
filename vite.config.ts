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
