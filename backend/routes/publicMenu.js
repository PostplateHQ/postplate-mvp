/**
 * Public read-only menu for customer order flow (no owner PII).
 */

const CATEGORY_LABELS = {
  starter: { id: "starter", name: "Starters", accent: "violet" },
  main: { id: "main", name: "Mains", accent: "coral" },
  drink: { id: "drink", name: "Drinks", accent: "teal" },
  dessert: { id: "dessert", name: "Desserts", accent: "rose" },
};

function stripNamePriceSuffix(name) {
  const s = String(name || "").trim();
  const parts = s.split(/\s+[—–-]\s+/);
  if (parts.length >= 2 && /\$|₹|\d/.test(parts[parts.length - 1])) {
    return parts.slice(0, -1).join(" — ").trim() || s;
  }
  return s;
}

/** Remove trailing "· Price: $10" often pasted into notes; price belongs in priceCents. */
function stripNotePriceSuffix(note) {
  return String(note || "")
    .replace(/\s*[·•]\s*Price:\s*\$?\s*[\d,.]+\s*$/i, "")
    .trim();
}

function parsePriceCentsFromNote(note) {
  const m = String(note || "").match(/\bPrice:\s*\$?\s*([\d,]+\.?[\d]*)\s*$/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function slugGuestSectionId(label) {
  const s = String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
  return s || "menu";
}

function publicMenuItemFromOwnerItem(item) {
  const tags = [];
  if (item.category === "main") tags.push("main");
  if (item.category === "drink") tags.push("drink");
  if (item.category === "starter") tags.push("side");
  if (item.category === "dessert") tags.push("dessert");
  const rawNote = String(item.note || "");
  let priceCents = item.priceCents != null && Number.isFinite(Number(item.priceCents)) ? Math.round(Number(item.priceCents)) : null;
  if (priceCents == null) {
    const fromNote = parsePriceCentsFromNote(rawNote);
    if (fromNote != null) priceCents = fromNote;
  }
  const description = stripNotePriceSuffix(rawNote).slice(0, 240);
  const price = priceCents != null ? priceCents / 100 : null;
  const displayPrice =
    String(item.displayPrice || "").trim() ||
    (priceCents != null ? `$${(priceCents / 100).toFixed(2)}` : "");
  return {
    id: item.id,
    name: stripNamePriceSuffix(item.name),
    displayPrice,
    price,
    priceCents: priceCents != null ? priceCents : null,
    category: item.category,
    categoryId: item.category,
    imageUrl: item.imageUrl || "",
    description,
    tags,
    offerEligibleTag: item.status === "best_seller" ? "featured" : "",
    sectionTitle: String(item.sectionTitle || "").trim().slice(0, 80),
  };
}

const GUEST_SECTION_ACCENTS = ["violet", "coral", "teal", "rose"];

/** Assign display `categoryId` per item and build ordered section chips (pastas, sharables, …). */
function buildGuestMenuSections(menuItems) {
  const order = [];
  const meta = new Map();

  for (let i = 0; i < menuItems.length; i += 1) {
    const it = menuItems[i];
    const st = String(it.sectionTitle || "").trim();
    const baseCat = it.category;
    const fallbackName = CATEGORY_LABELS[baseCat] ? CATEGORY_LABELS[baseCat].name : "Menu";
    const displayName = st || fallbackName;
    const key = st ? `s_${slugGuestSectionId(st)}` : `c_${baseCat}`;
    if (!meta.has(key)) {
      meta.set(key, {
        name: displayName,
        accent: GUEST_SECTION_ACCENTS[meta.size % GUEST_SECTION_ACCENTS.length],
      });
      order.push(key);
    }
    it.categoryId = key;
  }

  const categories = order.map((id) => ({
    id,
    name: meta.get(id).name,
    accent: meta.get(id).accent,
  }));

  return { categories, menuItems };
}

function registerPublicMenuRoutes(app, deps) {
  const { loadData, getOwnerProfile, getOfferById } = deps;

  app.get("/api/public/menu", (req, res) => {
    const store = String(req.query.store || "").trim();
    res.set("Cache-Control", "private, max-age=60");

    if (!store) {
      return res.status(400).json({ success: false, error: "store is required" });
    }

    const data = loadData();
    const profile = getOwnerProfile(data, store);
    const rawItems = Array.isArray(profile.menuItems) ? profile.menuItems : [];
    const mapped = rawItems.map(publicMenuItemFromOwnerItem);
    const { categories, menuItems } = buildGuestMenuSections(mapped);

    let offer = null;
    const offerId = String(req.query.offerId || "").trim();
    if (offerId && typeof getOfferById === "function") {
      const off = getOfferById(data, offerId);
      if (off) {
        const offStore = String(off.store || off.storeId || "").trim();
        if (!offStore || offStore === store) {
          const pct = Number(off.discountValue ?? off.rewardValue);
          offer = {
            title: `You're in — ${off.name || "today's offer"}`,
            sub: String(off.termsText || off.terms || "").slice(0, 200) || null,
            percentOff: Number.isFinite(pct) && pct > 0 ? Math.min(100, pct) : 10,
            eligibleTag: "featured",
          };
        }
      }
    }

    const logo = String(profile.logoAsset || "").trim();
    const logoUrl = /^https?:\/\//i.test(logo) || logo.startsWith("data:") ? logo : "";

    res.json({
      success: true,
      storeId: profile.storeId,
      brandId: profile.brandId || "",
      locationId: profile.locationId || "primary",
      restaurantName: profile.restaurantName,
      logoUrl,
      businessInitials: profile.businessInitials || "PP",
      fulfillmentModes: profile.fulfillmentModes || ["pickup"],
      defaultFulfillment: profile.defaultFulfillment || "pickup",
      categories,
      menuItems,
      offer,
      message: menuItems.length === 0 ? "Menu is being set up. Please check back soon." : null,
    });
  });
}

module.exports = {
  registerPublicMenuRoutes,
  publicMenuItemFromOwnerItem,
  buildGuestMenuSections,
};
