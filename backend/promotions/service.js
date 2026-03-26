const { composePoster, listPosterTemplates, loadPresetMap } = require('../../engine/layoutEngine');
const { resolvePresetId } = require('../../engine/styleSystem');
const { createProviderRegistry } = require('../../engine/providerRegistry');
const QRCode = require('qrcode');
const { normalizeDesignBrief, validateDesignBrief } = require('./validation');
const {
  buildSuggestionsResult,
  buildSelectionResult,
} = require('./create-offer-engine');
const {
  createOfferDesign,
  updateOfferDesign,
  getOfferDesign,
  listOfferDesigns,
  createAsset,
  getAsset,
  getAssetsByIds,
  listAssets,
} = require('./store');

const providers = createProviderRegistry();
const STOCK_IMAGE_BY_KEY = {
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
  tacos: 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=1200&q=80',
  pizza: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=1200&q=80',
  bowl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80',
  drinks: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1200&q=80',
  dessert: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1200&q=80',
  default: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=80',
};

function stockKeyForItem(itemName = '') {
  const value = String(itemName || '').toLowerCase();
  if (value.includes('burger')) return 'burger';
  if (value.includes('taco')) return 'tacos';
  if (value.includes('pizza')) return 'pizza';
  if (value.includes('bowl')) return 'bowl';
  if (value.includes('drink') || value.includes('beverage')) return 'drinks';
  if (value.includes('dessert') || value.includes('cake') || value.includes('sweet')) return 'dessert';
  return 'default';
}

async function resolveImageInputs(designBrief, aiAssist = {}) {
  const itemNames = Array.isArray(designBrief.itemNames) && designBrief.itemNames.length
    ? designBrief.itemNames
    : [designBrief.itemName || 'Food item'];

  const idsByItem = designBrief.imageAssetIdsByItem && typeof designBrief.imageAssetIdsByItem === 'object'
    ? designBrief.imageAssetIdsByItem
    : {};

  const allIds = itemNames.flatMap((item) => Array.isArray(idsByItem[item]) ? idsByItem[item] : []).slice(0, 100);
  const assets = getAssetsByIds(allIds);
  const urlById = new Map(assets.map((asset) => [asset.id, asset.optimizedUrl || asset.sourceUrl || '']));

  const catalog = {};
  const sources = {};
  itemNames.forEach((item) => {
    const uploaded = (Array.isArray(idsByItem[item]) ? idsByItem[item] : [])
      .map((id) => String(urlById.get(id) || '').trim())
      .filter(Boolean)
      .slice(0, 5);

    if (uploaded.length) {
      catalog[item] = uploaded;
      sources[item] = 'uploaded';
      return;
    }

    const generated = (aiAssist.generatedImagesByItem && Array.isArray(aiAssist.generatedImagesByItem[item])
      ? aiAssist.generatedImagesByItem[item]
      : [])
      .map((row) => String(row || '').trim())
      .filter(Boolean)
      .slice(0, 5);

    if (generated.length) {
      catalog[item] = generated;
      sources[item] = 'ai-generated';
      return;
    }

    const stock = STOCK_IMAGE_BY_KEY[stockKeyForItem(item)] || STOCK_IMAGE_BY_KEY.default;
    catalog[item] = [stock];
    sources[item] = 'stock-fallback';
  });

  const productImageAssets = itemNames.flatMap((item) => catalog[item] || []).slice(0, 25);
  return {
    itemImageCatalog: catalog,
    productImageAsset: productImageAssets[0] || '',
    productImageAssets,
    sourceByItem: sources,
  };
}

function isAiAssistEnabled(aiAssist = {}) {
  if (!aiAssist || aiAssist.enabled !== true) return false;
  return Boolean(
    aiAssist.enhanceImage
      || aiAssist.generateQuote
      || aiAssist.generatePrompts
      || aiAssist.scorePreview
      || aiAssist.generatePoster,
  );
}

