function initialsForName(name = "") {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "PP";
}

function asString(value = "", fallback = "") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

/** Allowed slugs for default + per-campaign audience (marketing context only, not demographics claims). */
const AUDIENCE_PRIMARY_SLUGS = new Set([
  "general",
  "families",
  "young_professionals",
  "students",
  "tourists",
  "regulars",
  "new_nearby",
]);

function normalizeAudiencePrimary(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  if (!s || s === "skip" || s === "everyone") return "general";
  const slug = s === "youngprofessionals" ? "young_professionals" : s;
  return AUDIENCE_PRIMARY_SLUGS.has(slug) ? slug : "general";
}

const FOOD_TYPE_SLUGS = new Set(["veg", "non_veg", "egg_based", "vegan", "jain", "unspecified"]);
const MEAT_TYPE_SLUGS = new Set(["", "chicken", "mutton", "beef", "seafood"]);

function normalizeFoodTypeSlug(raw) {
  const t = asString(raw, "unspecified").toLowerCase().replace(/-/g, "_");
  return FOOD_TYPE_SLUGS.has(t) ? t : "unspecified";
}

function normalizeMeatTypeSlug(raw) {
  const m = asString(raw, "").toLowerCase();
  return MEAT_TYPE_SLUGS.has(m) ? m : "";
}

function truthyDiet(raw) {
  return raw === true || raw === 1 || raw === "1" || String(raw).toLowerCase() === "true";
}

function parsePriceCentsFromRaw(raw = {}) {
  if (raw.priceCents != null) {
    const n = Number(raw.priceCents);
    if (Number.isFinite(n) && n >= 0) return Math.round(n);
  }
  if (typeof raw.price === "number" && Number.isFinite(raw.price) && raw.price >= 0) {
    return Math.round(raw.price * 100);
  }
  const ps = String(raw.price || "").replace(/,/g, "").replace(/\s/g, "");
  if (ps) {
    const cleaned = ps.replace(/[^0-9.]/g, "");
    const n = parseFloat(cleaned);
    if (Number.isFinite(n) && n >= 0) return Math.round(n * 100);
  }
  return null;
}

function displayPriceFromCents(cents) {
  if (cents == null) return "";
  return `$${(cents / 100).toFixed(2)}`;
}

function normalizeMenuItem(raw = {}, index = 0) {
  const name = asString(raw.name || raw.itemName);
  if (!name) return null;
  const category = asString(raw.category, "main").toLowerCase();
  const status = asString(raw.status, "regular").toLowerCase();
  const marginBand = asString(raw.marginBand, "").toLowerCase();
  const priceCents = parsePriceCentsFromRaw(raw);
  const displayPriceRaw = asString(raw.displayPrice);
  const sectionTitle = asString(raw.sectionTitle).slice(0, 80);
  const item = {
    id: asString(raw.id, `menu_item_${Date.now()}_${index}`),
    name,
    category: ["starter", "main", "drink", "dessert"].includes(category) ? category : "main",
    ...(sectionTitle ? { sectionTitle } : {}),
    status: ["best_seller", "slow_mover", "regular"].includes(status) ? status : "regular",
    marginBand: ["high", "medium", "low"].includes(marginBand) ? marginBand : "",
    note: asString(raw.note),
    imageAssetId: asString(raw.imageAssetId),
    imageUrl: asString(raw.imageUrl),
    foodType: normalizeFoodTypeSlug(raw.foodType),
    meatType: normalizeMeatTypeSlug(raw.meatType),
    dietaryHalal: truthyDiet(raw.dietaryHalal),
    dietaryContainsEgg: truthyDiet(raw.dietaryContainsEgg),
    dietaryDairyFree: truthyDiet(raw.dietaryDairyFree),
    priceCents,
    displayPrice: displayPriceRaw || displayPriceFromCents(priceCents),
    updatedAt: asString(raw.updatedAt, new Date().toISOString()),
  };
  return item;
}

function normalizeRestaurantFoodProfile(raw) {
  if (!raw || typeof raw !== "object") {
    return { type: "unspecified", meatType: "", dietaryFlags: { halal: false, containsEgg: false, dairyFree: false } };
  }
  return {
    type: normalizeFoodTypeSlug(raw.type),
    meatType: normalizeMeatTypeSlug(raw.meatType),
    dietaryFlags: {
      halal: truthyDiet(raw.dietaryFlags?.halal ?? raw.halal),
      containsEgg: truthyDiet(raw.dietaryFlags?.containsEgg ?? raw.containsEgg),
      dairyFree: truthyDiet(raw.dietaryFlags?.dairyFree ?? raw.dairyFree),
    },
  };
}

