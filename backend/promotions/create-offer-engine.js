const { createProviderRegistry } = require('../../engine/providerRegistry');
const {
  createAsset,
  getAsset,
  getGeneratedImageCache,
  setGeneratedImageCache,
} = require('./store');
const { understandItem } = require('./suggestion-engine/item-understanding-service');
const { classifyCuisine } = require('./suggestion-engine/cuisine-classifier');
const { buildSuggestionBlueprints } = require('./suggestion-engine/suggestion-generator');
const { buildPromptPackage } = require('./suggestion-engine/preview-prompt-builder');
const { validateSuggestionPreview } = require('./suggestion-engine/preview-validator');
const { cuisineAwareFallback } = require('./suggestion-engine/preview-fallback-service');
const { ensureDistinctSuggestions } = require('./suggestion-engine/suggestion-dedupe-service');
const FEATURE_FLAGS = {
  menu_intelligence_v1: true,
};

let createOfferEngineProviders = createProviderRegistry();

const INTENT_MAP = {
  combo: { goal: 'increase_basket_size', label: 'Combo Deal' },
  discount: { goal: 'immediate_conversion', label: 'Discount Offer' },
  new_item: { goal: 'menu_discovery', label: 'New Item' },
  bring_back: { goal: 'retention_win_back', label: 'Bring Back Customers' },
};

const MOOD_MAP = {
  bold: 'bold',
  premium: 'premium',
  fun: 'fun',
};

