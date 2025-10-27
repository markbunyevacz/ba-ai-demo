import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const coverageThresholds = {
  lines: 80,
  statements: 80,
  branches: 69.5,
  functions: 80
}

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    globals: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 1,
        minForks: 1
      }
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html'],
      thresholds: coverageThresholds
    }
  }
})

