const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeInput,
  analyzeAssets,
  buildImagePrompt,
  buildSuggestionsResult,
  buildSelectionResult,
  setCreateOfferEngineProviders,
  resetCreateOfferEngineProviders,
} = require('../backend/promotions/create-offer-engine');
const { createAsset } = require('../backend/promotions/store');

function basePayload(overrides = {}) {
  return {
    promotionIntent: 'combo',
    itemDescription: 'Tikka Bowl + Drink',
    mood: 'Bold',
    businessContext: {
      restaurantName: 'Spice Taco House',
      businessType: 'casual_fast',
      location: 'Fort Lauderdale',
    },
    ...overrides,
  };
}

function uniqueItem(label) {
  return `Tikka Bowl + Drink ${label} ${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

test.beforeEach(() => {
  setCreateOfferEngineProviders({
    imageGenerator: {
      async generate() {
        return {
          imageUrl: '',
          provider: 'test-noop-generator',
          skipped: true,
          reason: 'test_default',
        };
      },
    },
  });
});

test.afterEach(() => {
  resetCreateOfferEngineProviders();
});

test('create-offer normalizeInput applies defaults and normalized intent', () => {
  const normalized = normalizeInput({
    promotionIntent: 'Discount',
    itemDescription: 'Tikka Bowl + Drink',
    mood: 'Premium',
    uploadedAssetIds: ['a1', 'a1', ''],
    businessContext: {
      restaurantName: 'Spice Taco House',
      location: 'Downtown',
    },
  });

  assert.equal(normalized.promotionIntent, 'discount');
  assert.equal(normalized.itemDescription, 'Tikka Bowl + Drink');
  assert.equal(normalized.mood, 'premium');
  assert.deepEqual(normalized.uploadedAssetIds, ['a1']);
  assert.equal(normalized.businessContext.cuisineType, 'mexican');
});

test('create-offer analyzeAssets classifies menu and food images', () => {
  const analysis = analyzeAssets([
    { id: 'asset_menu', type: 'menu_screenshot', mimeType: 'image/png' },
    { id: 'asset_food', type: 'food_image', mimeType: 'image/jpeg' },
  ]);

  assert.equal(analysis.menuScreenshots.length, 1);
  assert.equal(analysis.foodImages.length, 1);
  assert.equal(analysis.hasAssets, true);
});

test('buildSuggestionsResult returns top 3 suggestions with metadata', () => {
  return buildSuggestionsResult(basePayload(), []).then((result) => {
    assert.equal(Array.isArray(result.suggestions), true);
    assert.equal(result.suggestions.length, 3);
    assert.ok(result.suggestions[0].score >= result.suggestions[1].score);
    assert.ok(result.suggestions[0].recommendedTemplateBehavior);
    assert.ok(result.suggestions[0].previewImage?.url);
  });
});

test('buildSuggestionsResult rejects missing itemDescription', () => {
  return assert.rejects(() => buildSuggestionsResult({
    promotionIntent: 'combo',
    mood: 'Bold',
  }, []), /itemDescription is required/);
});

test('buildSelectionResult prepares social generation payload', () => {
  const selectedSuggestionPayload = {
    id: 'suggestion_combo_promotion_1',
    suggestionType: 'combo_promotion',
    title: 'Tikka Bowl Combo',
    subtitle: 'Optimized for quick lunch traffic.',
    valueFraming: 'Only $11.99 Today',
    visualBehavior: 'bold_food_combo',
    recommendedTemplateBehavior: 'bold_food_combo',
  };

  return buildSelectionResult({
    suggestionId: selectedSuggestionPayload.id,
    normalizedInput: basePayload(),
    selectedSuggestionPayload,
  }, []).then((result) => {
    assert.equal(result.selectedSuggestion.id, selectedSuggestionPayload.id);
    assert.equal(result.generationPayload.poster.format, 'instagram_post');
    assert.equal(result.generationPayload.story.format, 'instagram_story');
    assert.ok(result.generationPayload.poster.heroImage);
  });
});

test('uploaded usable food image bypasses AI generation', async () => {
  let calls = 0;
  setCreateOfferEngineProviders({
    imageGenerator: {
      async generate() {
        calls += 1;
        return {
          imageUrl: 'https://example.com/generated.png',
          provider: 'test-generator',
        };
      },
    },
  });

  const result = await buildSuggestionsResult(basePayload(), [{
    id: 'asset_food_uploaded',
    type: 'food_image',
    mimeType: 'image/jpeg',
    sourceUrl: 'https://example.com/uploaded-food.jpg',
    optimizedUrl: 'https://example.com/uploaded-food.jpg',
  }]);

  assert.equal(calls, 0);
  assert.equal(result.suggestions[0].previewImage.source, 'uploaded');
  assert.equal(result.suggestions[0].previewImage.url, 'https://example.com/uploaded-food.jpg');
});

test('no usable image triggers AI generation', async () => {
  let calls = 0;
  setCreateOfferEngineProviders({
    imageGenerator: {
      async generate() {
        calls += 1;
        return {
          imageUrl: `https://example.com/generated-${calls}.png`,
          provider: 'test-generator',
          promptId: 'prompt_test_1',
        };
      },
    },
  });

  const result = await buildSuggestionsResult(basePayload({
    itemDescription: uniqueItem('ai-primary'),
  }), []);
  assert.ok(calls > 0);
  assert.equal(result.suggestions[0].previewImage.source, 'ai-generated');
  assert.ok(result.suggestions[0].previewImage.url.includes('generated'));
});

