function registerLegacyPromoRoutes(app, deps) {
  const {
    listPresetCatalog,
    buildPreview,
  } = deps;

  app.get("/promo/templates", (req, res) => {
    try {
      const presets = listPresetCatalog();
      res.json({ success: true, presets });
    } catch (error) {
      res.status(500).json({ error: "failed to load templates" });
    }
  });

  app.post("/promo/suggestions", (req, res) => {
    try {
      const body = req.body || {};
      const selectedPresetId = body.selectedPresetId || null;
      const designBrief = body.designBrief || {};
      const styleHints = body.styleHints || {};
      const quickHints = [
        styleHints.visualStyle || designBrief.visualStyle || "Minimal Clean",
        styleHints.backgroundMode || designBrief.backgroundMode || "dark",
        styleHints.fontMood || designBrief.fontMood || "bold",
      ];
      res.json({
        success: true,
        suggestions: {
          selectedPresetId,
          quickHints,
          note: "Use /offer-designs/preview for deterministic preview payload.",
        },
      });
    } catch (error) {
      res.status(400).json({ error: error.message || "failed to generate suggestions" });
    }
  });

  app.post("/promo/render", async (req, res) => {
    try {
      const body = req.body || {};
      const selectedPresetId = body.selectedPresetId || body.templateId || null;
      const result = await buildPreview(body.designBrief || body.content || {}, selectedPresetId);

      return res.json({
        success: true,
        selectedPresetId: result.presetId,
        render: result.preview,
        designBrief: result.designBrief,
        providerMeta: result.providerMeta,
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || "render failed", details: error.details || [] });
    }
  });
}

module.exports = { registerLegacyPromoRoutes };
