const crypto = require("crypto");

const OWNER_STORE_COOKIE = "pp_owner_store";

function isDevMode() {
  return String(process.env.DEV_MODE || "").toLowerCase() === "true";
}

/** Prefer POSTPLATE_SESSION_SECRET in production (min 16 chars). Dev falls back to a fixed secret when DEV_MODE=true. */
function getSessionSecret() {
  const env = process.env.POSTPLATE_SESSION_SECRET;
  if (env && String(env).length >= 16) return String(env);
  if (isDevMode()) return "dev-postplate-session-secret-min-16";
  return null;
}

function signOwnerStoreCookie(storeId) {
  const secret = getSessionSecret();
  if (!secret || !storeId) return null;
  const mac = crypto.createHmac("sha256", secret).update(storeId, "utf8").digest("hex");
  const payload = Buffer.from(storeId, "utf8").toString("base64url");
  return `${payload}.${mac}`;
}

function verifyOwnerStoreCookie(raw) {
  if (!raw || typeof raw !== "string") return null;
  const i = raw.lastIndexOf(".");
  if (i <= 0) return null;
  const b64 = raw.slice(0, i);
  const mac = raw.slice(i + 1);
  let storeId;
  try {
    storeId = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!storeId) return null;
  const secret = getSessionSecret();
  if (!secret) return null;
  const expected = crypto.createHmac("sha256", secret).update(storeId, "utf8").digest("hex");
  const a = Buffer.from(mac, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  return storeId;
}

function parseCookieHeader(header) {
  const out = {};
  if (!header || typeof header !== "string") return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    let v = part.slice(idx + 1).trim();
    try {
      v = decodeURIComponent(v);
    } catch {
      /* keep raw */
    }
    out[k] = v;
  }
  return out;
}

/**
 * Resolve owner store for profile APIs: explicit ?store= wins (dev / deep links), then signed session cookie, then body.storeId (PUT).
 */
function resolveOwnerStoreFromRequest(req) {
  const q = String(req.query?.store || "").trim();
  if (q) return q;
  const cookies = parseCookieHeader(req.headers?.cookie);
  const raw = cookies[OWNER_STORE_COOKIE];
  const fromCookie = verifyOwnerStoreCookie(raw);
  if (fromCookie) return fromCookie;
  const body = req.body && typeof req.body === "object" ? req.body : {};
  return String(body.storeId || "").trim();
}

/** Set HttpOnly cookie binding the browser to this store (analytics / profile scope). */
function setOwnerStoreSessionCookie(res, storeId) {
  const signed = signOwnerStoreCookie(storeId);
  if (!signed) return false;
  const value = encodeURIComponent(signed);
  const maxAge = 365 * 24 * 60 * 60;
  const parts = [
    `${OWNER_STORE_COOKIE}=${value}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  res.append("Set-Cookie", parts.join("; "));
  return true;
}

function assertInternalProvisionAllowed(req) {
  if (isDevMode()) return true;
  const token = process.env.POSTPLATE_INTERNAL_TOKEN;
  const auth = String(req.headers?.authorization || "");
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return Boolean(token && bearer && bearer === token);
}

module.exports = {
  OWNER_STORE_COOKIE,
  getSessionSecret,
  signOwnerStoreCookie,
  verifyOwnerStoreCookie,
  parseCookieHeader,
  resolveOwnerStoreFromRequest,
  setOwnerStoreSessionCookie,
  assertInternalProvisionAllowed,
};
