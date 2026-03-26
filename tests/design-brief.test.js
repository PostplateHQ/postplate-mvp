const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeDesignBrief, validateDesignBrief } = require('../backend/promotions/validation');

test('design brief normalization applies defaults', () => {
  const normalized = normalizeDesignBrief({
    restaurantName: 'Taco House',
    offerType: '20% OFF',
    itemName: 'Tacos',
  });

  assert.equal(normalized.visualStyle, 'Minimal Clean');
  assert.deepEqual(normalized.itemNames, ['Tacos']);
  assert.equal(normalized.textDensity, 'balanced');
  assert.equal(normalized.backgroundMode, 'dark');
  assert.equal(normalized.fontMood, 'bold');
  assert.equal(normalized.qrEnabled, true);
  assert.equal(normalized.logoEnabled, true);
});

test('design brief validation rejects missing required values', () => {
  const result = validateDesignBrief({
    itemName: '',
    offerType: '',
    visualStyle: 'Minimal Clean',
    textDensity: 'balanced',
    backgroundMode: 'dark',
    fontMood: 'bold',
    restaurantName: '',
    refinementChoice: '',
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('restaurantName is required'));
  assert.ok(result.errors.includes('offerType is required'));
  assert.ok(result.errors.includes('itemName is required'));
  assert.ok(result.errors.includes('itemNames must include at least one item'));
});

test('design brief validation enforces max 5 items', () => {
  const normalized = normalizeDesignBrief({
    restaurantName: 'Taco House',
    offerType: '20% OFF',
    itemNames: ['Burger', 'Pizza', 'Bowl', 'Drinks', 'Dessert', 'Tacos'],
  });
  const result = validateDesignBrief(normalized);
  assert.equal(result.ok, true);
  assert.equal(normalized.itemNames.length, 5);
});

test('design brief normalization keeps item image catalog and chooses first image as hero', () => {
  const normalized = normalizeDesignBrief({
    restaurantName: 'Taco House',
    offerType: 'Combo Deal',
    itemNames: ['Burger'],
    itemImageCatalog: {
      Burger: ['https://cdn.example.com/burger-1.jpg', 'https://cdn.example.com/burger-2.jpg'],
    },
  });

  assert.equal(normalized.itemImageCatalog.Burger.length, 2);
  assert.equal(normalized.productImageAsset, 'https://cdn.example.com/burger-1.jpg');
});
