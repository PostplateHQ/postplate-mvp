const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const {
  registerPublicMenuRoutes,
  publicMenuItemFromOwnerItem,
  buildGuestMenuSections,
} = require("../backend/routes/publicMenu");

function makeApp() {
  const app = express();
  registerPublicMenuRoutes(app, {
    loadData: () => ({
      offers: [],
      ownerProfiles: {
        teststore: {
          storeId: "teststore",
          restaurantName: "Rasa Kitchen",
          logoAsset: "",
          menuItems: [
            {
              id: "i1",
              name: "Dosa",
              category: "main",
              price: 12.5,
              note: "Crispy",
            },
            {
              id: "i2",
              name: "Lassi",
              category: "drink",
              price: "4",
            },
          ],
          fulfillmentModes: ["pickup"],
          defaultFulfillment: "pickup",
        },
      },
    }),
    getOwnerProfile: (data, store) => {
      const { getOwnerProfile } = require("../backend/services/ownerProfile");
      return getOwnerProfile(data, store);
    },
    getOfferById: () => null,
  });
  return app;
}

test("GET /api/public/menu returns 400 without store", async () => {
  const app = makeApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/public/menu`);
  assert.equal(res.status, 400);
  server.close();
});

test("GET /api/public/menu returns items for store", async () => {
  const app = makeApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address();
  const res = await fetch(
    `http://127.0.0.1:${port}/api/public/menu?store=teststore`,
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.restaurantName, "Rasa Kitchen");
  assert.equal(body.menuItems.length, 2);
  assert.equal(body.menuItems[0].name, "Dosa");
  assert.ok(typeof body.menuItems[0].price === "number");
  assert.equal(body.menuItems[0].priceCents, 1250);
  assert.ok(Array.isArray(body.categories));
  assert.equal(body.brandId, "rasa-kitchen");
  assert.equal(body.locationId, "primary");
  server.close();
});

test("publicMenuItemFromOwnerItem strips · Price from note and infers priceCents", () => {
  const dto = publicMenuItemFromOwnerItem({
    id: "s1",
    name: "Tomato soup",
    category: "starter",
    note: "Classic recipe. · Price: $ 10.00",
    priceCents: null,
    displayPrice: "",
  });
  assert.equal(dto.description, "Classic recipe.");
  assert.equal(dto.priceCents, 1000);
  assert.equal(dto.displayPrice, "$10.00");
});

test("buildGuestMenuSections preserves custom section titles and order", () => {
  const a = publicMenuItemFromOwnerItem({
    id: "1",
    name: "Wings",
    category: "starter",
    sectionTitle: "Sharables",
  });
  const b = publicMenuItemFromOwnerItem({
    id: "2",
    name: "Penne",
    category: "main",
    sectionTitle: "Perfect pastas",
  });
  const c = publicMenuItemFromOwnerItem({
    id: "3",
    name: "No section",
    category: "main",
    sectionTitle: "",
  });
  const { categories, menuItems } = buildGuestMenuSections([a, b, c]);
  assert.equal(categories.length, 3);
  assert.equal(categories[0].name, "Sharables");
  assert.equal(categories[1].name, "Perfect pastas");
  assert.equal(categories[2].name, "Mains");
  assert.equal(menuItems[0].categoryId, categories[0].id);
  assert.equal(menuItems[2].categoryId, "c_main");
});