function normalizeMenuItems(list = []) {
  if (!Array.isArray(list)) return [];
  return list
    .map((raw, index) => normalizeMenuItem(raw, index))
    .filter(Boolean)
    .slice(0, 50);
}

function buildMenuSignalsSummary(menuItems = []) {
  const summary = {
    totalItems: 0,
    bestSellerCount: 0,
    slowMoverCount: 0,
    withImageCount: 0,
    highMarginCount: 0,
  };
  menuItems.forEach((item) => {
    summary.totalItems += 1;
    if (item.status === "best_seller") summary.bestSellerCount += 1;
    if (item.status === "slow_mover") summary.slowMoverCount += 1;
    if (item.imageAssetId || item.imageUrl) summary.withImageCount += 1;
    if (item.marginBand === "high") summary.highMarginCount += 1;
  });
  return summary;
}

function getOwnerProfile(data, requestedStore = "") {
  const profiles = data.ownerProfiles && typeof data.ownerProfiles === "object" ? data.ownerProfiles : {};
  if (requestedStore && profiles[requestedStore]) {
    const saved = profiles[requestedStore];
    const restaurantName = String(saved.restaurantName || "Your Restaurant");
    return {
      storeId: requestedStore,
      restaurantName,
      restaurantLocation: saved.restaurantLocation || "Primary location",
      logoAsset: saved.logoAsset || "",
      businessType: saved.businessType || "casual_restaurant",
      cuisineType: saved.cuisineType || "",
      category: saved.category || "",
      businessHours: saved.businessHours || "",
      brandTone: saved.brandTone || "",
      menuItems: normalizeMenuItems(saved.menuItems),
      menuSignalsSummary: buildMenuSignalsSummary(normalizeMenuItems(saved.menuItems)),
      peakHours: Array.isArray(saved.peakHours) ? saved.peakHours : [],
      slowHours: Array.isArray(saved.slowHours) ? saved.slowHours : [],
      busiestDays: Array.isArray(saved.busiestDays) ? saved.busiestDays : [],
      primaryGoal: asString(saved.primaryGoal),
      audiencePrimary: normalizeAudiencePrimary(saved.audiencePrimary),
      menuImportedAt: saved.menuImportedAt || null,
      restaurantFoodProfile: normalizeRestaurantFoodProfile(saved.restaurantFoodProfile),
      businessInitials: initialsForName(restaurantName),
      updatedAt: saved.updatedAt || null,
      fulfillmentModes: Array.isArray(saved.fulfillmentModes) && saved.fulfillmentModes.length
        ? saved.fulfillmentModes.map((m) => String(m).toLowerCase()).filter((m) => m === "pickup" || m === "delivery")
        : ["pickup"],
      defaultFulfillment: saved.defaultFulfillment === "delivery" ? "delivery" : "pickup",
      brandId: pickBrandId({}, saved, restaurantName),
      locationId: pickLocationId({}, saved),
      profileRevision: Number(saved.profileRevision) || 0,
      profileChangeLog: Array.isArray(saved.profileChangeLog) ? saved.profileChangeLog.slice(-20) : [],
    };
  }

  const candidates = (Array.isArray(data.offers) ? data.offers : [])
    .filter((offer) => String(offer.restaurant || "").trim());
  const scoped = requestedStore
    ? candidates.filter((offer) => offer.store === requestedStore || offer.storeId === requestedStore)
    : candidates;
  const pool = scoped.length ? scoped : candidates;
  const sorted = [...pool].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  const latest = sorted[0] || null;

  if (!latest) {
    return {
      storeId: requestedStore || "store123",
      restaurantName: "Your Restaurant",
      restaurantLocation: "Primary location",
      logoAsset: "",
      businessType: "casual_restaurant",
      cuisineType: "",
      category: "",
      businessHours: "",
      brandTone: "",
      menuItems: [],
      menuSignalsSummary: buildMenuSignalsSummary([]),
      audiencePrimary: "general",
      restaurantFoodProfile: normalizeRestaurantFoodProfile(null),
      businessInitials: "YR",
      fulfillmentModes: ["pickup"],
      defaultFulfillment: "pickup",
      brandId: "",
      locationId: "primary",
      profileRevision: 0,
      profileChangeLog: [],
    };
  }

  return {
    storeId: latest.storeId || latest.store || requestedStore || "store123",
    restaurantName: latest.restaurant || "Your Restaurant",
    restaurantLocation: latest.restaurantLocation || "Primary location",
    logoAsset: latest.logoAsset || "",
    businessType: latest.businessType || "casual_restaurant",
    cuisineType: latest.cuisineType || "",
    category: latest.category || "",
    businessHours: latest.businessHours || "",
    brandTone: latest.brandTone || "",
    primaryGoal: asString(latest.primaryGoal),
    menuItems: [],
    menuSignalsSummary: buildMenuSignalsSummary([]),
    audiencePrimary: normalizeAudiencePrimary(latest.audiencePrimary),
    restaurantFoodProfile: normalizeRestaurantFoodProfile(null),
    businessInitials: initialsForName(latest.restaurant || "Your Restaurant"),
    fulfillmentModes: ["pickup"],
    defaultFulfillment: "pickup",
    brandId: pickBrandId({}, { brandId: latest.brandId }, latest.restaurant || "Your Restaurant"),
    locationId: pickLocationId({}, { locationId: latest.locationId }),
    profileRevision: 0,
    profileChangeLog: [],
  };
}

