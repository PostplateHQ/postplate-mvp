const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPreview,
  generateInspirationalQuotes,
  generateImagePromptPack,
  generateCreativePackage,
} = require('../backend/promotions/service');

function brief(overrides = {}) {
  return {
    itemName: 'Pizza',
    itemNames: ['Pizza'],
    offerType: 'Buy 1 Get 1',
    offerLabel: 'Buy 1 Get 1 Pizza Night',
    visualStyle: 'Bright & Fun',
    textDensity: 'balanced',
    backgroundMode: 'dark',
    fontMood: 'bold',
    restaurantName: 'Nora Pizza',
    restaurantLocation: '14 Maple Ave',
    logoAsset: '',
    productImageAsset: '',
    qrEnabled: true,
    logoEnabled: true,
    addressEnabled: true,
    refinementChoice: 'Make it more fun',
    ...overrides,
  };
}

test('service preview returns provider metadata and selected preset', async () => {
  const result = await buildPreview(brief(), null);
  assert.ok(result.presetId);
  assert.ok(result.preview);
  assert.ok(result.providerMeta.imageEnhancement);
  assert.ok(result.providerMeta.promptDraft);
  assert.ok(result.providerMeta.score);
  assert.ok(result.providerMeta.logicInsights);
});

test('service preview skips AI providers when AI assist is disabled', async () => {
  const result = await buildPreview(brief(), null, { enabled: false, interactionKeywords: ['item:pizza'] });
  assert.equal(result.providerMeta.aiUsed, false);
  assert.equal(result.providerMeta.imageEnhancement.skipped, true);
  assert.equal(result.providerMeta.promptDraft.skipped, true);
  assert.equal(result.providerMeta.score.skipped, true);
  assert.ok(result.providerMeta.logicInsights.keywords.includes('item:pizza'));
  assert.ok(Array.isArray(result.providerMeta.logicInsights.strategySuggestions));
});

test('inspirational quote generation works only when AI quote mode is enabled', async () => {
  const disabled = await generateInspirationalQuotes(brief(), { enabled: false, generateQuote: false });
  assert.equal(disabled.aiUsed, false);
  assert.equal(Array.isArray(disabled.quotes), true);
  assert.equal(disabled.quotes.length, 0);

  const enabled = await generateInspirationalQuotes(brief(), { enabled: true, generateQuote: true, quoteTone: 'fun' });
  assert.equal(enabled.aiUsed, true);
  assert.equal(Array.isArray(enabled.quotes), true);
  assert.equal(enabled.quotes.length, 3);
  assert.ok(enabled.quotes[0].length > 0);
});

test('ai image prompt pack returns structured prompt variants per item', async () => {
  const result = await generateImagePromptPack(brief({
    itemName: 'Burger',
    itemNames: ['Burger', 'Fries'],
    offerType: '20% OFF',
    offerLabel: '20% OFF Burger + Fries',
  }), { enabled: true, generatePrompts: true });

  assert.equal(result.aiUsed, true);
  assert.equal(Array.isArray(result.prompts), true);
  assert.ok(result.prompts.length >= 4);
  assert.ok(result.prompts[0].prompt.includes('Generate a visually appealing restaurant promotion layout based on the inputs.'));
});

test('service preview rejects invalid brief with details', async () => {
  await assert.rejects(
    () => buildPreview({ restaurantName: 'A', itemName: 'X', offerType: 'Y' }, null),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.ok(Array.isArray(error.details));
      return true;
    },
  );
});

test('preview applies stock fallback when item uploads are missing', async () => {
  const result = await buildPreview(brief({
    itemName: 'Burger',
    itemNames: ['Burger'],
    imageAssetIdsByItem: { Burger: [] },
    productImageAsset: '',
    productImageAssets: [],
  }), null, { enabled: true });

  assert.ok(result.designBrief.productImageAsset);
  assert.equal(result.providerMeta.assetResolution.sourceByItem.Burger, 'stock-fallback');
});

test('generateCreativePackage returns layout config and source metadata', async () => {
  const result = await generateCreativePackage(brief({
    itemName: 'Tacos',
    itemNames: ['Tacos', 'Drinks'],
  }), { enabled: true, generatePrompts: true, generateImages: true });

  assert.ok(result.layoutConfig);
  assert.ok(result.copy);
  assert.ok(result.assets);
  assert.ok(Array.isArray(result.promptPack));
  assert.ok(result.generationMeta);
  assert.ok(result.generationMeta.sourceUsed.Tacos);
});
