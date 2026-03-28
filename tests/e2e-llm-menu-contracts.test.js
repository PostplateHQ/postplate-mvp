/**
 * LLM-adjacent menu API contracts: validation, dev stub path, no-key fallback (black-box).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { registerMenuRoutes } = require("../backend/routes/menu");

function saveEnv() {
  return {
    DEV_MODE: process.env.DEV_MODE,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };
}

function restoreEnv(saved) {
  for (const k of Object.keys(saved)) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
}

async function menuApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  registerMenuRoutes(app);
  return new Promise((resolve, reject) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
    s.on("error", reject);
  });
}

function baseUrl(server) {
  const a = server.address();
  return `http://${a.address}:${a.port}`;
}

test("improve-description: 400 without itemName (negative)", async () => {
  const server = await menuApp();
  const b = baseUrl(server);
  const res = await fetch(`${b}/api/menu/improve-description`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentDescription: "x" }),
  });
  assert.equal(res.status, 400);
  const j = await res.json();
  assert.ok(String(j.error || "").includes("itemName"));
  server.close();
});

test("improve-description: DEV_MODE returns deterministic stub (contract)", async () => {
  const saved = saveEnv();
  process.env.DEV_MODE = "true";
  const server = await menuApp();
  const b = baseUrl(server);
  const res = await fetch(`${b}/api/menu/improve-description`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemName: "Masala Dosa" }),
  });
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.source, "dev");
  assert.ok(String(j.description || "").includes("Masala Dosa"));
  server.close();
  restoreEnv(saved);
});

test("improve-description: no key uses fallback shape (positive)", async () => {
  const saved = saveEnv();
  process.env.DEV_MODE = "false";
  delete process.env.OPENAI_API_KEY;
  const server = await menuApp();
  const b = baseUrl(server);
  const res = await fetch(`${b}/api/menu/improve-description`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemName: "Samosa" }),
  });
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.source, "fallback");
  assert.ok(String(j.description || "").length > 0);
  server.close();
  restoreEnv(saved);
});

test("suggest-item-image: 400 without itemName (negative)", async () => {
  const server = await menuApp();
  const b = baseUrl(server);
  const res = await fetch(`${b}/api/menu/suggest-item-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note: "x" }),
  });
  assert.equal(res.status, 400);
  const j = await res.json();
  assert.ok(String(j.error || "").includes("itemName"));
  server.close();
});

test("suggest-item-image: DEV_MODE returns stub (contract)", async () => {
  const saved = saveEnv();
  process.env.DEV_MODE = "true";
  const server = await menuApp();
  const b = baseUrl(server);
  const res = await fetch(`${b}/api/menu/suggest-item-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemName: "Tomato Soup", note: "creamy" }),
  });
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.source, "dev");
  assert.equal(j.skipped, true);
  assert.equal(j.imageUrl, "");
  server.close();
  restoreEnv(saved);
});

test("suggest-item-image: no key returns skipped shape (positive)", async () => {
  const saved = saveEnv();
  process.env.DEV_MODE = "false";
  delete process.env.OPENAI_API_KEY;
  const server = await menuApp();
  const b = baseUrl(server);
  const res = await fetch(`${b}/api/menu/suggest-item-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemName: "Samosa" }),
  });
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.skipped, true);
  assert.equal(j.source, "fallback");
  assert.equal(j.reason, "missing_api_key");
  server.close();
  restoreEnv(saved);
});
