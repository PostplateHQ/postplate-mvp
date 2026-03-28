const crypto = require("crypto");
const { normalizeStoreIdSlug } = require("../services/ownerProfile");

/**
 * Legacy fallback when a unique opaque id cannot be reserved.
 * Format: `pp_` + 16 lowercase hex (8 random bytes).
 */
function generateCanonicalStoreId() {
  return `pp_${crypto.randomBytes(8).toString("hex")}`;
}

function trimmedOrDefault(name, fallback) {
  const s = String(name || "").trim();
  return s || fallback;
}

function baseSlugFromRestaurantName(restaurantName) {
  const trimmed = String(restaurantName || "").trim();
  const normalized = normalizeStoreIdSlug(trimmed);
  if (normalized) return normalized;
  return `venue-${crypto.randomBytes(3).toString("hex")}`;
}

/** Brand / analytics slug from provision body — not embedded in store id. */
function deriveProvisionBrandSlug({ brandId, brandName, restaurantName } = {}) {
  const fromId = normalizeStoreIdSlug(String(brandId || "").trim());
  if (fromId) return fromId;
  const fromBrandName = normalizeStoreIdSlug(String(brandName || "").trim());
  if (fromBrandName) return fromBrandName;
  return baseSlugFromRestaurantName(trimmedOrDefault(restaurantName, "Your Restaurant"));
}

function deriveProvisionLocationSlug(locationCode, locationId) {
  const raw = String(locationCode || locationId || "").trim();
  return normalizeStoreIdSlug(raw);
}

/** Location slot 01–99 for store id prefix (separate from profile locationId string). */
function clampLocationSlot(n) {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return 1;
  if (v < 1) return 1;
  if (v > 99) return 99;
  return v;
}

function locationSlotFromBody(body = {}) {
  if (body.locationNumber != null && String(body.locationNumber).trim() !== "") {
    return clampLocationSlot(body.locationNumber);
  }
  const code = String(body.locationCode || body.locationSlot || "").trim();
  if (/^\d{1,2}$/.test(code)) return clampLocationSlot(parseInt(code, 10, 10));
  return 1;
}

function formatLocationSlot(slot) {
  return String(slot).padStart(2, "0");
}

/**
 * Opaque store id: `{2-digit location slot}-{4-digit random}` (e.g. `01-4829`).
 * Does not include restaurant name. Uniqueness across ownerProfiles.
 */
function generateProvisionStoreId(ownerProfiles, body = {}) {
  const profiles = ownerProfiles && typeof ownerProfiles === "object" ? ownerProfiles : {};
  const loc = formatLocationSlot(locationSlotFromBody(body));
  for (let i = 0; i < 500; i += 1) {
    const num = crypto.randomInt(0, 10000);
    const suffix = String(num).padStart(4, "0");
    const candidate = `${loc}-${suffix}`;
    const slug = normalizeStoreIdSlug(candidate);
    if (slug && !profiles[slug]) return slug;
  }
  return generateCanonicalStoreId();
}

function provisionStoreIdentity(restaurantName, ownerProfiles, body = {}) {
  const name = trimmedOrDefault(restaurantName, "Your Restaurant");
  const brandSlug = deriveProvisionBrandSlug({
    brandId: body.brandId,
    brandName: body.brandName,
    restaurantName: name,
  });
  const locationSlug = deriveProvisionLocationSlug(body.locationCode, body.locationId);
  const storeId = generateProvisionStoreId(ownerProfiles, body);
  return {
    storeId,
    brandId: brandSlug,
    locationId: locationSlug || "primary",
  };
}

module.exports = {
  generateCanonicalStoreId,
  generateProvisionStoreId,
  provisionStoreIdentity,
  locationSlotFromBody,
  CANONICAL_STORE_ID_PREFIX: "pp_",
  /** Match opaque provisioned ids or legacy pp_ fallback. */
  OPAQUE_STORE_ID_RE: /^\d{2}-\d{4}$/,
};
