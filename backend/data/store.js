const fs = require("fs");

function createDataStore(deps) {
  const {
    dataPath,
    normalizeOffer,
    normalizeRedemption,
    normalizeOfferEvent,
    createOfferSlug,
    generateOfferId,
  } = deps;

  function defaultData() {
    return { offers: [], redemptions: [], offerEvents: [], ownerProfiles: {} };
  }

  function inferOffersFromRedemptions(redemptions) {
    const seen = new Map();

    redemptions.forEach((item) => {
      if (!item.store || !item.offer) {
        return;
      }

      const key = createOfferSlug(item.store, item.offer);
      const existing = seen.get(key);
      if (existing) {
        if (new Date(item.createdAt || 0) > new Date(existing.updatedAt || 0)) {
          existing.restaurant = item.restaurant || existing.restaurant;
          existing.createdAt = existing.createdAt || item.createdAt;
          existing.updatedAt = item.createdAt || existing.updatedAt;
        }
        return;
      }

      seen.set(key, normalizeOffer({
        id: generateOfferId(),
        store: item.store,
        restaurant: item.restaurant || "",
        name: item.offer,
        reward: item.offer,
        captureEmail: true,
        captureName: false,
        reminderOn: true,
        status: "paused",
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
      }));
    });

    const inferredOffers = [...seen.values()];
    const latestActiveByStore = new Map();

    inferredOffers.forEach((offer) => {
      const current = latestActiveByStore.get(offer.store);
      if (!current || new Date(offer.updatedAt) > new Date(current.updatedAt)) {
        latestActiveByStore.set(offer.store, offer);
      }
    });

    inferredOffers.forEach((offer) => {
      if (latestActiveByStore.get(offer.store)?.id === offer.id) {
        offer.status = "active";
      }
    });

    return inferredOffers;
  }

  function createOfferLookup(offers) {
    const byId = new Map();
    const byStoreAndName = new Map();

    offers.forEach((offer) => {
      byId.set(offer.id, offer);
      byStoreAndName.set(createOfferSlug(offer.store, offer.name), offer);
    });

    return { byId, byStoreAndName };
  }

  function loadData() {
    if (!fs.existsSync(dataPath)) {
      fs.writeFileSync(dataPath, JSON.stringify(defaultData(), null, 2));
    }

    const raw = fs.readFileSync(dataPath, "utf8").trim();
    if (!raw) {
      return defaultData();
    }

    try {
      const parsed = JSON.parse(raw);
      const rawRedemptions = Array.isArray(parsed.redemptions) ? parsed.redemptions : [];
      const normalizedOffers = Array.isArray(parsed.offers)
        ? parsed.offers.map(normalizeOffer)
        : inferOffersFromRedemptions(rawRedemptions);
      const offerLookup = createOfferLookup(normalizedOffers);

      return {
        offers: normalizedOffers,
        redemptions: rawRedemptions.map((item) => normalizeRedemption(item, offerLookup)),
        offerEvents: Array.isArray(parsed.offerEvents) ? parsed.offerEvents.map(normalizeOfferEvent) : [],
        ownerProfiles: parsed.ownerProfiles && typeof parsed.ownerProfiles === "object" ? parsed.ownerProfiles : {},
      };
    } catch (_error) {
      return defaultData();
    }
  }

  function saveData(data) {
    fs.writeFileSync(dataPath, JSON.stringify({
      offers: data.offers || [],
      redemptions: data.redemptions || [],
      offerEvents: data.offerEvents || [],
      ownerProfiles: data.ownerProfiles && typeof data.ownerProfiles === "object" ? data.ownerProfiles : {},
    }, null, 2));
  }

  return {
    loadData,
    saveData,
  };
}

module.exports = { createDataStore };
