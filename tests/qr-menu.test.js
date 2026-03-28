const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const QRCode = require("qrcode");
const { registerQrRoutes } = require("../backend/routes/qr");
const { getOwnerProfile } = require("../backend/services/ownerProfile");

function makeApp(data) {
  const app = express();
  registerQrRoutes(app, {
    QRCode,
    loadData: () => data,
    getOfferById: (d, offerId) => {
      const offers = Array.isArray(d.offers) ? d.offers : [];
      return offers.find((o) => o.id === offerId) || null;
    },
    getOwnerProfile,
  });
  return app;
}

const sampleData = {
  offers: [
    {
      id: "offer_rasa",
      store: "RA_0100-21",
      restaurant: "Rasa Kitchen",
      name: "10% off",
    },
    {
      id: "offer_wrong_store",
      store: "other",
      restaurant: "Other",
      name: "x",
    },
  ],
  ownerProfiles: {
    "RA_0100-21": {
      restaurantName: "Rasa Kitchen",
      menuItems: [{ id: "1", name: "Dosa", category: "main", priceCents: 999 }],
    },
  },
};

test("GET /qr?menuOnly=1 returns 400 without store", async () => {
  const app = makeApp(sampleData);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/qr?menuOnly=1`);
  assert.equal(res.status, 400);
  server.close();
});

test("GET /qr?menuOnly=1 returns menu URL and PNG data URL", async () => {
  const app = makeApp(sampleData);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address();
  const res = await fetch(
    `http://127.0.0.1:${port}/qr?menuOnly=1&store=${encodeURIComponent("RA_0100-21")}`,
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.menuOnly, true);
  assert.ok(body.menuOrderUrl.includes("/menu-intro.html?"));
  assert.ok(body.menuOrderUrl.includes("store=RA_0100-21"));
  assert.ok(body.menuOrderQrDataUrl.startsWith("data:image/png"));
  assert.equal(body.restaurantHint, "Rasa Kitchen");
  server.close();
});

test("GET /qr?menuOnly=1&offerId= rejects mismatched store", async () => {
  const app = makeApp(sampleData);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address();
  const res = await fetch(
    `http://127.0.0.1:${port}/qr?menuOnly=1&store=RA_0100-21&offerId=offer_wrong_store`,
  );
  assert.equal(res.status, 400);
  server.close();
});

test("GET /qr?menuOnly=1&offerId= appends offer when store matches", async () => {
  const app = makeApp(sampleData);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address();
  const res = await fetch(
    `http://127.0.0.1:${port}/qr?menuOnly=1&store=RA_0100-21&offerId=offer_rasa`,
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.menuOrderUrl.includes("offerId=offer_rasa"));
  server.close();
});

test("GET /api/qr/menu-order returns 400 without store", async () => {
  const app = makeApp(sampleData);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/qr/menu-order`);
  assert.equal(res.status, 400);
  server.close();
});

test("GET /api/qr/menu-order returns PNG for store", async () => {
  const app = makeApp(sampleData);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address();
  const res = await fetch(
    `http://127.0.0.1:${port}/api/qr/menu-order?store=${encodeURIComponent("RA_0100-21")}`,
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(body.menuOrderQrDataUrl.startsWith("data:image/png"));
  server.close();
});
