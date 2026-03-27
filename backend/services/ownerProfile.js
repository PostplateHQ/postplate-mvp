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

function normalizeMenuItem(raw = {}, index = 0) {
  const name = asString(raw.name || raw.itemName);
  if (!name) return null;
  const category = asString(raw.category, "main").toLowerCase();
  const status = asString(raw.status, "regular").toLowerCase();
  const marginBand = asString(raw.marginBand, "").toLowerCase();
  const item = {
    id: asString(raw.id, `menu_item_${Date.now()}_${index}`),
    name,
    category: ["starter", "main", "drink", "dessert"].includes(category) ? category : "main",
    status: ["best_seller", "slow_mover", "regular"].includes(status) ? status : "regular",
    marginBand: ["high", "medium", "low"].includes(marginBand) ? marginBand : "",
    note: asString(raw.note),
    imageAssetId: asString(raw.imageAssetId),
    imageUrl: asString(raw.imageUrl),
    updatedAt: asString(raw.updatedAt, new Date().toISOString()),
  };
  return item;
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
      businessInitials: initialsForName(restaurantName),
      updatedAt: saved.updatedAt || null,
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
      businessInitials: "YR",
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
    businessInitials: initialsForName(latest.restaurant || "Your Restaurant"),
  };
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
  const current = getOwnerProfile(data, storeId);
  const restaurantName = String(payload.restaurantName || current.restaurantName || "").trim() || "Your Restaurant";
  const menuItems = normalizeMenuItems(Array.isArray(payload.menuItems) ? payload.menuItems : current.menuItems);
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
    updatedAt: new Date().toISOString(),
  };
  data.ownerProfiles[storeId] = next;
  return {
    ...next,
    businessInitials: initialsForName(next.restaurantName),
  };
}

module.exports = {
  getOwnerProfile,
  updateOwnerProfile,
  normalizeAudiencePrimary,
  AUDIENCE_PRIMARY_SLUGS: Array.from(AUDIENCE_PRIMARY_SLUGS),
};
