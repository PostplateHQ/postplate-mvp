const { test, expect } = require("@playwright/test");

/**
 * Mirrors black-box: GET /api/qr/menu-order — Settings UI opens in-page QR modal with PNG.
 */
test.describe("Settings table-ordering QR", () => {
  test("Create table ordering QR opens modal with image", async ({ page }) => {
    await page.goto("/dashboard.html?page=settings&store=01-7402");

    await expect(page.locator("#settingsSaveButton")).toBeVisible({ timeout: 25_000 });

    const qrResponse = page.waitForResponse(
      (r) =>
        (r.url().includes("/api/qr/menu-order") || r.url().includes("menuOnly=1")) &&
        r.status() === 200,
    );

    await page.locator('button[data-open-table-order-qr="1"]').first().click();
    await qrResponse;

    await expect(page.locator("#ppTableOrderQrModal")).toBeVisible();
    await expect(page.locator("#ppTableOrderQrModal .pp-table-qr-modal-img")).toBeVisible({
      timeout: 20_000,
    });

    await page.keyboard.press("Escape");
    await expect(page.locator("#ppTableOrderQrModal")).toHaveCount(0);
  });
});
