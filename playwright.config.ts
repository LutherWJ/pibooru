import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Crucial for SQLite stability
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    // Reset database once before the server starts for the whole suite
    command: 'DATA_DIR=./data-test bun tests/e2e/setup-db.ts && bun src/server/index.tsx',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'test',
      PORT: '3001',
      DATA_DIR: './data-test',
      COOKIE_SECRET: 'test-secret-must-be-at-least-32-chars-long',
    },
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
