function clamp(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  if (num < 0) return 0;
  if (num > 1) return 1;
  return Number(num.toFixed(2));
}

function scoreTagOverlap(expectedTags = [], promptText = '') {
  const prompt = String(promptText || '').toLowerCase();
  const tags = Array.from(new Set((Array.isArray(expectedTags) ? expectedTags : []).map((t) => String(t || '').toLowerCase()).filter(Boolean)));
  if (!tags.length) return 0.5;
  const hits = tags.filter((tag) => prompt.includes(tag)).length;
  return clamp((hits / tags.length) * 0.9 + 0.1);
}

function scorePromoMatch(compositionType = '', visualIntent = '', promptText = '') {
  const corpus = `${compositionType} ${visualIntent} ${promptText}`.toLowerCase();
  const comboSignal = compositionType === 'hero_combo' && /combo|drink|side/.test(corpus);
  const familySignal = compositionType === 'family_tray' && /family|tray|serving/.test(corpus);
  const premiumSignal = compositionType === 'premium_plated' && /premium|plated|clean/.test(corpus);
  const textSignal = compositionType === 'text_offer_focus' && /negative space|offer/.test(corpus);
  if (comboSignal || familySignal || premiumSignal || textSignal) return 0.9;
  return 0.62;
}

function scoreUniqueness(suggestion, peerSuggestions = []) {
  const peers = peerSuggestions.filter((row) => row && row.id !== suggestion.id);
  if (!peers.length) return 0.9;
  const duplicateVisual = peers.some((row) => row.visualIntent === suggestion.visualIntent);
  const duplicateComposition = peers.some((row) => row.compositionType === suggestion.compositionType);
  const duplicateImage = peers.some((row) => row.previewImage?.url && row.previewImage.url === suggestion.previewImage?.url);
  if (duplicateImage) return 0.35;
  if (duplicateVisual && duplicateComposition) return 0.45;
  if (duplicateVisual || duplicateComposition) return 0.65;
  return 0.9;
}

function validateSuggestionPreview({ suggestion, promptPackage, cuisineProfile, peers }) {
  const promptText = `${promptPackage?.positivePrompt || ''} ${promptPackage?.negativePrompt || ''}`;
  let itemMatchScore = scoreTagOverlap(promptPackage?.expectedFoodTags, promptText);
  const cuisineTag = String(cuisineProfile?.primaryCuisine || '').toLowerCase();
  const imageUrl = String(suggestion?.previewImage?.url || '').toLowerCase();
  const promptCuisineScore = clamp(cuisineTag ? (promptText.toLowerCase().includes(cuisineTag) ? 0.94 : 0.4) : 0.65);
  let imageCuisinePenalty = 0;
  if (cuisineTag === 'indian' && /(taco|burrito|quesadilla|photo-1552332386|photo-1613514785940)/.test(imageUrl)) {
    imageCuisinePenalty = 0.45;
  }
  if (cuisineTag === 'mexican' && /(biryani|masala|tikka|photo-1596797038530|photo-1603894584373)/.test(imageUrl)) {
    imageCuisinePenalty = 0.35;
  }
  const cuisineMatchScore = clamp(promptCuisineScore - imageCuisinePenalty);
  const itemKey = String(suggestion?.itemKey || '').toLowerCase();
  const itemImagePenaltyByKey = {
    biryani: /(taco|burrito|burger|photo-1552332386|photo-1613514785940)/,
    taco_combo: /(biryani|masala|tikka|ice-cream|gelato|photo-1596797038530)/,
    dessert: /(biryani|taco|burger|pizza-slice|savory)/,
    ice_cream: /(biryani|taco|burger|pizza|bowl-meal|photo-1603894584373)/,
    pasta: /(taco|biryani|ice-cream|gelato|burger|photo-1603894584373|photo-1552332386)/,
    salad: /(biryani|taco|pizza|ice-cream|burger|fried-rice|photo-1603894584373)/,
    pizza: /(biryani|taco|ice-cream|dessert-cup)/,
  };
  const keyPenaltyPattern = itemImagePenaltyByKey[itemKey];
  if (keyPenaltyPattern && keyPenaltyPattern.test(imageUrl)) {
    itemMatchScore = clamp(itemMatchScore - 0.42);
  }
  const promoVisualMatchScore = scorePromoMatch(suggestion.compositionType, suggestion.visualIntent, promptText);
  const uniquenessScore = scoreUniqueness(suggestion, peers);
  const overallPreviewTrustScore = clamp((itemMatchScore * 0.34) + (cuisineMatchScore * 0.26) + (promoVisualMatchScore * 0.24) + (uniquenessScore * 0.16));
  const isAccepted = overallPreviewTrustScore >= 0.68 && itemMatchScore >= 0.58 && cuisineMatchScore >= 0.55;

  return {
    itemMatchScore,
    cuisineMatchScore,
    promoVisualMatchScore,
    uniquenessScore,
    overallPreviewTrustScore,
    isAccepted,
  };
}

module.exports = {
  validateSuggestionPreview,
};
