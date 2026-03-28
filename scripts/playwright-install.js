#!/usr/bin/env node
/**
 * Install Playwright browsers into node_modules/.cache/ms-playwright (same path as playwright.config.js).
 * Ensures headless shell + chromium match this machine's architecture.
 */
const path = require("path");
const { execSync } = require("child_process");

// Always override — some environments inject a global PLAYWRIGHT_BROWSERS_PATH with wrong arch.
const browsersPath = path.join(__dirname, "..", "node_modules", ".cache", "ms-playwright");
process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;

execSync("npx playwright install chromium chromium-headless-shell", {
  stdio: "inherit",
  env: process.env,
  cwd: path.join(__dirname, ".."),
});
