import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({
  path: path.resolve(__dirname, '.env.e2e'),
  quiet: true,
});

const baseURL = requireEnvironmentVariable('E2E_BASE_URL');
const isCI = Boolean(process.env.CI);
const shouldStartWebServers = process.env.E2E_START_WEB_SERVERS !== 'false';
const reuseExistingServer =
  !isCI && process.env.E2E_REUSE_EXISTING_SERVER !== 'false';

const webServer = shouldStartWebServers
  ? createWebServerConfiguration(baseURL)
  : undefined;

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  outputDir: './test-results/e2e',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: isCI
    ? [
        ['line'],
        ['junit', { outputFile: 'test-results/e2e-results.xml' }],
        ['html', { open: 'never' }],
      ]
    : [
        ['list'],
        ['html', { open: 'never' }],
      ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer,
});

function createWebServerConfiguration(frontendBaseURL: string) {
  const apiBaseURL = requireEnvironmentVariable('E2E_API_BASE_URL');
  const frontendURL = parseURL('E2E_BASE_URL', frontendBaseURL);
  const apiURL = parseURL('E2E_API_BASE_URL', apiBaseURL);
  const frontendPort = getPort(frontendURL);
  const backendPort = getPort(apiURL);
  const backendEnvironment: Record<string, string> = {
    PORT: backendPort,
  };

  if (process.env.E2E_DATABASE_URL) {
    backendEnvironment.DATABASE_URL = process.env.E2E_DATABASE_URL;
  }

  return [
    {
      name: 'backend',
      command: 'npm run start',
      cwd: path.resolve(__dirname, '../backend'),
      env: backendEnvironment,
      url: appendURLPath(apiBaseURL, 'health'),
      reuseExistingServer,
      timeout: 120_000,
      gracefulShutdown: { signal: 'SIGTERM' as const, timeout: 5_000 },
    },
    {
      name: 'frontend',
      command: `npm run dev -- --hostname ${frontendURL.hostname} --port ${frontendPort}`,
      cwd: __dirname,
      env: {
        NEXT_PUBLIC_API_BASE_URL: apiBaseURL,
      },
      url: frontendBaseURL,
      reuseExistingServer,
      timeout: 120_000,
      gracefulShutdown: { signal: 'SIGTERM' as const, timeout: 5_000 },
    },
  ];
}

function requireEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.e2e.example to .env.e2e and configure it before running E2E tests.`,
    );
  }

  return value;
}

function parseURL(name: string, value: string) {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL.`);
  }
}

function getPort(url: URL) {
  if (url.port) return url.port;
  return url.protocol === 'https:' ? '443' : '80';
}

function appendURLPath(base: string, suffix: string) {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return new URL(suffix, normalizedBase).toString();
}
