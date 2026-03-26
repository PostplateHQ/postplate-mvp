const fs = require('fs');
const path = require('path');
const { fitTextToZone } = require('./textFit');
const { resolveCollisions } = require('./collision');
const { createRenderOutput } = require('./renderMapper');
const { resolvePresetId, styleTokens } = require('./styleSystem');
const { generatePromoCopy } = require('./copyGenerator');
const { selectPromoAssets, isValidUrl } = require('./assetSelector');
const { canvasForPlatform, mapLayoutConfigToNodes } = require('./previewRendererMapper');

const TEMPLATE_DIR = path.join(__dirname, '..', 'templates');
const PRESET_PATH = path.join(TEMPLATE_DIR, 'presets', 'layout-presets.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listPosterTemplates() {
  return fs
    .readdirSync(TEMPLATE_DIR)
    .filter((name) => name.endsWith('.json'))
    .filter((name) => name !== 'layout-presets.json')
    .map((name) => readJson(path.join(TEMPLATE_DIR, name)));
}

function loadPresetMap() {
  return readJson(PRESET_PATH);
}

function getPreset(presetId) {
  const map = loadPresetMap();
  return map[presetId] || null;
}

function fitNodeText(node, text, role, allowShrink, lineClamp) {
  const result = fitTextToZone({
    text,
    width: node.width,
    height: node.height,
    fontSizeMin: role === 'headline' ? 30 : 16,
    fontSizeMax: role === 'headline' ? 96 : 34,
    lineClamp,
    allowTextShrink: allowShrink,
    role,
  });

  return {
    ...node,
    text,
    finalText: result.finalText,
    fontSize: result.fontSize,
    overflow: result.overflow,
  };
}

function normalizePromoInput(input = {}) {
  const selectedItems = Array.isArray(input.itemNames) && input.itemNames.length
    ? input.itemNames.map((row) => String(row || '').trim()).filter(Boolean)
    : [String(input.itemName || 'Item').trim()];
  const itemImageCatalog = input.itemImageCatalog && typeof input.itemImageCatalog === 'object'
    ? input.itemImageCatalog
    : {};
  const imageUrlsByItem = {};
  selectedItems.forEach((item) => {
    imageUrlsByItem[item] = (Array.isArray(itemImageCatalog[item]) ? itemImageCatalog[item] : [])
      .map((url) => String(url || '').trim())
      .filter((url) => isValidUrl(url));
  });

  const productImageAssets = (Array.isArray(input.productImageAssets) ? input.productImageAssets : [])
    .map((url) => String(url || '').trim())
    .filter((url) => isValidUrl(url));
  if (productImageAssets.length && selectedItems[0]) {
    imageUrlsByItem[selectedItems[0]] = [...(imageUrlsByItem[selectedItems[0]] || []), ...productImageAssets];
  }

  const totalImages = Object.values(imageUrlsByItem).reduce((sum, urls) => sum + (Array.isArray(urls) ? urls.length : 0), 0);
  const offerType = String(input.offerType || '').trim();
  const offerText = String(input.offerLabel || input.offerText || offerType).trim();
  const textDensity = input.textDensity === 'more_text'
    ? 'high'
    : (input.textDensity === 'more_image' ? 'low' : (input.textDensity || 'medium'));
  const platform = String(input.platform || 'instagram_post');

  const isOfferStrong = ['Buy 1 Get 1', 'Combo Deal', 'Limited Time', '20% OFF']
    .includes(offerType);
  const isMinimal = textDensity === 'low' && selectedItems.length === 1 && offerText.length <= 26;

  return {
    selectedItems,
    offerType,
    offerText,
    restaurantName: String(input.restaurantName || 'Your Restaurant'),
    address: String(input.restaurantLocation || ''),
    platform,
    styleKeywords: String(input.styleKeywords || '').split(',').map((s) => s.trim()).filter(Boolean),
    textDensity,
    imageUrlsByItem,
    logoUrl: input.logoEnabled ? String(input.logoAsset || '') : '',
    qrCodeUrl: input.qrEnabled
      ? '/qr?store=postplate&restaurant=' + encodeURIComponent(input.restaurantName || 'restaurant') + '&offer=' + encodeURIComponent(offerText || 'offer')
      : '',
    hasImages: totalImages > 0 || Boolean(String(input.productImageAsset || '').trim()),
    hasLogo: Boolean(input.logoEnabled && String(input.logoAsset || '').trim()),
    hasQr: Boolean(input.qrEnabled),
    addressEnabled: Boolean(input.addressEnabled),
    isMultiItem: selectedItems.length >= 2,
    isHighText: textDensity === 'high',
    isOfferStrong,
    isMinimal,
  };
}

function chooseLayoutMode(input = {}) {
  if (!input.hasImages) return 'textHero';
  if ((input.selectedItems || []).length >= 3) return 'multiItemGrid';
  if (input.isHighText) return 'textHero';
  if (input.isMinimal) return 'minimalPromo';
  if ((input.selectedItems || []).length === 1 && input.hasImages) return 'imageHero';
  return 'splitBalanced';
}