const PROFILE_CHANGE_TRACK_KEYS = [
  "restaurantName",
  "restaurantLocation",
  "logoAsset",
  "category",
  "businessType",
  "cuisineType",
  "businessHours",
  "brandTone",
  "menuItems",
  "peakHours",
  "slowHours",
  "busiestDays",
  "primaryGoal",
  "audiencePrimary",
  "menuImportedAt",
  "restaurantFoodProfile",
  "fulfillmentModes",
  "defaultFulfillment",
  "brandId",
  "locationId",
];

const PROFILE_JSON_COMPARE_KEYS = new Set([
  "menuItems",
  "restaurantFoodProfile",
  "peakHours",
  "slowHours",
  "busiestDays",
  "fulfillmentModes",
]);

function listProfileFieldsChanged(payload, prev) {
  const changed = [];
  const p = prev || {};
  for (const k of PROFILE_CHANGE_TRACK_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(payload, k)) continue;
    const a = payload[k];
    const b = p[k];
    if (PROFILE_JSON_COMPARE_KEYS.has(k)) {
      if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) changed.push(k);
    } else if (String(a ?? "") !== String(b ?? "")) {
      changed.push(k);
    }
  }
  return changed;
}

function mergeProfileChangeTracking(payload, rawSaved) {
  const changed = listProfileFieldsChanged(payload, rawSaved || {});
  const prevRev = Number(rawSaved.profileRevision) || 0;
  const prevLog = Array.isArray(rawSaved.profileChangeLog) ? rawSaved.profileChangeLog.slice() : [];
  if (changed.length === 0) {
    return { profileRevision: prevRev, profileChangeLog: prevLog };
  }
  prevLog.push({ at: new Date().toISOString(), changed });
  while (prevLog.length > 40) prevLog.shift();
  return { profileRevision: prevRev + 1, profileChangeLog: prevLog };
}

function updateOwnerProfile(data, store, payload = {}) {
  const storeId = String(store || "").trim();
  if (!storeId) {
    const error = new Error("store is required");
    error.statusCode = 400;
    throw error;
  }
  if (!data.ownerProfiles || typeof data.ownerProfiles !== "object") {
    data.ownerProfiles = {};
  }
  const rawSaved = data.ownerProfiles[storeId] || {};
  const current = getOwnerProfile(data, storeId);
  const restaurantName = String(payload.restaurantName || current.restaurantName || "").trim() || "Your Restaurant";
  const brandId = pickBrandId(payload, rawSaved, restaurantName);
  const locationId = pickLocationId(payload, rawSaved);
  const menuItems = normalizeMenuItems(Array.isArray(payload.menuItems) ? payload.menuItems : current.menuItems);
  const { profileRevision, profileChangeLog } = mergeProfileChangeTracking(payload, rawSaved);
  const next = {
    storeId,
    restaurantName,
    restaurantLocation: String(payload.restaurantLocation || current.restaurantLocation || "").trim() || "Primary location",
    logoAsset: String(payload.logoAsset || current.logoAsset || "").trim(),
    businessType: String(payload.businessType || current.businessType || "").trim() || "casual_restaurant",
    cuisineType: String(payload.cuisineType || current.cuisineType || "").trim(),
    category: String(payload.category || current.category || "").trim(),
    businessHours: String(payload.businessHours || current.businessHours || "").trim(),
    brandTone: String(payload.brandTone || current.brandTone || "").trim(),
    menuItems,
    menuSignalsSummary: buildMenuSignalsSummary(menuItems),
    peakHours: Array.isArray(payload.peakHours) ? payload.peakHours : (current.peakHours || []),
    slowHours: Array.isArray(payload.slowHours) ? payload.slowHours : (current.slowHours || []),
    busiestDays: Array.isArray(payload.busiestDays) ? payload.busiestDays : (current.busiestDays || []),
    primaryGoal: asString(payload.primaryGoal || current.primaryGoal),
    audiencePrimary: normalizeAudiencePrimary(
      payload.audiencePrimary !== undefined && payload.audiencePrimary !== null
        ? payload.audiencePrimary
        : current.audiencePrimary,
    ),
    menuImportedAt: payload.menuImportedAt || current.menuImportedAt || null,
    restaurantFoodProfile: payload.restaurantFoodProfile !== undefined
      ? normalizeRestaurantFoodProfile(payload.restaurantFoodProfile)
      : normalizeRestaurantFoodProfile(current.restaurantFoodProfile),
    fulfillmentModes: Array.isArray(payload.fulfillmentModes) && payload.fulfillmentModes.length
      ? payload.fulfillmentModes.map((m) => String(m).toLowerCase()).filter((m) => m === "pickup" || m === "delivery")
      : (Array.isArray(current.fulfillmentModes) && current.fulfillmentModes.length ? current.fulfillmentModes : ["pickup"]),
    defaultFulfillment: payload.defaultFulfillment === "delivery" ? "delivery" : (current.defaultFulfillment || "pickup"),
    brandId,
    locationId,
    profileRevision,
    profileChangeLog,
    updatedAt: new Date().toISOString(),
  };
  data.ownerProfiles[storeId] = next;
  return {
    ...next,
    businessInitials: initialsForName(next.restaurantName),
  };
}

