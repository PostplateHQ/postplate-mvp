// @ts-check
const path = require("path");

/**
 * Playwright 1.49+ headless uses **chromium-headless-shell** (separate from full Chromium).
 * Always use a repo-local cache so IDE/sandbox env (e.g. wrong PLAYWRIGHT_BROWSERS_PATH) cannot
 * force a mismatched arch or missing binary.
 */
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(
  __dirname,
  "node_modules",
  ".cache",
  "ms-playwright",
);

const { defineConfig, devices } = require("@playwright/test");

/**
 * UI E2E against local Express (mirrors black-box flows).
 * Run: npm run playwright:install && npm run test:playwright
 */
module.exports = defineConfig({
  testDir: "tests/e2e/playwright",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://127.0.0.1:3456",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: process.env.CI ? "retain-on-failure" : "off",
  },
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:3456/api/config/mode",
    reuseExistingServer: !!process.env.PLAYWRIGHT_REUSE_SERVER,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      DEV_MODE: "true",
      PORT: "3456",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