function inspirationalQuoteForBrief(brief, tone = 'balanced') {
  const item = String(brief.itemName || 'dish').toLowerCase();
  const offer = String(brief.offerType || 'special');

  const bank = {
    premium: [
      `Chef-made ${item}, crafted for tonight. ${offer}.`,
      `Small-batch flavor, big-night energy. ${offer}.`,
      `A premium plate worth stepping in for. ${offer}.`,
    ],
    fun: [
      `Good mood starts with great ${item}. ${offer}!`,
      `Bring your crew, we brought the flavor. ${offer}!`,
      `One bite in and your day gets better. ${offer}!`,
    ],
    bold: [
      `Crave now. Bite big. ${offer}.`,
      `Flavor that stops the scroll. ${offer}.`,
      `Come hungry, leave impressed. ${offer}.`,
    ],
    balanced: [
      `Fresh ${item}, made to order. ${offer}.`,
      `Step in for comfort food done right. ${offer}.`,
      `A quick stop, a great meal, a better day. ${offer}.`,
    ],
  };

  const selected = bank[tone] || bank.balanced;
  return selected[Math.floor(Math.random() * selected.length)];
}

function resolveQuoteTone(designBrief, aiAssist = {}) {
  const preferred = String(aiAssist.quoteTone || '').toLowerCase();
  if (preferred === 'premium' || preferred === 'fun' || preferred === 'bold' || preferred === 'balanced') {
    return preferred;
  }

  const style = String(designBrief.visualStyle || '').toLowerCase();
  if (style.includes('premium') || style.includes('minimal')) return 'premium';
  if (style.includes('fun') || style.includes('bright')) return 'fun';
  if (style.includes('text heavy')) return 'bold';
  return 'balanced';
}

function deriveLogicInsights(designBrief, interactionKeywords = []) {
  const itemNames = Array.isArray(designBrief.itemNames) && designBrief.itemNames.length
    ? designBrief.itemNames
    : [designBrief.itemName || 'dish'];
  const itemCount = itemNames.length;
  const coreKeywords = [
    ...itemNames.map((name) => String(name || '').toLowerCase()),
    String(designBrief.offerType || '').toLowerCase(),
    String(designBrief.visualStyle || '').toLowerCase(),
    String(designBrief.textDensity || '').toLowerCase(),
    String(designBrief.backgroundMode || '').toLowerCase(),
    String(designBrief.fontMood || '').toLowerCase(),
    String(designBrief.refinementChoice || '').toLowerCase(),
  ].filter(Boolean);

  const normalizedClicks = (Array.isArray(interactionKeywords) ? interactionKeywords : [])
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);

  const keywords = Array.from(new Set([...coreKeywords, ...normalizedClicks])).slice(0, 24);
  const offerType = String(designBrief.offerType || '').toLowerCase();
  const itemName = String(itemNames[0] || 'dish');
  const restaurant = String(designBrief.restaurantName || 'your restaurant');

  const intent = offerType.includes('buy 1')
    ? 'value'
    : (offerType.includes('%') || offerType.includes('off'))
      ? 'discount'
      : (offerType.includes('limited') ? 'urgency' : 'experience');

  const cta = intent === 'urgency'
    ? 'Drop in today'
    : intent === 'value'
      ? 'Bring a friend and claim this deal'
      : 'Scan and redeem in-store';

  const headline = intent === 'discount'
    ? `${designBrief.offerType} ${itemName}`
    : intent === 'urgency'
      ? `${itemName} • This Week Only`
      : `${itemName} Special at ${restaurant}`;

  const recommendedMood = intent === 'urgency'
    ? 'bold'
    : intent === 'value'
      ? 'playful'
      : intent === 'experience'
        ? 'premium'
        : 'cozy';

  const recommendation = recommendedMood === 'premium'
    ? 'Use premium mood with high-contrast hero image and short headline.'
    : recommendedMood === 'playful'
      ? 'Use playful mood with energetic copy and value-forward CTA.'
      : recommendedMood === 'bold'
        ? 'Use bold mood with urgency-first headline and strong CTA chip.'
      : 'Use cozy mood with warm copy and comfort-focused subline.';

  const strategySuggestions = [
    {
      title: 'Poster strategy',
      detail: itemCount > 1
        ? `Highlight 1 hero item and mention ${itemCount - 1} supporting items in subline.`
        : 'Use one hero image and keep headline under 6 words.',
    },
    {
      title: 'Offer strategy',
      detail: intent === 'discount'
        ? 'Lead with discount in first line and keep CTA action-oriented.'
        : 'Lead with value/urgency and support with concise subline.',
    },
    {
      title: 'Retention strategy',
      detail: 'Use QR CTA plus limited-time wording to drive repeat visits this week.',
    },
  ];

  return {
    keywords,
    intent,
    headlineSuggestion: headline,
    ctaSuggestion: cta,
    recommendedMood,
    recommendation,
    strategySuggestions,
    rationale: [
      `Intent classified as ${intent} from offer type "${designBrief.offerType}".`,
      `Visual style "${designBrief.visualStyle}" with "${designBrief.backgroundMode}" background drives contrast consistency.`,
      `Clicked keywords refine copy and layout priority toward owner selections.`,
    ],
  };
}

