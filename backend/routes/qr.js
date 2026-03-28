function firstQueryParam(query, name) {
  const v = query[name];
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return String(v[v.length - 1] ?? "");
  return String(v);
}

/**
 * Menu / ordering QR: only `store` is required (matches dashboard ownerProfiles key).
 * Used by GET /api/qr/menu-order and GET /qr?menuOnly=1
 */
async function handleMenuOrderQr(req, res, deps) {
  const { QRCode, loadData, getOfferById, getOwnerProfile } = deps;
  const store = String(firstQueryParam(req.query, "store")).trim();
  let offerId = String(firstQueryParam(req.query, "offerId")).trim();

  if (!store) {
    return res.status(400).json({
      error: "store is required",
      hint: "Use the same Store ID as in the dashboard (owner profile).",
    });
  }

  if (offerId && typeof getOfferById === "function") {
    const data = loadData();
    const savedOffer = getOfferById(data, offerId);
    if (!savedOffer) {
      offerId = "";
    } else {
      const offStore = String(savedOffer.store || savedOffer.storeId || "").trim();
      if (offStore && offStore !== store) {
        return res.status(400).json({
          error: "offerId does not belong to this store",
        });
      }
    }
  }

  const host = `${req.protocol}://${req.get("host")}`;
  const qs = new URLSearchParams({ store });
  if (offerId) qs.set("offerId", offerId);
  const menuOrderUrl = `${host}/menu-intro.html?${qs.toString()}`;

  try {
    const menuOrderQrDataUrl = await QRCode.toDataURL(menuOrderUrl, {
      width: 320,
      margin: 2,
    });
    let restaurantHint = "";
    if (typeof getOwnerProfile === "function") {
      const profile = getOwnerProfile(loadData(), store);
      restaurantHint = String(profile.restaurantName || "").trim();
    }
    return res.json({
      success: true,
      menuOnly: true,
      store,
      restaurantHint,
      menuOrderUrl,
      menuOrderQrDataUrl,
    });
  } catch (error) {
    return res.status(500).json({ error: "failed to generate QR code" });
  }
}

function registerQrRoutes(app, deps) {
  const {
    QRCode,
    loadData,
    getOfferById,
    getOwnerProfile,
  } = deps;

  const menuDeps = { QRCode, loadData, getOfferById, getOwnerProfile };

  /** Explicit API path — avoids any ambiguity with static files on `/qr`. */
  app.get("/api/qr/menu-order", (req, res) => handleMenuOrderQr(req, res, menuDeps));

  app.get("/qr", async (req, res) => {
    const menuOnlyRaw =
      firstQueryParam(req.query, "menuOnly").toLowerCase() ||
      firstQueryParam(req.query, "mode").toLowerCase();
    const menuOnly =
      menuOnlyRaw === "1" ||
      menuOnlyRaw === "true" ||
      menuOnlyRaw === "menu";

    if (menuOnly) {
      return handleMenuOrderQr(req, res, menuDeps);
    }

    let {
      store = "",
      restaurant = "",
      offer = "",
      offerId = "",
    } = req.query;

    store = firstQueryParam(req.query, "store") || store;
    restaurant = firstQueryParam(req.query, "restaurant") || restaurant;
    offer = firstQueryParam(req.query, "offer") || offer;
    offerId = firstQueryParam(req.query, "offerId") || offerId;

    if (offerId) {
      const data = loadData();
      const savedOffer = getOfferById(data, offerId);
      if (!savedOffer) {
        return res.status(404).json({ error: "offer not found" });
      }
      store = savedOffer.store;
      restaurant = savedOffer.restaurant;
      offer = savedOffer.name;
    }

    if (!store || !restaurant || !offer) {
      return res.status(400).json({
        error: "store, restaurant, and offer are required",
      });
    }

    const redeemUrl =
      `${req.protocol}://${req.get("host")}/redeem` +
      `?store=${encodeURIComponent(store)}` +
      `&restaurant=${encodeURIComponent(restaurant)}` +
      `&offer=${encodeURIComponent(offer)}` +
      (offerId ? `&offerId=${encodeURIComponent(offerId)}` : "");

    const menuOrderUrl =
      `${req.protocol}://${req.get("host")}/menu-intro.html` +
      `?store=${encodeURIComponent(store)}` +
      `&restaurant=${encodeURIComponent(restaurant)}` +
      `&offer=${encodeURIComponent(offer)}` +
      (offerId ? `&offerId=${encodeURIComponent(offerId)}` : "");

    try {
      const [qrDataUrl, menuOrderQrDataUrl] = await Promise.all([
        QRCode.toDataURL(redeemUrl, { width: 320, margin: 2 }),
        QRCode.toDataURL(menuOrderUrl, { width: 320, margin: 2 }),
      ]);

      res.json({
        success: true,
        redeemUrl,
        qrDataUrl,
        menuOrderUrl,
        menuOrderQrDataUrl,
      });
    } catch (error) {
      res.status(500).json({ error: "failed to generate QR code" });
    }
  });
}

module.exports = { registerQrRoutes, handleMenuOrderQr, firstQueryParam };
