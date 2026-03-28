const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { registerPublicMenuRoutes } = require("../backend/routes/publicMenu");

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
  server.close();
});