async function buildPreview(inputBrief = {}, preferredPresetId = null, aiAssist = {}) {
  const designBrief = normalizeDesignBrief(inputBrief);
  const validation = validateDesignBrief(designBrief);

  if (!validation.ok) {
    const error = new Error('Invalid design brief');
    error.statusCode = 400;
    error.details = validation.errors;
    throw error;
  }

  const resolvedImages = await resolveImageInputs(designBrief, aiAssist);
  const normalizedBrief = {
    ...designBrief,
    itemImageCatalog: resolvedImages.itemImageCatalog,
    productImageAsset: resolvedImages.productImageAsset || designBrief.productImageAsset,
    productImageAssets: resolvedImages.productImageAssets,
  };

  const presetId = resolvePresetId(normalizedBrief, preferredPresetId);
  const useAi = isAiAssistEnabled(aiAssist);

  let imageEnhancement = {
    source: normalizedBrief.productImageAsset || '',
    enhanced: normalizedBrief.productImageAsset || '',
    provider: 'disabled',
    skipped: true,
  };

  if (useAi && aiAssist.enhanceImage && normalizedBrief.productImageAsset) {
    imageEnhancement = await providers.imageEnhancer.enhance(normalizedBrief.productImageAsset);
  }

  let promptDraft = {
    prompt: '',
    provider: 'disabled',
    skipped: true,
  };

  if (useAi && (aiAssist.generateQuote || aiAssist.generatePoster || aiAssist.generatePrompts)) {
    promptDraft = await providers.promptHelper.buildPrompt(normalizedBrief);
  }

  const briefForRender = {
    ...normalizedBrief,
    productImageAsset: imageEnhancement.enhanced || normalizedBrief.productImageAsset,
  };

  const preview = composePoster({
    designBrief: briefForRender,
    presetId,
  });

  let score = {
    score: null,
    notes: ['Preview scoring skipped'],
    previewPreset: preview?.presetId || null,
    provider: 'disabled',
    skipped: true,
  };

  if (useAi && aiAssist.scorePreview) {
    score = await providers.scorer.score(normalizedBrief, preview);
  }

  const quoteTone = resolveQuoteTone(normalizedBrief, aiAssist);
  const inspirationalQuote = useAi && aiAssist.generateQuote
    ? inspirationalQuoteForBrief(normalizedBrief, quoteTone)
    : '';
  const logicInsights = deriveLogicInsights(normalizedBrief, aiAssist.interactionKeywords || []);

  return {
    presetId,
    designBrief: normalizedBrief,
    preview,
    providerMeta: {
      imageEnhancement,
      promptDraft,
      score,
      aiUsed: useAi,
      inspirationalQuote,
      logicInsights,
      assetResolution: {
        sourceByItem: resolvedImages.sourceByItem,
      },
    },
  };
}

async function createOfferDesignFlow(payload = {}) {
  const built = await buildPreview(
    payload.designBrief || {},
    payload.selectedPresetId || null,
    payload.aiAssist || {},
  );

  const saved = createOfferDesign({
    status: payload.status || 'draft',
    designBrief: built.designBrief,
    selectedPresetId: built.presetId,
    preview: built.preview,
    providerMeta: built.providerMeta,
  });

  const useAi = isAiAssistEnabled(payload.aiAssist || {});
  const promptPackage = {
    primaryPrompt: saved.providerMeta?.promptDraft?.prompt || '',
    provider: saved.providerMeta?.promptDraft?.provider || 'disabled',
  };
  const generation = useAi && (payload.aiAssist || {}).generatePoster
    ? await providers.posterGenerator.generate(saved.designBrief, saved.preview, promptPackage)
    : {
      posterUrl: '',
      preview: saved.preview,
      provider: 'disabled',
      skipped: true,
    };
  const final = updateOfferDesign(saved.id, {
    providerMeta: {
      ...saved.providerMeta,
      generation,
    },
  });

  return final;
}

