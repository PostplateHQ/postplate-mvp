const { test, expect } = require("@playwright/test");

/**
 * Mirrors black-box: POST /api/internal/provision-store + session cookie + profile resolution.
 */
test.describe("Provision store → dashboard", () => {
  test("provision via API sets cookie; dashboard shows new restaurant name", async ({ page }) => {
    await page.goto("/index.html");

    const res = await page.request.post("/api/internal/provision-store", {
      data: { restaurantName: "Playwright E2E Cafe" },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    const storeId = body.storeId;
    expect(storeId).toMatch(/^(?:pp_[0-9a-f]{16}|\d{2}-\d{4})$/);
    expect(body.profile.restaurantName).toBe("Playwright E2E Cafe");
    expect(body.profile.storeId).toBe(storeId);

    const profileResponse = page.waitForResponse(
      (r) =>
        r.url().includes("/owner/profile") &&
        r.request().method() === "GET" &&
        r.ok(),
    );

    await page.goto("/dashboard.html");
    const prof = await profileResponse;
    const profJson = await prof.json();
    expect(profJson.profile?.storeId, "dashboard boot must resolve same canonical store id").toBe(
      storeId,
    );

    await expect(page.locator("#appBusinessName")).toContainText("Playwright E2E Cafe", {
      timeout: 25_000,
    });
  });
});
