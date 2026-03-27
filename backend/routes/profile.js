function registerProfileRoutes(app, deps) {
  const {
    loadData,
    saveData,
    getOwnerProfile,
    updateOwnerProfile,
  } = deps;

  app.get("/owner/profile", (req, res) => {
    const data = loadData();
    const store = String(req.query.store || "").trim();
    const profile = getOwnerProfile(data, store);
    res.json({ success: true, profile });
  });

  app.put("/owner/profile", (req, res) => {
    try {
      const store = String(req.query.store || req.body?.storeId || "").trim();
      const data = loadData();
      const profile = updateOwnerProfile(data, store, req.body || {});
      saveData(data);
      return res.json({ success: true, profile });
    } catch (error) {
      const code = Number(error.statusCode) || 400;
      return res.status(code).json({ error: error.message || "failed to update owner profile" });
    }
  });
}

module.exports = { registerProfileRoutes };
