function moodTone(mood = '') {
  const normalized = String(mood || '').toLowerCase();
  if (normalized === 'premium') return 'minimal, elegant, clean';
  if (normalized === 'fun') return 'bright, colorful, playful';
  return 'bold, high contrast, appetite-forward';
}

function compositionInstructions(compositionType = '') {
  if (compositionType === 'hero_combo') return 'show main dish with paired drink/side in a combo context and clear negative space for offer headline';
  if (compositionType === 'family_tray') return 'show larger family-size serving or tray with generous portioning and value-oriented framing';
  if (compositionType === 'premium_plated') return 'single premium plated hero with clean background and launch-style composition';
  if (compositionType === 'text_offer_focus') return 'balanced food subject with extra clean negative space for retention offer messaging';
  return 'single hero food composition with mobile-first readability and negative space for text overlay';
}

function buildPromptPackage(input, itemProfile, cuisineProfile, suggestion) {
  const item = itemProfile.itemName || input.itemDescription;
  const cuisine = cuisineProfile.primaryCuisine || input.businessContext.cuisineType || 'restaurant';
  const businessType = input.businessContext.businessType || 'restaurant';
  const tone = moodTone(input.mood);
  const composition = compositionInstructions(suggestion.compositionType);
  const style = input.stylePreferences || {};
  const userIntent = input.userIntent && typeof input.userIntent === 'object' ? input.userIntent : {};
  const userIntentRaw = String(userIntent.rawText || '').trim();
  const userIntentTags = Array.isArray(userIntent.tags) ? userIntent.tags : [];

  const positivePrompt = [
    `High-quality realistic food photography of ${item}.`,
    `Cuisine styling: ${cuisine}. Business type context: ${businessType}.`,
    `Promotion goal: ${suggestion.promoType}. Target moment: ${suggestion.targetMoment}.`,
    composition + '.',
    `Visual style preference: ${style.visualStyle || 'Premium'}.`,
    `Layout preference: ${style.layoutStyle || 'Half image + text'}.`,
    `Copy tone preference: ${style.toneStyleChoice || 'Friendly Local'}.`,
    `Font mood preference: ${style.fontStyleChoice || 'Modern Sans'}.`,
    userIntentRaw ? `Owner intent guidance: ${userIntentRaw}.` : '',
    userIntentTags.length ? `Owner intent tags: ${userIntentTags.join(', ')}.` : '',
    `Visual tone: ${tone}.`,
    'Natural lighting, realistic textures, social media ready quality.',
    'Include safe negative space for text overlay, readable on mobile.',
    'Avoid cluttered edges and keep central composition suitable for poster and story crops.',
  ].join(' ');

  const negativePrompt = [
    'No cartoon style, no surreal food, no plastic texture.',
    'No unrelated cuisine items, no tacos/burgers unless requested item is that cuisine.',
    'No clutter, no text artifacts, no distorted plates.',
  ].join(' ');

  return {
    positivePrompt,
    negativePrompt,
    visualBehavior: suggestion.visualIntent,
    expectedFoodTags: suggestion.expectedFoodTags || itemProfile.expectedFoodTags || [],
    compositionType: suggestion.compositionType,
  };
}

module.exports = {
  buildPromptPackage,
};