async function updateOfferDesignFlow(designId, payload = {}) {
  const existing = getOfferDesign(designId);
  if (!existing) return null;

  const nextBriefInput = {
    ...(existing.designBrief || {}),
    ...(payload.designBrief || {}),
  };

  const built = await buildPreview(
    nextBriefInput,
    payload.selectedPresetId || existing.selectedPresetId || null,
    payload.aiAssist || {},
  );

  return updateOfferDesign(designId, {
    status: payload.status || existing.status,
    designBrief: built.designBrief,
    selectedPresetId: built.presetId,
    preview: built.preview,
    providerMeta: {
      ...(existing.providerMeta || {}),
      ...built.providerMeta,
    },
  });
}

async function generateInspirationalQuotes(inputBrief = {}, aiAssist = {}) {
  const designBrief = normalizeDesignBrief(inputBrief);
  const validation = validateDesignBrief(designBrief);

  if (!validation.ok) {
    const error = new Error('Invalid design brief');
    error.statusCode = 400;
    error.details = validation.errors;
    throw error;
  }

  if (!isAiAssistEnabled(aiAssist) || !aiAssist.generateQuote) {
    return {
      aiUsed: false,
      quotes: [],
      message: 'AI assist is disabled. Enable AI quote generation in Create Offer.',
    };
  }

  const tone = resolveQuoteTone(designBrief, aiAssist);
  return {
    aiUsed: true,
    tone,
    quotes: [
      inspirationalQuoteForBrief(designBrief, tone),
      inspirationalQuoteForBrief(designBrief, tone),
      inspirationalQuoteForBrief(designBrief, tone),
    ],
  };
}

async function generateImagePromptPack(inputBrief = {}, aiAssist = {}) {
  const designBrief = normalizeDesignBrief(inputBrief);
  const validation = validateDesignBrief(designBrief);

  if (!validation.ok) {
    const error = new Error('Invalid design brief');
    error.statusCode = 400;
    error.details = validation.errors;
    throw error;
  }

  const generated = await providers.promptHelper.buildImagePrompts(designBrief);
  return {
    aiUsed: true,
    provider: generated.provider || 'noop-prompt-helper',
    prompts: generated.prompts || [],
  };
}

async function generateCreativePackage(inputBrief = {}, aiAssist = {}) {
  const previewResult = await buildPreview(inputBrief, null, {
    ...aiAssist,
    generatePrompts: true,
  });

  const promptPack = await generateImagePromptPack(previewResult.designBrief, aiAssist);
  const useAi = isAiAssistEnabled(aiAssist);
  const generatedImages = useAi && aiAssist.generateImages
    ? (promptPack.prompts || []).slice(0, 2).map((promptRow) => ({
      itemName: promptRow.itemName,
      variant: promptRow.variant,
      imageUrl: '',
      provider: 'disabled',
      skipped: true,
    }))
    : [];

  return {
    layoutConfig: previewResult.preview.layoutConfig || null,
    copy: previewResult.preview.layoutConfig?.copy || null,
    assets: previewResult.preview.layoutConfig?.assets || null,
    promptPack: promptPack.prompts || [],
    generatedImages,
    generationMeta: {
      sourceUsed: previewResult.providerMeta?.assetResolution?.sourceByItem || {},
      fallbackReason: 'menu-upload-first with ai/stock fallback',
      aiEnabled: useAi,
    },
    preview: previewResult.preview,
    designBrief: previewResult.designBrief,
  };
}

async function createOfferSuggestions(payload = {}) {
  const requestedAssetIds = Array.isArray(payload.uploadedAssetIds) ? payload.uploadedAssetIds : [];
  const assets = getAssetsByIds(requestedAssetIds);
  const result = await buildSuggestionsResult(payload, assets);
  return {
    suggestions: result.suggestions,
    normalizedInput: result.normalizedInput,
    analysis: result.analysis,
  };
}

