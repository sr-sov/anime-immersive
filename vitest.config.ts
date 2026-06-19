import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('./', import.meta.url))

// Unit tests cover the pure, framework-light logic (formatters, the cache-key
// builder, the debounce). They run in plain Node, no Nuxt runtime needed, so
// the suite stays fast. The `~`/`@` aliases mirror Nuxt's so imports match the app.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: { '~': root, '@': root },
  },
})
