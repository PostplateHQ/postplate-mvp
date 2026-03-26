const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizePromoInput,
  chooseLayoutMode,
  buildLayoutConfig,
} = require('../engine/layoutEngine');

function input(overrides = {}) {
  return {
    itemName: 'Burger',
    itemNames: ['Burger'],
    offerType: '20% OFF',
    offerLabel: '20% OFF Burger',
    restaurantName: 'Spice Taco House',
    restaurantLocation: '123 Main St',
    platform: 'instagram_post',
    textDensity: 'balanced',
    itemImageCatalog: { Burger: ['https://cdn.example.com/burger.jpg'] },
    logoAsset: 'https://cdn.example.com/logo.png',
    logoEnabled: true,
    qrEnabled: true,
    ...overrides,
  };
}

test('normalizePromoInput detects no-image and high-text flags', () => {
  const normalized = normalizePromoInput(input({
    itemImageCatalog: {},
    textDensity: 'more_text',
  }));

  assert.equal(normalized.hasImages, false);
  assert.equal(normalized.isHighText, true);
});

test('chooseLayoutMode follows priority', () => {
  const noImage = chooseLayoutMode(normalizePromoInput(input({ itemImageCatalog: {} })));
  assert.equal(noImage, 'textHero');

  const multiItem = chooseLayoutMode(normalizePromoInput(input({
    itemNames: ['Burger', 'Tacos', 'Pizza'],
    itemImageCatalog: {
      Burger: ['https://cdn.example.com/burger.jpg'],
      Tacos: ['https://cdn.example.com/tacos.jpg'],
      Pizza: ['https://cdn.example.com/pizza.jpg'],
    },
  })));
  assert.equal(multiItem, 'multiItemGrid');
});

test('buildLayoutConfig returns safe copy and platform canvas', () => {
  const config = buildLayoutConfig(normalizePromoInput(input({
    itemNames: ['Burger', 'Tacos', 'Drinks'],
    platform: 'instagram_story',
  })));

  assert.equal(config.canvas.width, 1080);
  assert.equal(config.canvas.height, 1920);
  assert.ok(config.copy.headline.length > 0);
  assert.ok(!config.copy.headline.includes('+3'));
});

