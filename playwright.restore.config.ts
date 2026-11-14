import { defineConfig, devices } from "@playwright/test";

// Checks a restored backup in the app (see .github/workflows/restore-check.yml).
// The data is the family's real collection, and CI logs are public, so this
// keeps no traces, screenshots or reports, and its checks print counts only.

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on the environment.
}

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e/restore",
  globalSetup: "./e2e/global-setup.ts",
  reporter: "dot",
  retries: 0,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
