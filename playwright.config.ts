import { defineConfig, devices } from "@playwright/test";

// Local Supabase URLs and keys for test setup (CI sets these as environment variables).
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on the environment.
}

const PORT = 3100; // Separate from `pnpm dev` (3000) so tests never reuse a dev server.
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  // The restore check runs on its own, against restored real data
  // (playwright.restore.config.ts).
  testIgnore: "restore/**",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
    // Safari's engine, as on the family's iPhones. WebKit needs Ubuntu system
    // libraries, so it runs in CI, or locally with PW_WEBKIT=1 (e.g. inside
    // the mcr.microsoft.com/playwright Docker image).
    ...(isCI || process.env.PW_WEBKIT
      ? [{ name: "iphone", use: { ...devices["iPhone 15"] } }]
      : []),
  ],
  webServer: {
    // CI tests the production build (built in an earlier step); locally use the dev server.
    command: isCI ? `pnpm start --port ${PORT}` : `pnpm dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