function enrichCopyVariants(suggestion = {}, action = 'all') {
  const baseTitle = String(suggestion.title || 'Limited Offer').trim();
  const baseValue = String(suggestion.valueLine || suggestion.valueFraming || 'Limited time only').trim();
  const offerText = String(suggestion.promoType || suggestion.suggestionType || 'offer').replaceAll('_', ' ');
  const variants = [
    { headline: baseTitle.toUpperCase(), offerLine: baseValue, cta: 'Scan to redeem now' },
    { headline: `ONLY TODAY · ${baseTitle.toUpperCase()}`, offerLine: `${baseValue} · limited window`, cta: 'Claim this deal in-store' },
    { headline: `${baseTitle.toUpperCase()} THIS WEEK`, offerLine: `Best ${offerText} value for local regulars`, cta: 'Visit and redeem today' },
    { headline: `POPULAR PICK · ${baseTitle.toUpperCase()}`, offerLine: `${baseValue} · customer favorite right now`, cta: 'Tap in and order now' },
    { headline: `CRAVE-WORTHY ${baseTitle.toUpperCase()}`, offerLine: `${baseValue} · top value for this window`, cta: 'Grab this offer today' },
    { headline: `DON'T MISS ${baseTitle.toUpperCase()}`, offerLine: `${baseValue} · ends soon`, cta: 'Redeem before it ends' },
  ];

  if (action === 'headline') {
    return variants.map((row) => ({ ...row, offerLine: baseValue }));
  }
  return variants;
}

function buildVariantUrl(url = '', token = '', ordinal = 0) {
  const source = String(url || '').trim();
  if (!source) return '';
  try {
    const parsed = new URL(source);
    parsed.searchParams.set('ppv', `${token}-${ordinal}`);
    if (parsed.hostname.includes('unsplash.com')) {
      parsed.searchParams.set('sig', `${token}${ordinal}`);
    }
    return parsed.toString();
  } catch (_error) {
    const glue = source.includes('?') ? '&' : '?';
    return `${source}${glue}ppv=${encodeURIComponent(`${token}-${ordinal}`)}`;
  }
}