/** Public store key: lowercase, digits, hyphens; 3–48 chars; no leading/trailing hyphen. */
function normalizeStoreIdSlug(raw) {
  let s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (s.length > 48) s = s.slice(0, 48).replace(/-+$/g, "");
  if (s.length < 3 || s.length > 48) return "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) return "";
  return s;
}

function hasExplicitString(payload, key) {
  return (
    payload &&
    payload[key] !== undefined &&
    payload[key] !== null &&
    String(payload[key]).trim() !== ""
  );
}

function pickBrandId(payload, rawSaved, restaurantName) {
  if (hasExplicitString(payload, "brandId")) {
    const n = normalizeStoreIdSlug(payload.brandId);
    if (n) return n;
  }
  if (rawSaved && rawSaved.brandId != null && String(rawSaved.brandId).trim()) {
    const n = normalizeStoreIdSlug(rawSaved.brandId);
    if (n) return n;
  }
  return normalizeStoreIdSlug(restaurantName) || "";
}

function pickLocationId(payload, rawSaved) {
  if (hasExplicitString(payload, "locationId")) {
    const n = normalizeStoreIdSlug(payload.locationId);
    if (n) return n;
  }
  if (rawSaved && rawSaved.locationId != null && String(rawSaved.locationId).trim()) {
    const n = normalizeStoreIdSlug(rawSaved.locationId);
    if (n) return n;
  }
  return "primary";
}

/**
 * Move owner profile + same-store offers/redemptions to a new store key.
 * Updates embedded qrAssetUrl query params when they reference the old store.
 */
function rekeyOwnerStore(data, fromStore, toStore) {
  const from = String(fromStore || "").trim();
  const to = normalizeStoreIdSlug(toStore);
  if (!from || !to) {
    const err = new Error("Invalid store ID");
    err.statusCode = 400;
    throw err;
  }
  if (from === to) return;
  if (!data.ownerProfiles || typeof data.ownerProfiles !== "object") {
    data.ownerProfiles = {};
  }
  if (!data.ownerProfiles[from]) {
    const err = new Error(
      "No saved profile for this store ID. Save your profile once, then you can change the ID.",
    );
    err.statusCode = 404;
    throw err;
  }
  if (data.ownerProfiles[to]) {
    const err = new Error("That store ID is already in use. Pick another.");
    err.statusCode = 409;
    throw err;
  }
  const prof = data.ownerProfiles[from];
  delete data.ownerProfiles[from];
  prof.storeId = to;
  data.ownerProfiles[to] = prof;

  const offers = Array.isArray(data.offers) ? data.offers : [];
  offers.forEach((o) => {
    const st = String(o.store || "").trim();
    const sid = String(o.storeId || "").trim();
    if (st === from || sid === from) {
      o.store = to;
      o.storeId = to;
    }
    if (typeof o.qrAssetUrl === "string" && o.qrAssetUrl.includes(`store=${from}`)) {
      o.qrAssetUrl = o.qrAssetUrl.split(`store=${from}`).join(`store=${to}`);
    }
  });

  const reds = Array.isArray(data.redemptions) ? data.redemptions : [];
  reds.forEach((r) => {
    if (String(r.store || "").trim() === from) {
      r.store = to;
    }
  });
}

module.exports = {
  getOwnerProfile,
  updateOwnerProfile,
  normalizeAudiencePrimary,
  normalizeStoreIdSlug,
  rekeyOwnerStore,
  AUDIENCE_PRIMARY_SLUGS: Array.from(AUDIENCE_PRIMARY_SLUGS),
};
