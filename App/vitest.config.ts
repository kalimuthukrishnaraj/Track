import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Separate from vite.config.ts so the PWA plugin (which expects a real
// browser build, not a Vitest/Node run) never loads during tests.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