async function regenerateOfferSuggestions(payload = {}) {
  const action = String(payload.action || 'all').toLowerCase();
  const draftInput = payload.draftInput && typeof payload.draftInput === 'object'
    ? payload.draftInput
    : {};

  const normalizedInput = {
    lifecycleStage: 'draft',
    promotionIntent: draftInput.promotionIntent || 'combo',
    itemDescription: draftInput.itemDescription || draftInput.item || 'Chef Special',
    mood: draftInput.mood || 'bold',
    visualStyle: draftInput.visualStyle || '',
    layoutStyle: draftInput.layoutStyle || '',
    imageSourcePreference: draftInput.imageSourcePreference || 'Generate using AI',
    uploadedAssetIds: Array.isArray(draftInput.uploadedAssetIds) ? draftInput.uploadedAssetIds : [],
    businessContext: draftInput.businessContext || {},
    performanceSignals: draftInput.performanceSignals || {},
  };

  const base = await createOfferSuggestions(normalizedInput);
  const suggestions = Array.isArray(base.suggestions) ? base.suggestions : [];
  const selectedId = String(payload.selectedSuggestionId || suggestions[0]?.id || '');
  const selected = suggestions.find((row) => row.id === selectedId) || suggestions[0] || null;

  const regenToken = `${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
  const variantOffset = Math.floor(Math.random() * 3);
  let nextSuggestions = suggestions;
  if (selected) {
    const copyVariants = enrichCopyVariants(selected, action);
    if (action === 'headline' || action === 'all') {
      nextSuggestions = suggestions.map((row, index) => {
        if (row.id !== selected.id) return row;
        const variant = copyVariants[(variantOffset + index) % copyVariants.length];
        return {
          ...row,
          title: variant.headline,
          valueLine: variant.offerLine,
          valueFraming: variant.offerLine,
          supportLine: row.supportLine || row.subtitle || 'Generated from campaign intent and business context.',
          subtitle: row.subtitle || 'Generated from campaign intent and business context.',
        };
      });
    }

    if (action === 'image' || action === 'all') {
      nextSuggestions = nextSuggestions.map((row, index) => {
        const currentUrl = row.previewImage?.url || row.preview?.imageUrl || '';
        const nextUrl = buildVariantUrl(currentUrl, regenToken, index);
        return {
          ...row,
          previewImage: {
            ...(row.previewImage || {}),
            url: nextUrl || currentUrl,
            source: row.previewImage?.source || 'generated',
          },
          preview: {
            ...(row.preview || {}),
            imageUrl: nextUrl || currentUrl,
          },
        };
      });
    }
  }

  if (action === 'all' && nextSuggestions.length > 1) {
    const rotateBy = (Math.floor(Math.random() * (nextSuggestions.length - 1)) + 1) % nextSuggestions.length;
    nextSuggestions = [
      ...nextSuggestions.slice(rotateBy),
      ...nextSuggestions.slice(0, rotateBy),
    ];
  }

  return {
    suggestions: nextSuggestions,
    selectedSuggestionId: selectedId || nextSuggestions[0]?.id || '',
    copyVariants: selected ? enrichCopyVariants(selected, action) : [],
    generationMeta: {
      action,
      sourceUsed: 'backend-regenerate',
      suggestionsCount: nextSuggestions.length,
    },
  };
}

async function buildReviewPayload(payload = {}) {
  const selectedSuggestion = payload.selectedSuggestion && typeof payload.selectedSuggestion === 'object'
    ? payload.selectedSuggestion
    : {};
  const draftInput = payload.draftInput && typeof payload.draftInput === 'object'
    ? payload.draftInput
    : {};
  const business = draftInput.businessContext || {};
  const store = String(draftInput.storeId || business.storeId || 'taco123');
  const restaurantName = String(business.restaurantName || 'Your Restaurant');
  const offerTitle = String(selectedSuggestion.title || selectedSuggestion.headline || 'Offer');
  const location = String(business.location || 'Primary location');

  const redeemUrl =
    `http://localhost:3000/redeem?store=${encodeURIComponent(store)}` +
    `&restaurant=${encodeURIComponent(restaurantName)}` +
    `&offer=${encodeURIComponent(offerTitle)}`;

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(redeemUrl, { width: 320, margin: 2 });
  } catch (_error) {
    qrDataUrl = '';
  }

  return {
    posterPreview: {
      headline: String(selectedSuggestion.headline || selectedSuggestion.title || 'Offer Preview'),
      offerLine: String(selectedSuggestion.offerLine || selectedSuggestion.valueLine || 'Limited Offer'),
      cta: String(selectedSuggestion.cta || 'Scan to redeem'),
      imageUrl: String(selectedSuggestion.previewImage?.url || ''),
      footer: `${restaurantName} · ${location}`,
    },
    campaignSummary: {
      title: offerTitle,
      status: 'Ready to Go Live',
      platform: String(draftInput.platform || 'Instagram Post'),
      duration: String(draftInput.duration || '7 days'),
      offerType: String(draftInput.offerType || draftInput.promotionIntent || 'Limited Time'),
      channels: ['Instagram', 'In-store QR'],
    },
    qrDataUrl,
    generationMeta: {
      sourceUsed: 'review-payload-builder',
      qrReady: Boolean(qrDataUrl),
    },
  };
}

async function selectOfferSuggestion(payload = {}) {
  const normalized = payload.normalizedInput && typeof payload.normalizedInput === 'object'
    ? payload.normalizedInput
    : payload;
  const ids = Array.isArray(normalized.uploadedAssetIds) ? normalized.uploadedAssetIds : [];
  const assets = getAssetsByIds(ids);
  const result = await buildSelectionResult(payload, assets);

  const saved = createOfferDesign({
    status: 'selected',
    designBrief: result.normalizedInput,
    selectedPresetId: result.selectedSuggestion.recommendedTemplateBehavior || null,
    preview: {
      generationPayload: result.generationPayload,
    },
    providerMeta: {
      createOfferEngine: {
        selectionMeta: result.selectionMeta,
        selectedSuggestion: result.selectedSuggestion,
      },
    },
  });

  return {
    draftId: saved.id,
    selectedSuggestion: result.selectedSuggestion,
    generationPayload: result.generationPayload,
    selectionMeta: result.selectionMeta,
  };
}

function listPresetCatalog() {
  const templates = listPosterTemplates();
  const presetMap = loadPresetMap();

  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    status: template.status,
    supportedFormats: template.supportedFormats,
    canvas: presetMap[template.id]?.canvas || null,
  }));
}

module.exports = {
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
};