function buildLayoutConfig(rawInput = {}) {
  const normalized = rawInput.selectedItems ? rawInput : normalizePromoInput(rawInput);
  const mode = chooseLayoutMode(normalized);
  const copy = generatePromoCopy(normalized);
  const assets = selectPromoAssets(normalized);
  const canvas = canvasForPlatform(normalized.platform);
  const padding = normalized.platform === 'instagram_story' ? 36 : 28;
  const qrSize = Math.round(canvas.width * 0.14);
  const logoWidth = Math.round(canvas.width * 0.18);
  const heroImageVisible = Boolean(assets.heroImageUrl) && mode !== 'textHero' && mode !== 'minimalPromo';

  return {
    mode,
    canvas,
    copy,
    visibility: {
      heroImage: heroImageVisible,
      itemGrid: mode === 'multiItemGrid',
      logo: Boolean(normalized.hasLogo),
      qr: Boolean(normalized.hasQr && normalized.qrCodeUrl),
      footer: Boolean(normalized.addressEnabled && copy.footerLine && copy.footerLine.length <= 64),
      subheadline: Boolean(copy.subheadline),
    },
    layout: {
      padding,
      gap: normalized.platform === 'instagram_story' ? 20 : 14,
      alignment: mode === 'minimalPromo' ? 'center' : 'left',
      textPlacement: mode === 'imageHero' || mode === 'splitBalanced' ? 'left' : 'full',
      imagePlacement: mode === 'imageHero' ? 'right' : (mode === 'splitBalanced' ? 'right' : 'none'),
      sectionOrder: ['topBadge', 'headlineBlock', 'subtextBlock', 'heroImage', 'itemGrid', 'logo', 'qr', 'footer'],
    },
    sizing: {
      headlineMaxWidth: mode === 'textHero' ? 0.7 : 0.55,
      heroImageWidth: mode === 'imageHero' ? 0.62 : 0.5,
      qrSize,
      logoWidth,
    },
    assets: {
      heroImageUrl: assets.heroImageUrl,
      gridImageUrls: assets.gridImageUrls,
      logoUrl: normalized.logoUrl || '',
    },
    fallbackBehavior: {
      onImageFail: 'switch_to_textHero',
    },
  };
}

function modeToPreset(mode, preferredPresetId) {
  if (preferredPresetId) return preferredPresetId;
  if (mode === 'imageHero') return 'dark-premium';
  if (mode === 'textHero') return 'bold-promo';
  if (mode === 'multiItemGrid') return 'bold-promo';
  if (mode === 'minimalPromo') return 'minimal-clean';
  return 'minimal-clean';
}

function composePoster({ designBrief, presetId }) {
  const normalized = normalizePromoInput(designBrief);
  const layoutConfig = buildLayoutConfig(normalized);
  const resolvedPresetId = modeToPreset(layoutConfig.mode, presetId || resolvePresetId(designBrief, null));
  const tokens = styleTokens(designBrief, resolvedPresetId);
  const warnings = [];

  if (!layoutConfig.assets.heroImageUrl && layoutConfig.mode !== 'textHero' && layoutConfig.mode !== 'minimalPromo') {
    warnings.push('Hero image unavailable; text-focused fallback is recommended.');
  }

  const rawNodes = mapLayoutConfigToNodes(layoutConfig, tokens, normalized.qrCodeUrl);
  const nodes = rawNodes.map((node) => {
    if (node.type !== 'text') return node;
    const role = node.id === 'headline' ? 'headline' : (node.id === 'subline' ? 'subheadline' : 'body');
    return fitNodeText(node, node.finalText || '', role, true, role === 'headline' ? 3 : 2);
  });

  const collisionResult = resolveCollisions(nodes, layoutConfig.canvas, layoutConfig.layout.padding, warnings);

  return createRenderOutput({
    templateId: resolvedPresetId,
    presetId: resolvedPresetId,
    format: normalized.platform === 'instagram_story' ? 'story' : (normalized.platform === 'flyer' ? 'flyer' : 'square'),
    canvas: layoutConfig.canvas,
    nodes: collisionResult.nodes,
    warnings,
    overflowAdjusted: collisionResult.overflowAdjusted,
    layoutConfig,
  });
}

function renderPromotion({ templateId, format, content }) {
  if (format && format !== 'square') {
    throw new Error('Only square format is supported in the new deterministic flow.');
  }

  const designBrief = {
    itemName: content.itemName || (Array.isArray(content.itemNames) && content.itemNames[0]) || 'Custom',
    itemNames: Array.isArray(content.itemNames) && content.itemNames.length ? content.itemNames.slice(0, 5) : [content.itemName || 'Custom'],
    itemImageCatalog: content.itemImageCatalog || {},
    offerType: content.offerType || content.offerText || 'Limited Time',
    offerLabel: content.offerLabel || content.offerText || content.offerType || 'Limited Time Offer',
    visualStyle: content.visualStyle || 'Minimal Clean',
    textDensity: content.textDensity || 'balanced',
    backgroundMode: content.backgroundMode || 'dark',
    fontMood: content.fontMood || 'bold',
    restaurantName: content.restaurantName || 'Your Restaurant',
    restaurantLocation: content.addressText || '',
    logoAsset: content.logoImage || '',
    productImageAsset: content.heroImage || '',
    productImageAssets: Array.isArray(content.heroImages) ? content.heroImages.slice(0, 5) : [],
    qrEnabled: content.qrEnabled !== false,
    logoEnabled: content.logoEnabled !== false,
    addressEnabled: Boolean(content.addressText),
    refinementChoice: content.refinementChoice || '',
  };

  return composePoster({ designBrief, presetId: templateId });
}

module.exports = {
  listPosterTemplates,
  loadPresetMap,
  normalizePromoInput,
  chooseLayoutMode,
  buildLayoutConfig,
  selectPromoAssets,
  generatePromoCopy,
  composePoster,
  renderPromotion,
};
