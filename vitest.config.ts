import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./spec/support/mocks.tsx', './spec/support/testing-library.ts', './spec/support/msw.ts'],
  },
}));
