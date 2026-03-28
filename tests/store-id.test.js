const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeStoreIdSlug,
  rekeyOwnerStore,
  updateOwnerProfile,
} = require("../backend/services/ownerProfile");
const {
  generateCanonicalStoreId,
  generateProvisionStoreId,
  provisionStoreIdentity,
  CANONICAL_STORE_ID_PREFIX,
  OPAQUE_STORE_ID_RE,
} = require("../backend/lib/canonicalStoreId");

test("normalizeStoreIdSlug accepts rasa-kitchen style slugs", () => {
  assert.equal(normalizeStoreIdSlug("Rasa Kitchen"), "rasa-kitchen");
  assert.equal(normalizeStoreIdSlug("  taco_123  "), "taco-123");
  assert.equal(normalizeStoreIdSlug("ab"), "");
  assert.equal(normalizeStoreIdSlug("abc"), "abc");
});

test("normalizeStoreIdSlug accepts opaque store ids NN-NNNN", () => {
  assert.equal(normalizeStoreIdSlug("01-7402"), "01-7402");
});

test("rekeyOwnerStore moves profile and offers", () => {
  const data = {
    ownerProfiles: {
      oldstore: {
        storeId: "oldstore",
        restaurantName: "Test",
        menuItems: [],
      },
    },
    offers: [
      { id: "1", store: "oldstore", storeId: "oldstore", qrAssetUrl: "/qr?store=oldstore&x=1" },
      { id: "2", store: "other", storeId: "other" },
    ],
    redemptions: [{ store: "oldstore" }, { store: "other" }],
  };
  rekeyOwnerStore(data, "oldstore", "new-store");
  assert.ok(!data.ownerProfiles.oldstore);
  assert.equal(data.ownerProfiles["new-store"].storeId, "new-store");
  assert.equal(data.offers[0].store, "new-store");
  assert.equal(data.offers[0].qrAssetUrl, "/qr?store=new-store&x=1");
  assert.equal(data.redemptions[0].store, "new-store");
});

test("generateCanonicalStoreId matches pp_ + 16 hex", () => {
  const id = generateCanonicalStoreId();
  assert.ok(id.startsWith(CANONICAL_STORE_ID_PREFIX));
  assert.match(id, /^pp_[0-9a-f]{16}$/);
});

test("generateProvisionStoreId uses opaque NN-NNNN and avoids collisions", () => {
  const id1 = generateProvisionStoreId({});
  assert.match(id1, OPAQUE_STORE_ID_RE);
  const taken = { [id1]: { storeId: id1 } };
  const id2 = generateProvisionStoreId(taken, {});
  assert.notEqual(id2, id1);
  assert.match(id2, OPAQUE_STORE_ID_RE);
});

test("generateProvisionStoreId uses locationNumber for first two digits", () => {
  const id = generateProvisionStoreId({}, { locationNumber: 12 });
  assert.match(id, /^12-\d{4}$/);
});

test("provisionStoreIdentity sets brandId but opaque storeId", () => {
  const r = provisionStoreIdentity(
    "Desi Bites",
    {},
    { brandName: "Desi Bites", locationCode: "midtown" },
  );
  assert.equal(r.brandId, "desi-bites");
  assert.equal(r.locationId, "midtown");
  assert.match(r.storeId, OPAQUE_STORE_ID_RE);
});

test("updateOwnerProfile bumps profileRevision only when tracked fields change", () => {
  const data = {
    ownerProfiles: {
      "01-1111": {
        storeId: "01-1111",
        restaurantName: "A",
        menuItems: [],
        profileRevision: 0,
        profileChangeLog: [],
      },
    },
  };
  updateOwnerProfile(data, "01-1111", { restaurantName: "B" });
  assert.equal(data.ownerProfiles["01-1111"].profileRevision, 1);
  assert.equal(data.ownerProfiles["01-1111"].profileChangeLog.length, 1);
  updateOwnerProfile(data, "01-1111", { restaurantName: "B" });
  assert.equal(data.ownerProfiles["01-1111"].profileRevision, 1);
});

test("rekey then updateOwnerProfile uses new key", () => {
  const data = {
    ownerProfiles: {
      oldkey: { storeId: "oldkey", restaurantName: "A", menuItems: [] },
    },
    offers: [],
    redemptions: [],
  };
  rekeyOwnerStore(data, "oldkey", "new-key");
  const profile = updateOwnerProfile(data, "new-key", { restaurantName: "Bistro" });
  assert.equal(profile.storeId, "new-key");
  assert.equal(profile.restaurantName, "Bistro");
});
