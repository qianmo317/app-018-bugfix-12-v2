import { defineConfig } from '@playwright/test';
import fs from 'node:fs';

const BASE_URL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: BASE_URL ?? 'http://localhost:4180',
    trace: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  // 设置 E2E_BASE_URL 时直接测外部地址（如 Docker 容器），否则本地起 dev server
  ...(BASE_URL ? {} : {
    webServer: {
      command: 'npm run dev -- --port 4180 --strictPort',
      url: 'http://localhost:4180',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  }),
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        // 优先用系统 Chrome（channel），避免每次下载 Playwright 内核；CI 或无 Chrome 环境回退到内置内核
        ...(fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? { channel: 'chrome' as const } : {}),
      },
    },
  ],
});
