const { provisionStoreIdentity } = require("../lib/canonicalStoreId");
const { setOwnerStoreSessionCookie, assertInternalProvisionAllowed } = require("../lib/postplateSession");

function registerInternalRoutes(app, deps) {
  const { loadData, saveData, getOwnerProfile, updateOwnerProfile } = deps;

  /**
   * Dev / internal: create a new store row, seed owner profile, set session cookie.
   * Guard: DEV_MODE=true OR Authorization: Bearer POSTPLATE_INTERNAL_TOKEN
   *
   * Body (JSON): restaurantName (display default), optional brandId | brandName (analytics slug on profile only),
   * optional locationCode | locationId (profile location slug), optional locationLabel,
   * optional locationNumber 1–99 (2-digit slot in store id; default 01). Store id is opaque: NN-NNNN (no restaurant name).
   */
  app.post("/api/internal/provision-store", (req, res) => {
    if (!assertInternalProvisionAllowed(req)) {
      return res.status(403).json({ error: "Provisioning is only allowed in dev or with a valid internal token." });
    }
    try {
      const data = loadData();
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const restaurantName = String(body.restaurantName || "Your Restaurant").trim() || "Your Restaurant";
      const { storeId, brandId, locationId } = provisionStoreIdentity(
        restaurantName,
        data.ownerProfiles,
        body,
      );
      const locationLabel = String(body.locationLabel || "").trim();
      const restaurantLocation =
        locationLabel
        || (locationId !== "primary"
          ? String(locationId).replace(/-/g, " ")
          : "Primary location");
      updateOwnerProfile(data, storeId, {
        restaurantName,
        brandId,
        locationId,
        restaurantLocation,
      });
      saveData(data);
      const profile = getOwnerProfile(data, storeId);
      const cookieSet = setOwnerStoreSessionCookie(res, storeId);
      return res.json({
        success: true,
        storeId,
        profile,
        sessionCookieSet: cookieSet,
      });
    } catch (error) {
      const code = Number(error.statusCode) || 500;
      return res.status(code).json({ error: error.message || "provision failed" });
    }
  });
}

module.exports = { registerInternalRoutes };
