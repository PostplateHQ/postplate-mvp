const { test, expect } = require("@playwright/test");

/**
 * Mirrors black-box: GET /api/public/menu — guest UI loads menu for seed store (data.json).
 */
test.describe("Guest public menu", () => {
  test("menu page fetches public API and renders dish rows", async ({ page }) => {
    const menuResponse = page.waitForResponse(
      (r) =>
        r.url().includes("/api/public/menu") &&
        r.url().includes("store=01-7402") &&
        r.status() === 200,
    );

    await page.goto("/menu.html?store=01-7402");
    await menuResponse;

    await expect(page.locator("#ogMenuSearch")).toBeVisible();
    await expect(page.locator(".og-item").first()).toBeVisible({ timeout: 20_000 });
  });
});
