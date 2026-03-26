const test = require('node:test');
const assert = require('node:assert/strict');

const { composePoster } = require('../engine/layoutEngine');
const { resolvePresetId } = require('../engine/styleSystem');
const { overlaps } = require('../engine/collision');

function brief(overrides = {}) {
  return {
    itemName: 'Tacos',
    itemNames: ['Tacos'],
    offerType: '20% OFF',
    offerLabel: '20% OFF Taco Combo',
    visualStyle: 'Dark & Premium',
    textDensity: 'balanced',
    backgroundMode: 'dark',
    fontMood: 'bold',
    restaurantName: 'Spice Taco House',
    restaurantLocation: '123 Main St',
    logoAsset: '/uploads/logo.png',
    productImageAsset: '/uploads/food.jpg',
    qrEnabled: true,
    logoEnabled: true,
    addressEnabled: true,
    refinementChoice: 'Highlight the offer',
    ...overrides,
  };
}

test('preset resolver maps premium style to dark-premium by default', () => {
  const presetId = resolvePresetId(brief(), null);
  assert.equal(presetId, 'dark-premium');
});

test('composePoster returns square render with deterministic nodes', () => {
  const preview = composePoster({ designBrief: brief(), presetId: null });

  assert.equal(preview.format, 'square');
  assert.equal(preview.canvas.width, 1080);
  assert.equal(preview.canvas.height, 1080);

  const headline = preview.resolvedNodes.find((node) => node.id === 'headline');
  const qr = preview.resolvedNodes.find((node) => node.id === 'qrCode');
  const address = preview.resolvedNodes.find((node) => node.id === 'address');

  assert.ok(headline);
  assert.ok(qr);
  assert.ok(address);
});

test('composePoster respects QR/logo/address toggles', () => {
  const preview = composePoster({
    designBrief: brief({ qrEnabled: false, logoEnabled: false, addressEnabled: false }),
    presetId: 'minimal-clean',
  });

  assert.equal(preview.resolvedNodes.find((node) => node.id === 'qrCode'), undefined);
  assert.equal(preview.resolvedNodes.find((node) => node.id === 'logo'), undefined);
  assert.equal(preview.resolvedNodes.find((node) => node.id === 'address'), undefined);
});

test('critical headline and qr do not overlap in output', () => {
  const preview = composePoster({ designBrief: brief(), presetId: 'bold-promo' });
  const headline = preview.resolvedNodes.find((node) => node.id === 'headline');
  const qr = preview.resolvedNodes.find((node) => node.id === 'qrCode');
  assert.ok(headline);
  assert.ok(qr);
  assert.equal(overlaps(headline, qr), false);
});

test('preset resolver favors bold-promo for multi-item offer', () => {
  const presetId = resolvePresetId(brief({
    itemName: 'Burger',
    itemNames: ['Burger', 'Tacos', 'Drinks', 'Dessert'],
    visualStyle: 'Image Focused',
  }), null);
  assert.equal(presetId, 'bold-promo');
});