test('first AI generation fails and retry succeeds', async () => {
  let calls = 0;
  setCreateOfferEngineProviders({
    imageGenerator: {
      async generate() {
        calls += 1;
        if (calls % 2 === 1) {
          throw new Error('primary_generation_failed');
        }
        return {
          imageUrl: `https://example.com/retry-generated-${calls}.png`,
          provider: 'test-generator',
          promptId: 'prompt_retry_ok',
        };
      },
    },
  });

  const result = await buildSuggestionsResult(basePayload({
    itemDescription: uniqueItem('ai-retry'),
  }), []);
  assert.equal(result.suggestions[0].previewImage.source, 'ai-generated');
  assert.equal(result.suggestions[0].previewImage.generationMeta.retryUsed, true);
});

test('AI fails twice and engine falls back to stock image', async () => {
  setCreateOfferEngineProviders({
    imageGenerator: {
      async generate() {
        throw new Error('generation_down');
      },
    },
  });

  const result = await buildSuggestionsResult(basePayload({
    itemDescription: uniqueItem('ai-stock-fallback'),
  }), []);
  assert.equal(result.suggestions[0].previewImage.source, 'stock-fallback');
  assert.ok(result.suggestions[0].previewImage.url.includes('unsplash.com'));
});

test('cached generated image bypasses provider generation', async () => {
  let calls = 0;
  setCreateOfferEngineProviders({
    imageGenerator: {
      async generate() {
        calls += 1;
        const generated = createAsset({
          type: 'food_image',
          sourceUrl: `https://example.com/not-used-${calls}.jpg`,
          optimizedUrl: `https://example.com/not-used-${calls}.jpg`,
          mimeType: 'image/jpeg',
        });
        return {
          imageUrl: generated.sourceUrl,
          provider: 'test-generator',
        };
      },
    },
  });

  const payload = basePayload({
    itemDescription: uniqueItem('cache'),
    lifecycleStage: 'live',
  });
  await buildSuggestionsResult(payload, []);
  const callCountAfterFirst = calls;
  const second = await buildSuggestionsResult(payload, []);

  assert.ok(second.suggestions[0].previewImage.url);
  assert.equal(second.suggestions[0].previewImage.source, 'ai-generated-cached');
  assert.equal(calls, callCountAfterFirst);
});

