/**
 * In-memory data + minimal Express app for black-box API tests (no mutations to repo data.json).
 */
const express = require("express");
const QRCode = require("qrcode");
const { getOwnerProfile, updateOwnerProfile } = require("../../backend/services/ownerProfile");
const { getOfferById } = require("../../backend/services/offersDomain");
const { registerInternalRoutes } = require("../../backend/routes/internal");
const { registerProfileRoutes } = require("../../backend/routes/profile");
const { registerPublicMenuRoutes } = require("../../backend/routes/publicMenu");
const { registerQrRoutes } = require("../../backend/routes/qr");
const { registerOrderGuestPublicRoutes } = require("../../backend/routes/orderGuestPublic");
const { resolveOwnerStoreFromRequest } = require("../../backend/lib/postplateSession");

function createMemoryStore(seed = {}) {
  const state = {
    offers: Array.isArray(seed.offers) ? seed.offers : [],
    redemptions: Array.isArray(seed.redemptions) ? seed.redemptions : [],
    offerEvents: Array.isArray(seed.offerEvents) ? seed.offerEvents : [],
    ownerProfiles:
      seed.ownerProfiles && typeof seed.ownerProfiles === "object" ? { ...seed.ownerProfiles } : {},
  };
  return {
    loadData: () => state,
    saveData: (d) => {
      state.offers = d.offers || [];
      state.redemptions = d.redemptions || [];
      state.offerEvents = d.offerEvents || [];
      state.ownerProfiles = d.ownerProfiles && typeof d.ownerProfiles === "object" ? d.ownerProfiles : {};
    },
    getState: () => state,
  };
}

function buildOwnerMenuQrApp(seed) {
  const { loadData, saveData } = createMemoryStore(seed);
  const app = express();
  app.use(express.json());

  const boundGetOfferById = (data, offerId) => getOfferById(data, offerId);

  registerInternalRoutes(app, { loadData, saveData, getOwnerProfile, updateOwnerProfile });
  registerProfileRoutes(app, {
    loadData,
    saveData,
    getOwnerProfile,
    updateOwnerProfile,
    resolveOwnerStore: resolveOwnerStoreFromRequest,
  });
  registerPublicMenuRoutes(app, {
    loadData,
    getOwnerProfile,
    getOfferById: boundGetOfferById,
  });
  registerQrRoutes(app, {
    QRCode,
    loadData,
    getOfferById: boundGetOfferById,
    getOwnerProfile,
  });
  registerOrderGuestPublicRoutes(app);

  return { app, loadData, saveData };
}

async function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

function baseUrl(server) {
  const addr = server.address();
  return `http://${addr.address}:${addr.port}`;
}

module.exports = {
  createMemoryStore,
  buildOwnerMenuQrApp,
  listen,
  baseUrl,
};
