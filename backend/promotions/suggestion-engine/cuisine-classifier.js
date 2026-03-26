function asString(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function classifyCuisine(input = {}, itemProfile = {}, menuSignals = {}) {
  const businessCuisine = asString(input?.businessContext?.cuisineType).toLowerCase();
  const hinted = Array.isArray(itemProfile.cuisineHints) ? itemProfile.cuisineHints : [];
  const menuHint = Array.isArray(menuSignals.extractedItems) ? menuSignals.extractedItems.join(' ') : '';
  const itemConfidence = Number(itemProfile.confidence || 0);

  let primaryCuisine = businessCuisine || hinted[0] || 'american';
  let confidence = businessCuisine ? 0.94 : (hinted.length ? 0.86 : 0.68);

  // Item-aware override: if we strongly understand the item and it conflicts with business cuisine,
  // trust the item for this specific promotion generation.
  if (businessCuisine && hinted[0] && hinted[0] !== businessCuisine && itemConfidence >= 0.85) {
    primaryCuisine = hinted[0];
    confidence = 0.9;
  }

  if (!businessCuisine && /biryani|tikka|masala/.test(menuHint)) {
    primaryCuisine = 'indian';
    confidence = 0.92;
  }
  if (!businessCuisine && /taco|burrito|quesadilla/.test(menuHint)) {
    primaryCuisine = 'mexican';
    confidence = 0.9;
  }

  const styleHintsByCuisine = {
    indian: {
      colorProfile: 'warm_rich_spice',
      presentationStyle: 'rice_texture_forward',
      overlayStyle: 'bold_food_combo_indian',
    },
    mexican: {
      colorProfile: 'vibrant_fresh',
      presentationStyle: 'ingredient_forward',
      overlayStyle: 'bold_food_combo_mexican',
    },
    cafe: {
      colorProfile: 'warm_soft',
      presentationStyle: 'cozy_countertop',
      overlayStyle: 'clean_cafe_spotlight',
    },
    pizza: {
      colorProfile: 'golden_red',
      presentationStyle: 'slice_or_whole_hero',
      overlayStyle: 'bold_pizza_offer',
    },
    desserts: {
      colorProfile: 'bright_soft',
      presentationStyle: 'closeup_texture',
      overlayStyle: 'sweet_spotlight',
    },
    american: {
      colorProfile: 'balanced_warm',
      presentationStyle: 'hero_food_focus',
      overlayStyle: 'modern_offer_clean',
    },
  };

  return {
    primaryCuisine,
    secondaryCuisine: hinted[1] || null,
    styleHints: styleHintsByCuisine[primaryCuisine] || styleHintsByCuisine.american,
    confidence,
  };
}

module.exports = {
  classifyCuisine,
};