test('buildImagePrompt contains required context fragments', () => {
  const input = normalizeInput(basePayload({
    mood: 'Premium',
    businessContext: {
      restaurantName: 'Bombay Fine Dining',
      cuisineType: 'indian',
      businessType: 'fine_dining',
      location: 'Downtown',
    },
  }));
  const prompt = buildImagePrompt(input, { suggestionType: 'combo_promotion' });

  assert.match(prompt, /indian/i);
  assert.match(prompt, /fine_dining/i);
  assert.match(prompt, /negative space/i);
  assert.match(prompt, /social media/i);
});

test('biryani suggestions are item-aware, cuisine-aware, and visually distinct', async () => {
  setCreateOfferEngineProviders({
    imageGenerator: {
      async generate(_prompt, context = {}) {
        const suffix = `${context.suggestionType || 'suggestion'}_${context.retry ? 'retry' : 'primary'}`;
        return {
          imageUrl: `https://example.com/${suffix}.jpg`,
          provider: 'test-generator',
          promptId: `prompt_${suffix}`,
        };
      },
    },
  });

  const result = await buildSuggestionsResult(basePayload({
    itemDescription: `Biryani ${Date.now()}`,
    businessContext: {
      restaurantName: 'Bombay Spice House',
      cuisineType: 'indian',
      businessType: 'casual_restaurant',
      location: 'Downtown',
    },
  }), []);

  assert.equal(result.suggestions.length, 3);
  assert.ok(result.suggestions.every((row) => row.cuisineKey === 'indian'));
  assert.ok(result.suggestions.every((row) => row.preview?.validation?.isAccepted === true));
  const visualIntents = new Set(result.suggestions.map((row) => row.visualIntent));
  assert.equal(visualIntents.size, 3);
  assert.ok(result.suggestions.some((row) => /Lunch Combo/i.test(row.title)));
  assert.ok(result.suggestions.some((row) => /Family/i.test(row.title)));
  assert.ok(result.suggestions.some((row) => /Try the New/i.test(row.title)));
  assert.ok(result.suggestions.some((row) => /Only \$11\.99 Today/i.test(row.valueLine || '')));
  assert.ok(result.suggestions.some((row) => /Feed 4 for \$24\.99/i.test(row.valueLine || '')));
  assert.ok(result.suggestions.some((row) => /raita|pairing/i.test(row.supportLine || '')));
});

test('unknown item avoids forced family pack and uses neutral fallback imagery', async () => {
  setCreateOfferEngineProviders({
    imageGenerator: {
      async generate() {
        throw new Error('provider_down_for_test');
      },
    },
  });

  const result = await buildSuggestionsResult(basePayload({
    itemDescription: `Tesxcv ${Date.now()}`,
    businessContext: {
      restaurantName: 'Spice Taco House',
      cuisineType: 'mexican',
      businessType: 'casual_restaurant',
      location: 'Downtown',
    },
  }), []);

  assert.equal(result.suggestions.length, 3);
  assert.equal(result.suggestions.some((row) => /Family .*Pack/i.test(row.title || '')), false);
  const firstUrl = String(result.suggestions[0].previewImage.url || '');
  assert.ok(firstUrl.includes('unsplash.com'));
  assert.equal(/photo-1552332386|photo-1613514785940/.test(firstUrl), false);
});

test('biryani overrides conflicting business cuisine and avoids taco-like preview', async () => {
  setCreateOfferEngineProviders({
    imageGenerator: {
      async generate() {
        throw new Error('provider_down_for_test');
      },
    },
  });

  const result = await buildSuggestionsResult(basePayload({
    itemDescription: `Biryani Override ${Date.now()}`,
    businessContext: {
      restaurantName: 'Spice Taco House',
      cuisineType: 'mexican',
      businessType: 'casual_restaurant',
      location: 'Downtown',
    },
  }), []);

  assert.ok(result.suggestions.every((row) => row.cuisineKey === 'indian'));
  assert.equal(result.suggestions.some((row) => /photo-1552332386|photo-1613514785940/.test(row.previewImage.url || '')), false);
});
