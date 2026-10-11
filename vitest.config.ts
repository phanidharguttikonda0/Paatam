import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/tests/**/*.test.ts'],
    fileParallelism: false,
    hookTimeout: 60000, // Testcontainers takes a few seconds to pull and start
  },
});
