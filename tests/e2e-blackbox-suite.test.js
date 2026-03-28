/**
 * Black-box API E2E: owner store/session, provision, profile, public menu, QR menu-order, order-guest.
 * Positive / negative / edge — no UI driver; validates contracts automation engineers rely on.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildOwnerMenuQrApp,
  listen,
  baseUrl,
} = require("./helpers/memory-store-app");
const { signOwnerStoreCookie } = require("../backend/lib/postplateSession");

function saveEnv() {
  return {
    DEV_MODE: process.env.DEV_MODE,
    POSTPLATE_INTERNAL_TOKEN: process.env.POSTPLATE_INTERNAL_TOKEN,
    POSTPLATE_SESSION_SECRET: process.env.POSTPLATE_SESSION_SECRET,
  };
}

function restoreEnv(saved) {
  for (const k of Object.keys(saved)) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  delete require.cache[require.resolve("../backend/lib/postplateSession")];
}

async function provision(base, body = {}, headers = {}) {
  return fetch(`${base}/api/internal/provision-store`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

test("provision-store: 403 when not dev and no bearer token", async () => {
  const saved = saveEnv();
  process.env.DEV_MODE = "false";
  delete process.env.POSTPLATE_INTERNAL_TOKEN;
  delete require.cache[require.resolve("../backend/lib/postplateSession")];

  const { app } = buildOwnerMenuQrApp({});
  const server = await listen(app);
  const b = baseUrl(server);
  const res = await provision(b, { restaurantName: "X" });
  assert.equal(res.status, 403);
  const j = await res.json();
  assert.ok(String(j.error || "").includes("allowed"));
  server.close();
  restoreEnv(saved);
});

const PROVISION_STORE_ID_RE = /^(?:pp_[0-9a-f]{16}|\d{2}-\d{4})$/;

test("provision-store: 200 in dev, opaque store id, Set-Cookie, persisted profile", async () => {
  const saved = saveEnv();
  process.env.DEV_MODE = "true";
  process.env.POSTPLATE_SESSION_SECRET = "test-secret-at-least-16";
  delete require.cache[require.resolve("../backend/lib/postplateSession")];

  const { app, loadData } = buildOwnerMenuQrApp({});
  const server = await listen(app);
  const b = baseUrl(server);
  const res = await provision(b, { restaurantName: "Blackbox Bistro" });
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.success, true);
  assert.match(j.storeId, PROVISION_STORE_ID_RE);
  assert.equal(j.profile.restaurantName, "Blackbox Bistro");
  assert.equal(j.sessionCookieSet, true);
  const setCookie = res.headers.get("set-cookie") || "";
  assert.ok(setCookie.includes("pp_owner_store"));
  assert.ok(loadData().ownerProfiles[j.storeId]);

  const res2 = await provision(b, { restaurantName: "Second" });
  const j2 = await res2.json();
  assert.notEqual(j2.storeId, j.storeId);

  server.close();
  restoreEnv(saved);
});

test("provision-store: optional locationCode and locationLabel on profile", async () => {
  const saved = saveEnv();
  process.env.DEV_MODE = "true";
  process.env.POSTPLATE_SESSION_SECRET = "test-secret-at-least-16";
  delete require.cache[require.resolve("../backend/lib/postplateSession")];

  const { app } = buildOwnerMenuQrApp({});
  const server = await listen(app);
  const b = baseUrl(server);
  const res = await provision(b, {
    restaurantName: "Lo Cafe",
    locationNumber: 7,
    locationCode: "sf-1",
    locationLabel: "SF — Market St",
  });
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.match(j.storeId, /^07-\d{4}$/);
  assert.equal(j.profile.brandId, "lo-cafe");
  assert.equal(j.profile.locationId, "sf-1");
  assert.equal(j.profile.restaurantLocation, "SF — Market St");
  server.close();
  restoreEnv(saved);
});

test("provision-store: 200 with Bearer POSTPLATE_INTERNAL_TOKEN when dev off", async () => {
  const saved = saveEnv();
  process.env.DEV_MODE = "false";
  process.env.POSTPLATE_INTERNAL_TOKEN = "internal-test-token-xyz";
  process.env.POSTPLATE_SESSION_SECRET = "prod-like-secret-16chars";
  delete require.cache[require.resolve("../backend/lib/postplateSession")];

  const { app } = buildOwnerMenuQrApp({});
  const server = await listen(app);
  const b = baseUrl(server);
  const res = await provision(
    b,
    {},
    { Authorization: "Bearer internal-test-token-xyz" },
  );
  assert.equal(res.status, 200);
  server.close();
  restoreEnv(saved);
});

test("owner/profile: query store beats signed cookie", async () => {
  const saved = saveEnv();
  process.env.DEV_MODE = "true";
  delete require.cache[require.resolve("../backend/lib/postplateSession")];

  const { app } = buildOwnerMenuQrApp({
    ownerProfiles: {
      store_a: { restaurantName: "A", menuItems: [] },
      store_b: { restaurantName: "B", menuItems: [] },
    },
  });
  const server = await listen(app);
  const b = baseUrl(server);
  const signed = signOwnerStoreCookie("store_b");
  const res = await fetch(`${b}/owner/profile?store=store_a`, {
    headers: { Cookie: `pp_owner_store=${encodeURIComponent(signed)}` },
  });
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.profile.restaurantName, "A");
  server.close();
  restoreEnv(saved);
});

test("owner/profile: cookie used when no query", async () => {
  const saved = saveEnv();
  process.env.DEV_MODE = "true";
  delete require.cache[require.resolve("../backend/lib/postplateSession")];

  const { app } = buildOwnerMenuQrApp({
    ownerProfiles: {
      only_cookie: { restaurantName: "Cookie Store", menuItems: [] },
    },
  });
  const server = await listen(app);
  const b = baseUrl(server);
  const signed = signOwnerStoreCookie("only_cookie");
  const res = await fetch(`${b}/owner/profile`, {
    headers: { Cookie: `pp_owner_store=${encodeURIComponent(signed)}` },
  });
  const j = await res.json();
  assert.equal(j.profile.restaurantName, "Cookie Store");
  server.close();
  restoreEnv(saved);
});

test("owner/profile PUT: 400 when store cannot be resolved", async () => {
  const saved = saveEnv();
  process.env.DEV_MODE = "true";
  delete require.cache[require.resolve("../backend/lib/postplateSession")];

  const { app } = buildOwnerMenuQrApp({ ownerProfiles: {} });
  const server = await listen(app);
  const b = baseUrl(server);
  const res = await fetch(`${b}/owner/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ restaurantName: "Nope" }),
  });
  assert.equal(res.status, 400);
  server.close();
  restoreEnv(saved);
});

test("owner/profile PUT: updates when store in query", async () => {
  const { app, loadData } = buildOwnerMenuQrApp({
    ownerProfiles: {
      upd: { restaurantName: "Old", menuItems: [] },
    },
  });
  const server = await listen(app);
  const b = baseUrl(server);
  const res = await fetch(`${b}/owner/profile?store=upd`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ restaurantName: "New Name", storeId: "upd" }),
  });
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.profile.restaurantName, "New Name");
  assert.equal(loadData().ownerProfiles.upd.restaurantName, "New Name");
  server.close();
});

test("public/menu: 400 without store", async () => {
  const { app } = buildOwnerMenuQrApp({});
  const server = await listen(app);
  const b = baseUrl(server);
  const res = await fetch(`${b}/api/public/menu`);
  assert.equal(res.status, 400);
  server.close();
});

test("public/menu: 200 shape, prices normalized, empty menu message", async () => {
  const { app } = buildOwnerMenuQrApp({
    ownerProfiles: {
      menustore: {
        restaurantName: "Menu Lab",
        logoAsset: "",
        menuItems: [
          {
            id: "1",
            name: "Item",
            category: "main",
            priceCents: 899,
            note: "Note",
          },
        ],
        fulfillmentModes: ["pickup"],
        defaultFulfillment: "pickup",
      },
    },
  });
  const server = await listen(app);
  const b = baseUrl(server);
  const res = await fetch(`${b}/api/public/menu?store=menustore`);
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.success, true);
  assert.equal(j.restaurantName, "Menu Lab");
  assert.equal(j.menuItems.length, 1);
  assert.equal(j.menuItems[0].price, 8.99);
  assert.equal(j.menuItems[0].priceCents, 899);
  assert.ok(Array.isArray(j.categories));
  assert.equal(j.message, null);
  server.close();
});

test("public/menu: unknown store still 200 (synthetic profile)", async () => {
  const { app } = buildOwnerMenuQrApp({ offers: [], ownerProfiles: {} });
  const server = await listen(app);
  const b = baseUrl(server);
  const res = await fetch(
    `${b}/api/public/menu?store=${encodeURIComponent("unknown-store-xyz")}`,
  );
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.success, true);
  assert.ok(Array.isArray(j.menuItems));
  server.close();
});

test("public/menu: offerId cross-store must not attach offer", async () => {
  const { app } = buildOwnerMenuQrApp({
    offers: [
      {
        id: "off1",
        store: "other",
        storeId: "other",
        name: "10% off",
        discountValue: 15,
        termsText: "T",
      },
    ],
    ownerProfiles: {
      mystore: {
        restaurantName: "Mine",
        menuItems: [{ id: "x", name: "X", category: "main", priceCents: 100 }],
      },
    },
  });
  const server = await listen(app);
  const b = baseUrl(server);
  const res = await fetch(`${b}/api/public/menu?store=mystore&offerId=off1`);
  const j = await res.json();
  assert.equal(j.offer, null);
  server.close();
});

test("api/qr/menu-order: 400 without store", async () => {
  const { app } = buildOwnerMenuQrApp({});
  const server = await listen(app);
  const b = baseUrl(server);
  const res = await fetch(`${b}/api/qr/menu-order`);
  assert.equal(res.status, 400);
  server.close();
});

test("api/qr/menu-order: 200 PNG data URL", async () => {
  const { app } = buildOwnerMenuQrApp({
    ownerProfiles: {
      qrstore: { restaurantName: "QR Place", menuItems: [] },
    },
  });
  const server = await listen(app);
  const b = baseUrl(server);
  const res = await fetch(`${b}/api/qr/menu-order?store=qrstore`);
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.success, true);
  assert.ok(String(j.menuOrderQrDataUrl || "").startsWith("data:image/"));
  assert.ok(String(j.menuOrderUrl || "").includes("menu-intro"));
  server.close();
});

test("order-guest: analytics event 204, orders 200 shape", async () => {
  const { app } = buildOwnerMenuQrApp({});
  const server = await listen(app);
  const b = baseUrl(server);
  const e = await fetch(`${b}/api/public/order-guest/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: "menu_view", storeId: "s1" }),
  });
  assert.equal(e.status, 204);
  const o = await fetch(`${b}/api/public/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(o.status, 200);
  const j = await o.json();
  assert.equal(j.success, true);
  assert.ok(String(j.orderId || "").length > 0);
  server.close();
});

test("edge: tampered session cookie falls back to query", async () => {
  const saved = saveEnv();
  process.env.DEV_MODE = "true";
  delete require.cache[require.resolve("../backend/lib/postplateSession")];

  const { app } = buildOwnerMenuQrApp({
    ownerProfiles: {
      good: { restaurantName: "Good", menuItems: [] },
    },
  });
  const server = await listen(app);
  const b = baseUrl(server);
  const res = await fetch(`${b}/owner/profile?store=good`, {
    headers: { Cookie: "pp_owner_store=not-a-valid-signature-at-all" },
  });
  const j = await res.json();
  assert.equal(j.profile.restaurantName, "Good");
  server.close();
  restoreEnv(saved);
});

test("edge: very long store query rejected or handled (no crash)", async () => {
  const { app } = buildOwnerMenuQrApp({});
  const server = await listen(app);
  const b = baseUrl(server);
  const long = "x".repeat(500);
  const res = await fetch(`${b}/api/public/menu?store=${encodeURIComponent(long)}`);
  assert.ok(res.status === 200 || res.status === 400 || res.status === 414);
  server.close();
});
