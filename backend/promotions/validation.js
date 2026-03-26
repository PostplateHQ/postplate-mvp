const {
  ITEM_OPTIONS,
  OFFER_OPTIONS,
  VISUAL_STYLES,
  TEXT_DENSITY,
  BACKGROUND_MODES,
  FONT_MOODS,
  REFINEMENT_CHOICES,
} = require('./constants');

function oneOf(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function toBool(value, fallback) {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function normalizeDesignBrief(input = {}) {
  const itemNames = Array.from(new Set(
    (Array.isArray(input.itemNames) ? input.itemNames : [])
      .map((value) => String(value || '').trim())
      .filter(Boolean),
  )).slice(0, 5);
  const fallbackItem = String(input.itemName || '').trim() || 'Burger';
  const normalizedItemNames = itemNames.length ? itemNames : [fallbackItem];
  const itemName = normalizedItemNames[0];
  const offerType = String(input.offerType || '').trim() || 'Limited Time';
  const restaurantName = String(input.restaurantName || '').trim() || 'Your Restaurant';

  const offerLabel = String(input.offerLabel || '').trim() || `${offerType} ${itemName}`;
  const itemImageCatalog = Object.entries(
    input.itemImageCatalog && typeof input.itemImageCatalog === 'object' ? input.itemImageCatalog : {},
  ).reduce((acc, [itemName, urls]) => {
    const key = String(itemName || '').trim();
    if (!key) return acc;
    acc[key] = (Array.isArray(urls) ? urls : [])
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .slice(0, 5);
    return acc;
  }, {});

  const productImageAssets = (Array.isArray(input.productImageAssets) ? input.productImageAssets : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .slice(0, 25);
  const catalogPool = normalizedItemNames.flatMap((name) => itemImageCatalog[name] || []).slice(0, 25);
  const productImageAsset = String(input.productImageAsset || '').trim() || productImageAssets[0] || catalogPool[0] || '';
  const imageAssetIdsByItem = Object.entries(
    input.imageAssetIdsByItem && typeof input.imageAssetIdsByItem === 'object' ? input.imageAssetIdsByItem : {},
  ).reduce((acc, [itemName, ids]) => {
    const key = String(itemName || '').trim();
    if (!key) return acc;
    acc[key] = (Array.isArray(ids) ? ids : [])
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .slice(0, 5);
    return acc;
  }, {});

  return {
    itemName,
    itemNames: normalizedItemNames,
    itemImageCatalog,
    imageAssetIdsByItem,
    offerType,
    offerLabel,
    visualStyle: oneOf(input.visualStyle, VISUAL_STYLES, 'Minimal Clean'),
    textDensity: oneOf(input.textDensity, TEXT_DENSITY, 'balanced'),
    backgroundMode: oneOf(input.backgroundMode, BACKGROUND_MODES, 'dark'),
    fontMood: oneOf(input.fontMood, FONT_MOODS, 'bold'),
    restaurantName,
    restaurantLocation: String(input.restaurantLocation || '').trim(),
    logoAsset: String(input.logoAsset || '').trim(),
    productImageAsset,
    productImageAssets,
    qrEnabled: toBool(input.qrEnabled, true),
    logoEnabled: toBool(input.logoEnabled, true),
    addressEnabled: toBool(input.addressEnabled, false),
    refinementChoice: oneOf(input.refinementChoice, REFINEMENT_CHOICES, ''),
    platform: String(input.platform || 'instagram_post').trim(),
    styleKeywords: String(input.styleKeywords || '').trim(),
    imageStyle: String(input.imageStyle || 'natural-realistic').trim(),
  };
}

function validateDesignBrief(brief) {
  const errors = [];

  if (!brief || typeof brief !== 'object') {
    return { ok: false, errors: ['design brief must be an object'] };
  }

  if (!String(brief.restaurantName || '').trim()) {
    errors.push('restaurantName is required');
  }

  if (!String(brief.offerType || '').trim()) {
    errors.push('offerType is required');
  }

  if (!String(brief.itemName || '').trim()) {
    errors.push('itemName is required');
  }

  if (!ITEM_OPTIONS.includes(brief.itemName) && brief.itemName.length < 2) {
    errors.push('itemName must be at least 2 characters for custom value');
  }

  if (!Array.isArray(brief.itemNames) || brief.itemNames.length === 0) {
    errors.push('itemNames must include at least one item');
  } else if (brief.itemNames.length > 5) {
    errors.push('itemNames can include at most 5 items');
  } else {
    brief.itemNames.forEach((name) => {
      const cleaned = String(name || '').trim();
      if (!cleaned) errors.push('itemNames cannot contain empty values');
      if (!ITEM_OPTIONS.includes(cleaned) && cleaned.length < 2) {
        errors.push('custom item name must be at least 2 characters');
      }
    });
  }

  if (brief.itemImageCatalog && typeof brief.itemImageCatalog === 'object') {
    Object.entries(brief.itemImageCatalog).forEach(([itemName, urls]) => {
      const label = String(itemName || '').trim();
      if (!label) {
        errors.push('itemImageCatalog keys must be non-empty item names');
        return;
      }
      if (!Array.isArray(urls)) {
        errors.push(`itemImageCatalog.${label} must be an array`);
        return;
      }
      if (urls.length > 5) {
        errors.push(`itemImageCatalog.${label} can include at most 5 image URLs`);
      }
    });
  }

  if (brief.imageAssetIdsByItem && typeof brief.imageAssetIdsByItem === 'object') {
    Object.entries(brief.imageAssetIdsByItem).forEach(([itemName, ids]) => {
      const label = String(itemName || '').trim();
      if (!label) {
        errors.push('imageAssetIdsByItem keys must be non-empty item names');
        return;
      }
      if (!Array.isArray(ids)) {
        errors.push(`imageAssetIdsByItem.${label} must be an array`);
        return;
      }
      if (ids.length > 5) {
        errors.push(`imageAssetIdsByItem.${label} can include at most 5 asset IDs`);
      }
    });
  }

  if (!OFFER_OPTIONS.includes(brief.offerType) && brief.offerType.length < 2) {
    errors.push('offerType must be at least 2 characters for custom value');
  }

  if (!VISUAL_STYLES.includes(brief.visualStyle)) {
    errors.push('visualStyle is invalid');
  }

  if (!TEXT_DENSITY.includes(brief.textDensity)) {
    errors.push('textDensity is invalid');
  }

  if (!BACKGROUND_MODES.includes(brief.backgroundMode)) {
    errors.push('backgroundMode is invalid');
  }

  if (!FONT_MOODS.includes(brief.fontMood)) {
    errors.push('fontMood is invalid');
  }

  if (!REFINEMENT_CHOICES.includes(brief.refinementChoice || '')) {
    errors.push('refinementChoice is invalid');
  }

  return { ok: errors.length === 0, errors };
}

module.exports = {
  normalizeDesignBrief,
  validateDesignBrief,
};
