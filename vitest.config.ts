import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    hookTimeout: 60000, // Testcontainers takes a few seconds to pull and start
  },
});
