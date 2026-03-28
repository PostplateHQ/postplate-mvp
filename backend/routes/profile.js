function defaultResolveOwnerStore(req) {
  const q = String(req.query?.store || "").trim();
  if (q) return q;
  const body = req.body && typeof req.body === "object" ? req.body : {};
  return String(body.storeId || "").trim();
}

function registerProfileRoutes(app, deps) {
  const {
    loadData,
    saveData,
    getOwnerProfile,
    updateOwnerProfile,
    resolveOwnerStore = defaultResolveOwnerStore,
  } = deps;

  app.get("/owner/profile", (req, res) => {
    const data = loadData();
    const store = resolveOwnerStore(req);
    const profile = getOwnerProfile(data, store);
    res.json({ success: true, profile });
  });

  app.put("/owner/profile", (req, res) => {
    try {
      const store = resolveOwnerStore(req);
      const data = loadData();
      const body = { ...(req.body || {}) };
      // Store ID is not owner-editable; rekeying is internal/admin only (see rekeyOwnerStore in ownerProfile).
      // Effective store comes from session cookie first, then query/body (see resolveOwnerStore).
      delete body.storeId;

      const profile = updateOwnerProfile(data, store, body);
      saveData(data);
      return res.json({ success: true, profile });
    } catch (error) {
      const code = Number(error.statusCode) || 400;
      return res.status(code).json({ error: error.message || "failed to update owner profile" });
    }
  });
}

module.exports = { registerProfileRoutes };
