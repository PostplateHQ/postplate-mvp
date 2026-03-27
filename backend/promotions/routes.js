const {
  buildPreview,
  createOfferDesignFlow,
  updateOfferDesignFlow,
  listPresetCatalog,
  getOfferDesign,
  listOfferDesigns,
  createAsset,
  getAsset,
  listAssets,
  generateInspirationalQuotes,
  generateImagePromptPack,
  generateCreativePackage,
  createOfferSuggestions,
  regenerateOfferSuggestions,
  buildReviewPayload,
  selectOfferSuggestion,
} = require('./service');

function registerPromotionRoutes(app) {
  app.get('/offer-designs/presets', (_req, res) => {
    const presets = listPresetCatalog();
    res.json({ success: true, presets });
  });

  app.get('/offer-designs/assets', (_req, res) => {
    res.json({ success: true, assets: listAssets() });
  });

  app.post('/offer-designs/assets', (req, res) => {
    const body = req.body || {};
    const asset = createAsset({
      type: body.type || 'image',
      sourceUrl: body.sourceUrl || '',
      optimizedUrl: body.optimizedUrl || body.sourceUrl || '',
      mimeType: body.mimeType || 'image/jpeg',
    });

    res.status(201).json({ success: true, asset });
  });

  app.get('/offer-designs/assets/:id', (req, res) => {
    const asset = getAsset(req.params.id);
    if (!asset) return res.status(404).json({ error: 'asset not found' });
    return res.json({ success: true, asset });
  });

  app.post('/offer-designs/preview', async (req, res) => {
    try {
      const body = req.body || {};
      const result = await buildPreview(
        body.designBrief || {},
        body.selectedPresetId || null,
        body.aiAssist || {},
      );
      return res.json({
        success: true,
        selectedPresetId: result.presetId,
        designBrief: result.designBrief,
        preview: result.preview,
        providerMeta: result.providerMeta,
      });
    } catch (error) {
      const code = Number(error.statusCode) || 400;
      return res.status(code).json({
        error: error.message || 'failed to build preview',
        details: error.details || [],
      });
    }
  });

  app.post('/offer-designs/inspiration', async (req, res) => {
    try {
      const body = req.body || {};
      const result = await generateInspirationalQuotes(body.designBrief || {}, body.aiAssist || {});
      return res.json({ success: true, ...result });
    } catch (error) {
      const code = Number(error.statusCode) || 400;
      return res.status(code).json({
        error: error.message || 'failed to generate inspiration',
        details: error.details || [],
      });
    }
  });

  app.post('/offer-designs/ai-image-prompts', async (req, res) => {
    try {
      const body = req.body || {};
      const result = await generateImagePromptPack(body.designBrief || {}, body.aiAssist || {});
      return res.json({ success: true, ...result });
    } catch (error) {
      const code = Number(error.statusCode) || 400;
      return res.status(code).json({
        error: error.message || 'failed to generate ai image prompts',
        details: error.details || [],
      });
    }
  });

  app.post('/offer-designs/generate-creative', async (req, res) => {
    try {
      const body = req.body || {};
      const result = await generateCreativePackage(body.designBrief || {}, body.aiAssist || {});
      return res.json({ success: true, ...result });
    } catch (error) {
      const code = Number(error.statusCode) || 400;
      return res.status(code).json({
        error: error.message || 'failed to generate creative',
        details: error.details || [],
      });
    }
  });

  app.post('/api/offers/suggestions', async (req, res) => {
    try {
      const result = await createOfferSuggestions(req.body || {});
      const includeDebug = req.query.debug === '1';
      return res.json({
        success: true,
        suggestions: result.suggestions,
        normalizedInput: result.normalizedInput,
        recommendationSummary: result.recommendationSummary || null,
        orchestrator: result.orchestrator || null,
        analyticsTags: result.analyticsTags || {},
        ...(includeDebug ? { debug: result.analysis } : {}),
      });
    } catch (error) {
      const code = Number(error.statusCode) || 400;
      return res.status(code).json({
        error: error.message || 'failed to generate offer suggestions',
        details: error.details || [],
      });
    }
  });

  app.post('/api/offers/select-suggestion', async (req, res) => {
    try {
      const result = await selectOfferSuggestion(req.body || {});
      return res.json({ success: true, ...result });
    } catch (error) {
      const code = Number(error.statusCode) || 400;
      return res.status(code).json({
        error: error.message || 'failed to select suggestion',
        details: error.details || [],
      });
    }
  });

  app.post('/api/offers/regenerate', async (req, res) => {
    try {
      const result = await regenerateOfferSuggestions(req.body || {});
      return res.json({ success: true, ...result });
    } catch (error) {
      const code = Number(error.statusCode) || 400;
      return res.status(code).json({
        error: error.message || 'failed to regenerate suggestions',
        details: error.details || [],
      });
    }
  });

  app.post('/api/offers/review-payload', async (req, res) => {
    try {
      const result = await buildReviewPayload(req.body || {});
      return res.json({ success: true, ...result });
    } catch (error) {
      const code = Number(error.statusCode) || 400;
      return res.status(code).json({
        error: error.message || 'failed to build review payload',
        details: error.details || [],
      });
    }
  });

  app.post('/offer-designs', async (req, res) => {
    try {
      const record = await createOfferDesignFlow(req.body || {});
      return res.status(201).json({ success: true, offerDesign: record });
    } catch (error) {
      const code = Number(error.statusCode) || 400;
      return res.status(code).json({ error: error.message || 'failed to create offer design', details: error.details || [] });
    }
  });

  app.get('/offer-designs', (_req, res) => {
    return res.json({ success: true, offerDesigns: listOfferDesigns() });
  });

  app.get('/offer-designs/:id', (req, res) => {
    const offerDesign = getOfferDesign(req.params.id);
    if (!offerDesign) return res.status(404).json({ error: 'offer design not found' });
    return res.json({ success: true, offerDesign });
  });

  app.patch('/offer-designs/:id', async (req, res) => {
    try {
      const next = await updateOfferDesignFlow(req.params.id, req.body || {});
      if (!next) return res.status(404).json({ error: 'offer design not found' });
      return res.json({ success: true, offerDesign: next });
    } catch (error) {
      const code = Number(error.statusCode) || 400;
      return res.status(code).json({ error: error.message || 'failed to update offer design', details: error.details || [] });
    }
  });
}

module.exports = {
  registerPromotionRoutes,
};