function asString(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeIntent(value) {
  const normalized = asString(value).toLowerCase();
  return INTENT_MAP[normalized] ? normalized : 'combo';
}

function normalizeMood(value) {
  const normalized = asString(value).toLowerCase();
  return MOOD_MAP[normalized] ? normalized : 'bold';
}

function detectCuisineType(restaurantName = '', providedCuisine = '') {
  const direct = asString(providedCuisine).toLowerCase();
  if (direct) return direct;
  const source = asString(restaurantName).toLowerCase();
  if (source.includes('taco') || source.includes('mex')) return 'mexican';
  if (source.includes('pizza')) return 'pizza';
  if (source.includes('cafe') || source.includes('coffee')) return 'cafe';
  if (source.includes('biryani') || source.includes('masala') || source.includes('tikka')) return 'indian';
  if (source.includes('dessert') || source.includes('bakery')) return 'desserts';
  return 'american';
}

function normalizeInput(payload = {}) {
  const intent = normalizeIntent(payload.promotionIntent);
  const mood = normalizeMood(payload.mood);
  const business = payload.businessContext && typeof payload.businessContext === 'object' ? payload.businessContext : {};
  const performance = payload.performanceSignals && typeof payload.performanceSignals === 'object'
    ? payload.performanceSignals
    : {};

  const restaurantName = asString(business.restaurantName, 'Your Restaurant');
  const userIntent = payload.userIntent && typeof payload.userIntent === 'object' ? payload.userIntent : {};
  const menuItems = Array.isArray(business.menuItems) ? business.menuItems : [];
  const menuSignalsSummary = business.menuSignalsSummary && typeof business.menuSignalsSummary === 'object'
    ? business.menuSignalsSummary
    : {};
  const offerConfig = payload.offerConfig && typeof payload.offerConfig === 'object' ? payload.offerConfig : {};
  const channelPlan = payload.channelPlan && typeof payload.channelPlan === 'object' ? payload.channelPlan : {};
  return {
    entryMode: asString(payload.entryMode, 'create_new'),
    lifecycleStage: asString(payload.lifecycleStage, 'draft'),
    promotionIntent: intent,
    intentGoal: INTENT_MAP[intent].goal,
    itemDescription: asString(payload.itemDescription, 'Chef Special'),
    mood,
    stylePreferences: {
      visualStyle: asString(payload.visualStyle, 'Premium'),
      layoutStyle: asString(payload.layoutStyle, 'Half image + text'),
      imageSourcePreference: asString(payload.imageSourcePreference, 'Generate using AI'),
      taglineChoice: asString(payload.taglineChoice, ''),
      fontStyleChoice: asString(payload.fontStyleChoice, 'Modern Sans'),
      toneStyleChoice: asString(payload.toneStyleChoice, 'Friendly Local'),
    },
    userIntent: {
      rawText: asString(userIntent.rawText),
      tags: Array.isArray(userIntent.tags) ? userIntent.tags.map((value) => asString(value).toLowerCase()).filter(Boolean) : [],
      parsed: userIntent.parsed && typeof userIntent.parsed === 'object' ? userIntent.parsed : {},
    },
    campaignGoal: asString(payload.campaignGoal, 'traffic'),
    offerConfig: {
      offerType: asString(offerConfig.offerType, 'percentage_off'),
      customRule: offerConfig.customRule && typeof offerConfig.customRule === 'object' ? offerConfig.customRule : {},
    },
    channelPlan: {
      channels: Array.isArray(channelPlan.channels) ? channelPlan.channels.map((row) => asString(row)).filter(Boolean) : [],
      soundtrackMood: asString(channelPlan.soundtrackMood, 'upbeat'),
    },
    businessContext: {
      restaurantName,
      cuisineType: detectCuisineType(restaurantName, business.cuisineType),
      businessType: asString(business.businessType, 'casual_restaurant'),
      location: asString(business.location, 'Local area'),
      menuItems: menuItems
        .map((row) => ({
          id: asString(row?.id),
          name: asString(row?.name),
          category: asString(row?.category).toLowerCase(),
          status: asString(row?.status, 'regular').toLowerCase(),
          marginBand: asString(row?.marginBand).toLowerCase(),
          note: asString(row?.note),
          imageAssetId: asString(row?.imageAssetId),
          imageUrl: asString(row?.imageUrl),
        }))
        .filter((row) => row.name)
        .slice(0, 20),
      menuSignalsSummary: {
        totalItems: asNumber(menuSignalsSummary.totalItems),
        bestSellerCount: asNumber(menuSignalsSummary.bestSellerCount),
        slowMoverCount: asNumber(menuSignalsSummary.slowMoverCount),
        withImageCount: asNumber(menuSignalsSummary.withImageCount),
        highMarginCount: asNumber(menuSignalsSummary.highMarginCount),
      },
    },
    uploadedAssetIds: Array.from(new Set((Array.isArray(payload.uploadedAssetIds) ? payload.uploadedAssetIds : [])
      .map((value) => asString(value))
      .filter(Boolean))),
    performanceSignals: {
      liveOffersCount: asNumber(performance.liveOffersCount),
      totalRedemptions: asNumber(performance.totalRedemptions),
      totalRepeatCustomers: asNumber(performance.totalRepeatCustomers),
      totalRevenueInfluenced: asNumber(performance.totalRevenueInfluenced),
    },
    operationsContext: {
      peakHours: Array.isArray(payload.operationsContext?.peakHours) ? payload.operationsContext.peakHours : [],
      slowHours: Array.isArray(payload.operationsContext?.slowHours) ? payload.operationsContext.slowHours : [],
      busiestDays: Array.isArray(payload.operationsContext?.busiestDays) ? payload.operationsContext.busiestDays : [],
      primaryGoal: asString(payload.operationsContext?.primaryGoal),
    },
  };
}

function classifyAsset(asset = {}) {
  const type = asString(asset.type).toLowerCase();
  const mime = asString(asset.mimeType).toLowerCase();
  if (type.includes('menu')) return 'menu_screenshot';
  if (type.includes('food')) return 'food_image';
  if (type.includes('logo')) return 'logo';
  if (mime.startsWith('image/')) return 'food_image';
  return 'unknown';
}

function analyzeAssets(assets = []) {
  const typed = assets.map((asset) => {
    const assetType = classifyAsset(asset);
    const sourceUrl = asset.optimizedUrl || asset.sourceUrl || '';
    const mimeType = asset.mimeType || '';
    const sourceLooksTinyDataUrl = String(sourceUrl).startsWith('data:') && sourceUrl.length < 4000;
    const qualityScore = assetType === 'food_image'
      ? (sourceLooksTinyDataUrl ? 0.38 : 0.84)
      : (assetType === 'menu_screenshot' ? 0.7 : 0.55);

    return {
      id: asset.id,
      type: assetType,
      sourceUrl,
      metadata: {
        mimeType,
        qualityScore,
        heroSuitability: assetType === 'food_image' ? (qualityScore > 0.7 ? 0.9 : 0.42) : 0.32,
        brightness: 0.55,
        aspectRatio: 'unknown',
      },
    };
  });

  const byType = typed.reduce((acc, row) => {
    if (!acc[row.type]) acc[row.type] = [];
    acc[row.type].push(row);
    return acc;
  }, {});

  return {
    items: typed,
    foodImages: byType.food_image || [],
    menuScreenshots: byType.menu_screenshot || [],
    logos: byType.logo || [],
    hasAssets: typed.length > 0,
  };
}

function isUsableFoodVisual(asset) {
  if (!asset || asset.type !== 'food_image') return false;
  if (!asset.sourceUrl) return false;
  const quality = asNumber(asset.metadata?.qualityScore, 0);
  const hero = asNumber(asset.metadata?.heroSuitability, 0);
  return quality >= 0.65 && hero >= 0.6;
}

function cuisineStyleHints(cuisine) {
  if (cuisine === 'indian') return 'warm tones, rich textures, spice-forward visuals';
  if (cuisine === 'mexican') return 'vibrant colors, fresh ingredients, casual energetic styling';
  if (cuisine === 'cafe') return 'warm approachable styling, natural table context, soft highlights';
  if (cuisine === 'pizza') return 'golden crust texture, appetizing melt detail, rustic table lighting';
  return 'natural color balance, appetizing texture detail, realistic food styling';
}

function businessStyleHints(businessType = '') {
  const normalized = businessType.toLowerCase();
  if (normalized.includes('fine')) return 'minimal plating, elegant lighting, clean neutral background';
  if (normalized.includes('food_truck') || normalized.includes('truck')) return 'bold contrast, street-style composition, punchy framing';
  if (normalized.includes('cafe')) return 'cozy daylight mood, approachable composition';
  return 'clean modern restaurant-marketing composition';
}

function moodStyleHints(mood) {
  if (mood === 'bold') return 'high contrast, strong colors, close-up framing';
  if (mood === 'premium') return 'minimal, clean, elegant, neutral tones';
  if (mood === 'fun') return 'bright, colorful, playful composition';
  return 'balanced modern visual tone';
}

function styleHintByContext(input) {
  const cuisine = input.businessContext.cuisineType;
  const businessType = input.businessContext.businessType;
  const mood = input.mood;

  const hints = [
    cuisineStyleHints(cuisine),
    businessStyleHints(businessType),
    moodStyleHints(mood),
  ];
  return hints.join('; ');
}

function buildImagePrompt(input, suggestion, promptPackage = null) {
  if (promptPackage && promptPackage.positivePrompt) {
    return promptPackage.positivePrompt;
  }
  const fallbackPrompt = buildPromptPackage(
    input,
    understandItem(input.itemDescription),
    { primaryCuisine: input.businessContext.cuisineType },
    {
      promoType: suggestion?.promoType || suggestion?.suggestionType || 'combo',
      targetMoment: suggestion?.targetMoment || 'general',
      compositionType: suggestion?.compositionType || 'hero_combo',
      visualIntent: suggestion?.visualIntent || suggestion?.suggestionType || 'promo',
      expectedFoodTags: suggestion?.expectedFoodTags || [],
    },
  );
  return fallbackPrompt.positivePrompt;
}

function buildSimplifiedImagePrompt(input, suggestion = null) {
  const suggestionLabel = asString(suggestion?.title || suggestion?.suggestionType || 'offer', 'offer');
  const cuisine = asString(input.businessContext?.cuisineType || 'restaurant');
  return [
    `Realistic appetizing food photo of ${input.itemDescription}.`,
    `Cuisine-consistent styling for ${cuisine}.`,
    `Promotion-safe composition for ${suggestionLabel}.`,
    'Natural lighting, high detail, clean background.',
    'Keep central composition with negative space for promotional text.',
    'Instagram-ready, mobile-first readability.',
  ].join(' ');
}

function buildHeadlineOptions(input, suggestion = {}, itemProfile = {}) {
  const item = asString(itemProfile.itemName || input.itemDescription || 'Chef Special');
  const offer = asString(suggestion.valueLine || suggestion.valueFraming || 'Limited offer');
  const promoType = asString(suggestion.promoType || suggestion.suggestionType).toLowerCase();
  const options = [];

  if (promoType.includes('discount')) {
    options.push(`SAVE BIG ON ${item.toUpperCase()}`);
    options.push(`TODAY ONLY: ${item.toUpperCase()} DEAL`);
    options.push(`${item.toUpperCase()} SPECIAL PRICE`);
  } else if (promoType.includes('new_item') || promoType.includes('launch')) {
    options.push(`TRY THE NEW ${item.toUpperCase()}`);
    options.push(`JUST LANDED: ${item.toUpperCase()}`);
    options.push(`${item.toUpperCase()} IS NOW LIVE`);
  } else if (promoType.includes('bundle') || promoType.includes('family')) {
    options.push(`FAMILY ${item.toUpperCase()} VALUE`);
    options.push(`${item.toUpperCase()} PACK FOR YOUR CREW`);
    options.push(`SHAREABLE ${item.toUpperCase()} DEAL`);
  } else {
    options.push(`${item.toUpperCase()} LUNCH COMBO`);
    options.push(`CRAVE-WORTHY ${item.toUpperCase()} OFFER`);
    options.push(`${item.toUpperCase()} VALUE DROP`);
  }

  options.push(`${item.toUpperCase()} ${offer.toUpperCase()}`);
  options.push(`HOT PICK: ${item.toUpperCase()} TODAY`);
  return Array.from(new Set(options)).slice(0, 6);
}

function cacheKeyForSuggestion(input, suggestion) {
  return [
    'offer_preview_v3',
    input.businessContext.restaurantName.toLowerCase(),
    input.businessContext.cuisineType,
    input.businessContext.businessType,
    input.promotionIntent,
    suggestion.suggestionType,
    suggestion.promoType || '',
    suggestion.compositionType || '',
    suggestion.visualIntent || '',
    suggestion.itemKey || '',
    suggestion.cuisineKey || '',
    input.mood,
    input.itemDescription.toLowerCase(),
    asString(input.stylePreferences?.visualStyle).toLowerCase(),
    asString(input.stylePreferences?.layoutStyle).toLowerCase(),
    asString(input.stylePreferences?.toneStyleChoice).toLowerCase(),
    asString(input.userIntent?.rawText).toLowerCase(),
    Array.isArray(input.userIntent?.tags) ? input.userIntent.tags.join(',') : '',
  ].join('|');
}

async function resolveSuggestionPreviewImage(input, suggestion, assetAnalysis, options = {}) {
  const promptPackage = options.promptPackage || null;
  const itemConfidence = asNumber(options.itemConfidence, 0.7);
  const cuisineKey = itemConfidence >= 0.8
    ? asString(options.cuisineKey || input.businessContext.cuisineType, 'american')
    : 'generic';
  const itemProfile = options.itemProfile && typeof options.itemProfile === 'object' ? options.itemProfile : {};
  const usedUrls = options.usedUrls instanceof Set ? options.usedUrls : new Set();
  const shouldUseCache = input.lifecycleStage === 'live';
  const uploadedHero = (assetAnalysis.foodImages || []).find(isUsableFoodVisual);
  if (uploadedHero) {
    usedUrls.add(uploadedHero.sourceUrl);
    return {
      url: uploadedHero.sourceUrl,
      source: 'uploaded',
      label: 'Preview image',
      prompt: '',
      provider: 'owner-upload',
      generationMeta: {
        attempts: 0,
        retryUsed: false,
        fallbackReason: '',
        sourceChosen: 'uploaded',
      },
    };
  }

  const cacheKey = cacheKeyForSuggestion(input, suggestion);
  const cached = shouldUseCache ? getGeneratedImageCache(cacheKey) : null;
  if (cached) {
    const cachedAsset = cached.assetId ? getAsset(cached.assetId) : null;
    const cachedUrl = (cachedAsset && (cachedAsset.optimizedUrl || cachedAsset.sourceUrl))
      || cached.imageUrl
      || '';
    if (cachedUrl) {
      usedUrls.add(cachedUrl);
      return {
        url: cachedUrl,
        source: 'ai-generated-cached',
        label: 'Preview image',
        prompt: cached.prompt || '',
        provider: cached.provider || 'cache',
        promptId: cached.promptId || '',
        generationMeta: {
          attempts: asNumber(cached.meta?.attempts, 0),
          retryUsed: Boolean(cached.meta?.retryUsed),
          fallbackReason: asString(cached.meta?.fallbackReason),
          sourceChosen: 'ai-generated-cached',
        },
      };
    }
  }

  const prompt = buildImagePrompt(input, suggestion, promptPackage);
  const simplifiedPrompt = buildSimplifiedImagePrompt(input, suggestion);
  const attempts = [];
  let retryUsed = false;
  let fallbackReason = '';

  const persistGeneratedImage = (result, usedPrompt, sourceLabel) => {
    const imageUrl = asString(result?.imageUrl);
    if (!imageUrl) return null;
    const asset = createAsset({
      type: 'food_image',
      sourceUrl: imageUrl,
      optimizedUrl: imageUrl,
      mimeType: 'image/png',
    });
    const saved = shouldUseCache ? setGeneratedImageCache(cacheKey, {
      assetId: asset.id,
      imageUrl,
      prompt: usedPrompt,
      promptId: asString(result?.promptId),
      provider: asString(result?.provider, 'openai-image-generator'),
      meta: {
        attempts: attempts.length,
        retryUsed,
        fallbackReason,
        sourceChosen: sourceLabel,
      },
    }) : null;
    return {
      url: asset.optimizedUrl || asset.sourceUrl,
      source: sourceLabel,
      label: 'Preview image',
      prompt: saved?.prompt || usedPrompt,
      provider: saved?.provider || asString(result?.provider, 'openai-image-generator'),
      promptId: saved?.promptId || asString(result?.promptId),
      generationMeta: {
        attempts: attempts.length,
        retryUsed,
        fallbackReason,
        sourceChosen: sourceLabel,
      },
    };
  };

  try {
    attempts.push('primary');
    const primary = await createOfferEngineProviders.imageGenerator.generate(prompt, {
      size: '1024x1024',
      quality: 'high',
      cuisineType: input.businessContext.cuisineType,
      mood: input.mood,
      suggestionType: suggestion.suggestionType,
    });
    const primaryPersisted = persistGeneratedImage(primary, prompt, 'ai-generated');
    if (primaryPersisted) return primaryPersisted;
    fallbackReason = asString(primary?.reason, 'empty_primary_result');
  } catch (error) {
    fallbackReason = asString(error?.message, 'primary_generation_failed');
  }

  try {
    retryUsed = true;
    attempts.push('retry');
    const retry = await createOfferEngineProviders.imageGenerator.generate(simplifiedPrompt, {
      size: '1024x1024',
      quality: 'high',
      retry: true,
      cuisineType: input.businessContext.cuisineType,
      mood: input.mood,
      suggestionType: suggestion.suggestionType,
    });
    const retryPersisted = persistGeneratedImage(retry, simplifiedPrompt, 'ai-generated');
    if (retryPersisted) return retryPersisted;
    fallbackReason = `${fallbackReason || 'retry_failed'};${asString(retry?.reason, 'empty_retry_result')}`;
  } catch (error) {
    retryUsed = true;
    fallbackReason = `${fallbackReason || 'retry_failed'};${asString(error?.message, 'retry_generation_failed')}`;
  }

  const itemAwareCuisineKey = itemProfile.normalizedItemName === 'ice_cream'
    ? 'ice_cream'
    : (itemProfile.foodCategory === 'dessert' ? 'desserts' : cuisineKey);
  const fallbackUrl = cuisineAwareFallback(
    itemAwareCuisineKey,
    suggestion.compositionType,
    usedUrls,
    {
      itemDescription: input.itemDescription,
      itemKey: itemProfile.normalizedItemName || suggestion.itemKey || '',
      seed: `${input.itemDescription}|${suggestion.id}|${suggestion.previewSeed || ''}`,
    },
  );
  usedUrls.add(fallbackUrl);
  return {
    url: fallbackUrl,
    source: 'stock-fallback',
    label: 'Preview image',
    prompt: simplifiedPrompt,
    provider: 'stock-fallback',
    generationMeta: {
      attempts: attempts.length,
      retryUsed,
      fallbackReason: fallbackReason || 'provider_unavailable',
      sourceChosen: 'stock-fallback',
    },
  };
}

function parseMenuSignals(normalizedInput, assetAnalysis) {
  const text = normalizedInput.itemDescription.toLowerCase();
  const tokens = text.split(/[^a-z0-9]+/).filter(Boolean);
  const pairingHints = [];
  const menuItems = FEATURE_FLAGS.menu_intelligence_v1
    ? (Array.isArray(normalizedInput.businessContext?.menuItems) ? normalizedInput.businessContext.menuItems : [])
    : [];
  const menuSummary = FEATURE_FLAGS.menu_intelligence_v1
    ? (normalizedInput.businessContext?.menuSignalsSummary || {})
    : {};
  if (tokens.includes('drink') || tokens.includes('soda')) pairingHints.push('drink_pairing');
  if (tokens.includes('fries') || tokens.includes('side')) pairingHints.push('side_pairing');
  if (assetAnalysis.menuScreenshots.length > 0 && pairingHints.length === 0) pairingHints.push('menu_combo_opportunity');
  const focusedMenuItem = menuItems.find((item) => text.includes(String(item.name || '').toLowerCase()));
  if (focusedMenuItem?.status === 'slow_mover') pairingHints.push('slow_mover_focus');
  if (focusedMenuItem?.status === 'best_seller') pairingHints.push('best_seller_focus');

  return {
    extractedItems: tokens.slice(0, 6),
    pairingHints,
    menuSignalStrength: Math.min(
      0.95,
      (assetAnalysis.menuScreenshots.length ? 0.45 : 0.2)
      + (asNumber(menuSummary.totalItems) >= 3 ? 0.2 : 0)
      + (focusedMenuItem ? 0.2 : 0),
    ),
    menuPerformance: {
      hasMenuData: asNumber(menuSummary.totalItems) > 0,
      focusedItemStatus: asString(focusedMenuItem?.status, 'unknown'),
      focusedItemMarginBand: asString(focusedMenuItem?.marginBand, ''),
      bestSellerCount: asNumber(menuSummary.bestSellerCount),
      slowMoverCount: asNumber(menuSummary.slowMoverCount),
      withImageCount: asNumber(menuSummary.withImageCount),
    },
  };
}

function templateBehaviorForSuggestion(input, suggestionType, hasFoodImage) {
  if (suggestionType === 'combo_promotion') return hasFoodImage ? 'bold_food_combo' : 'family_bundle_story';
  if (suggestionType === 'timed_discount') return 'urgent_discount_banner';
  if (suggestionType === 'new_item_spotlight') return input.mood === 'premium' ? 'premium_minimal_spotlight' : 'bold_food_combo';
  if (suggestionType === 'win_back_offer') return 'lunch_special_fast_cta';
  return 'premium_minimal_spotlight';
}

function buildSuggestionTitle(input, suggestionType) {
  const item = input.itemDescription;
  if (suggestionType === 'combo_promotion') return `${item} Combo`;
  if (suggestionType === 'timed_discount') return `${item} Lunch Special`;
  if (suggestionType === 'new_item_spotlight') return `Try the New ${item}`;
  if (suggestionType === 'win_back_offer') return `Welcome Back Offer`;
  return `${item} Feature`;
}

function baseCandidates(input, menuSignals) {
  const intent = input.promotionIntent;
  const candidates = [];

  if (intent === 'combo') {
    candidates.push({ suggestionType: 'combo_promotion', score: 0.86, valueFraming: 'Only $11.99 Today' });
    candidates.push({ suggestionType: 'timed_discount', score: 0.81, valueFraming: 'Save $2 from 12–3 PM' });
    candidates.push({ suggestionType: 'new_item_spotlight', score: 0.76, valueFraming: 'Limited first-week launch' });
  } else if (intent === 'discount') {
    candidates.push({ suggestionType: 'timed_discount', score: 0.88, valueFraming: 'Save 20% this week' });
    candidates.push({ suggestionType: 'combo_promotion', score: 0.79, valueFraming: 'Bundle and save more' });
    candidates.push({ suggestionType: 'win_back_offer', score: 0.74, valueFraming: 'Come back for a special reward' });
  } else if (intent === 'new_item') {
    candidates.push({ suggestionType: 'new_item_spotlight', score: 0.89, valueFraming: 'Just launched this week' });
    candidates.push({ suggestionType: 'combo_promotion', score: 0.77, valueFraming: 'Pair with best-selling sides' });
    candidates.push({ suggestionType: 'timed_discount', score: 0.73, valueFraming: 'Intro price for limited hours' });
  } else {
    candidates.push({ suggestionType: 'win_back_offer', score: 0.9, valueFraming: 'Guest return bonus this week' });
    candidates.push({ suggestionType: 'timed_discount', score: 0.78, valueFraming: 'Weekday comeback special' });
    candidates.push({ suggestionType: 'combo_promotion', score: 0.75, valueFraming: 'Bring a friend and save' });
  }

  if (menuSignals.pairingHints.includes('drink_pairing')) {
    candidates.push({ suggestionType: 'combo_promotion', score: 0.83, valueFraming: 'Meal + drink value combo' });
  }

  return candidates;
}

async function recommendationEngine(input, assetAnalysis, menuSignals) {
  const hasFoodImage = assetAnalysis.foodImages.length > 0;
  const itemProfile = understandItem(input.itemDescription);
  const cuisineProfile = classifyCuisine(input, itemProfile, menuSignals);
  const suggestions = ensureDistinctSuggestions(buildSuggestionBlueprints(input, itemProfile, cuisineProfile));
  const usedUrls = new Set();

  const withPreview = [];
  for (const suggestion of suggestions) {
    const promptPack = buildPromptPackage(input, itemProfile, cuisineProfile, suggestion);
    const previewImage = await resolveSuggestionPreviewImage(
      input,
      suggestion,
      assetAnalysis,
      {
        promptPackage: promptPack,
        cuisineKey: cuisineProfile.primaryCuisine,
        itemConfidence: itemProfile.confidence,
        itemProfile,
        usedUrls,
      },
    );

    const headline = suggestion.title.toUpperCase().replace(/\s{2,}/g, ' ').trim();
    const subheadline = suggestion.valueLine;

    withPreview.push({
      ...suggestion,
      suggestionType: suggestion.suggestionType || suggestion.promoType,
      subtitle: suggestion.supportLine,
      valueFraming: suggestion.valueLine,
      score: suggestion.score,
      targetAudience: input.promotionIntent === 'bring_back' ? 'past_customers' : 'local_walk_in',
      visualStyleRecommendation: input.mood,
      visualBehavior: suggestion.visualIntent,
      recommendedTemplateBehavior: suggestion.visualIntent,
      reasoningSource: {
        promotionIntent: input.promotionIntent,
        cuisineType: cuisineProfile.primaryCuisine,
        businessType: input.businessContext.businessType,
        hasFoodImage,
        menuSignalStrength: menuSignals.menuSignalStrength,
        itemConfidence: itemProfile.confidence,
        cuisineConfidence: cuisineProfile.confidence,
      },
      promptPack,
      previewImage,
      preview: {
        mode: previewImage.source.includes('uploaded')
          ? 'uploaded'
          : (previewImage.source.includes('stock') ? 'fallback' : 'generated'),
        imageUrl: previewImage.url,
        headline,
        subheadline,
      },
      headlineOptions: buildHeadlineOptions(input, suggestion, itemProfile),
      imageResolutionMeta: {
        source: previewImage.source,
        provider: previewImage.provider,
        reason: previewImage.generationMeta?.fallbackReason || '',
      },
      formatReadiness: {
        squarePoster: true,
        storyPoster: true,
        reelReadyStructure: true,
      },
    });
  }

  const validated = withPreview.map((row, _index, arr) => {
    const validation = validateSuggestionPreview({
      suggestion: row,
      promptPackage: row.promptPack,
      cuisineProfile,
      peers: arr,
    });
    return {
      ...row,
      preview: {
        ...row.preview,
        validation,
      },
    };
  });

  return validated.map((row) => {
    if (row.preview.validation.isAccepted) return row;
    const itemAwareCuisineKey = row.itemKey === 'ice_cream'
      ? 'ice_cream'
      : (String(row.itemKey || '').includes('dessert') ? 'desserts' : (row.cuisineKey || cuisineProfile.primaryCuisine));
    const fallbackUrl = cuisineAwareFallback(
      itemAwareCuisineKey,
      row.compositionType,
      usedUrls,
      {
        itemDescription: input.itemDescription,
        itemKey: row.itemKey || '',
        seed: `${row.id}|${row.previewSeed || ''}|${row.visualIntent || ''}`,
      },
    );
    usedUrls.add(fallbackUrl);
    return {
      ...row,
      previewImage: {
        ...row.previewImage,
        url: fallbackUrl,
        source: 'stock-fallback',
        provider: 'stock-fallback',
      },
      preview: {
        ...row.preview,
        mode: 'fallback',
        imageUrl: fallbackUrl,
        validation: {
          ...row.preview.validation,
          isAccepted: true,
          overallPreviewTrustScore: Math.max(row.preview.validation.overallPreviewTrustScore, 0.72),
        },
      },
    };
  });
}

function socialPayloadBuilder(input, suggestion, assetAnalysis) {
  const uploadedHero = (assetAnalysis.foodImages || []).find(isUsableFoodVisual);
  const hero = uploadedHero?.sourceUrl || suggestion.previewImage?.url || '';
  return {
    draftName: `${input.businessContext.restaurantName} - ${suggestion.title}`,
    poster: {
      format: 'instagram_post',
      headline: suggestion.title,
      offerValue: suggestion.valueFraming,
      supportingLine: suggestion.subtitle,
      cta: 'Order now',
      visualBehavior: suggestion.visualBehavior,
      heroImage: hero,
    },
    story: {
      format: 'instagram_story',
      headline: suggestion.title,
      offerValue: suggestion.valueFraming,
      cta: 'Tap to redeem',
      visualBehavior: suggestion.visualBehavior,
      heroImage: hero,
    },
    reel: {
      format: 'reel_cover_scaffold',
      hook: suggestion.title,
      sceneDirection: suggestion.visualBehavior,
      cta: 'Visit us today',
    },
  };
}

async function buildSuggestionsResult(payload, assets = []) {
  const rawItem = asString(payload.itemDescription);
  if (!rawItem || rawItem.length < 2) {
    const error = new Error('itemDescription is required');
    error.statusCode = 400;
    throw error;
  }
  const normalizedInput = normalizeInput(payload);
  const assetAnalysis = analyzeAssets(assets);
  const menuSignals = parseMenuSignals(normalizedInput, assetAnalysis);
  const suggestions = await recommendationEngine(normalizedInput, assetAnalysis, menuSignals);

  return {
    normalizedInput,
    suggestions,
    analysis: {
      assetAnalysis,
      menuSignals,
      businessContext: normalizedInput.businessContext,
      itemUnderstanding: understandItem(normalizedInput.itemDescription),
      cuisineClassification: classifyCuisine(normalizedInput, understandItem(normalizedInput.itemDescription), menuSignals),
    },
  };
}

async function buildSelectionResult(payload, assets = []) {
  const normalizedInput = normalizeInput(payload.normalizedInput || payload);
  const assetAnalysis = analyzeAssets(assets);
  const selectedSuggestion = payload.selectedSuggestionPayload || null;
  if (!selectedSuggestion) {
    const error = new Error('selectedSuggestionPayload is required');
    error.statusCode = 400;
    throw error;
  }
  const suggestionWithImage = selectedSuggestion.previewImage
    ? selectedSuggestion
    : {
      ...selectedSuggestion,
      previewImage: await resolveSuggestionPreviewImage(normalizedInput, selectedSuggestion, assetAnalysis),
    };
  const generationPayload = socialPayloadBuilder(normalizedInput, suggestionWithImage, assetAnalysis);
  return {
    normalizedInput,
    selectedSuggestion: suggestionWithImage,
    generationPayload,
    selectionMeta: {
      suggestionId: payload.suggestionId || selectedSuggestion.id || '',
      selectedAt: new Date().toISOString(),
    },
  };
}

function setCreateOfferEngineProviders(overrides = {}) {
  createOfferEngineProviders = createProviderRegistry(overrides);
}

function resetCreateOfferEngineProviders() {
  createOfferEngineProviders = createProviderRegistry();
}

module.exports = {
  normalizeInput,
  analyzeAssets,
  buildImagePrompt,
  buildSimplifiedImagePrompt,
  buildSuggestionsResult,
  buildSelectionResult,
  setCreateOfferEngineProviders,
  resetCreateOfferEngineProviders,
};
