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

function publicMenuItemFromOwnerItem(item) {
  const tags = [];
  if (item.category === "main") tags.push("main");
  if (item.category === "drink") tags.push("drink");
  if (item.category === "starter") tags.push("side");
  if (item.category === "dessert") tags.push("dessert");
  const price = item.priceCents != null ? item.priceCents / 100 : null;
  const displayPrice =
    item.displayPrice ||
    (item.priceCents != null ? `$${(item.priceCents / 100).toFixed(2)}` : "");
  return {
    id: item.id,
    name: stripNamePriceSuffix(item.name),
    displayPrice,
    price,
    priceCents: item.priceCents != null ? item.priceCents : null,
    category: item.category,
    categoryId: item.category,
    imageUrl: item.imageUrl || "",
    description: String(item.note || "").slice(0, 240),
    tags,
    offerEligibleTag: item.status === "best_seller" ? "featured" : "",
  };
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
    const menuItems = rawItems.map(publicMenuItemFromOwnerItem);

    const catOrder = ["starter", "main", "drink", "dessert"];
    const present = new Set(menuItems.map((m) => m.category));
    const categories = catOrder.filter((c) => present.has(c)).map((c) => CATEGORY_LABELS[c]);

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

module.exports = { registerPublicMenuRoutes, publicMenuItemFromOwnerItem };
