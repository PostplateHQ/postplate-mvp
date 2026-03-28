const test = require("node:test");
const assert = require("node:assert/strict");

test("resolveOwnerStore: query beats cookie", async () => {
  process.env.DEV_MODE = "true";
  delete require.cache[require.resolve("../backend/lib/postplateSession")];
  const { resolveOwnerStoreFromRequest, signOwnerStoreCookie } = require("../backend/lib/postplateSession");
  const signed = signOwnerStoreCookie("pp_aaaaaaaaaaaaaaaa");
  const req = {
    query: { store: "01-7402" },
    headers: { cookie: `pp_owner_store=${encodeURIComponent(signed)}` },
    body: {},
  };
  assert.equal(resolveOwnerStoreFromRequest(req), "01-7402");
});

test("resolveOwnerStore: cookie when no query", async () => {
  process.env.DEV_MODE = "true";
  delete require.cache[require.resolve("../backend/lib/postplateSession")];
  const { resolveOwnerStoreFromRequest, signOwnerStoreCookie } = require("../backend/lib/postplateSession");
  const signed = signOwnerStoreCookie("pp_bbbbbbbbbbbbbbbb");
  const req = {
    query: {},
    headers: { cookie: `pp_owner_store=${encodeURIComponent(signed)}` },
    body: {},
  };
  assert.equal(resolveOwnerStoreFromRequest(req), "pp_bbbbbbbbbbbbbbbb");
});

test("sign + verify round trip", async () => {
  process.env.DEV_MODE = "true";
  delete require.cache[require.resolve("../backend/lib/postplateSession")];
  const { signOwnerStoreCookie, verifyOwnerStoreCookie } = require("../backend/lib/postplateSession");
  const s = signOwnerStoreCookie("pp_cccccccccccccccc");
  assert.equal(verifyOwnerStoreCookie(s), "pp_cccccccccccccccc");
  assert.equal(verifyOwnerStoreCookie("tampered"), null);
});
