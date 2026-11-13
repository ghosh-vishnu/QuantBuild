import { defineConfig, devices } from '@playwright/test';
import { loadEnv } from 'vite';
const env = { ...loadEnv('development', process.cwd(), ''), ...process.env };
if (!env.DEV_HOST || !env.DEV_PORT) throw new Error('Configure DEV_HOST and DEV_PORT in .env.');
const baseURL = `http://${env.DEV_HOST}:${env.DEV_PORT}`;
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    ...devices['Desktop Chrome'],
    channel: env.E2E_BROWSER_CHANNEL || undefined,
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
