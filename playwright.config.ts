import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. Boots the app in demo mode (no Supabase env needed) and runs the
 * smoke specs in the e2e folder. In CI, run
 * "npx playwright install --with-deps chromium" first. The vitest suite (npm
 * test) is unaffected — it only globs the src test files.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
