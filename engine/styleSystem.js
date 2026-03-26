function scorePreset(designBrief, presetId) {
  const style = String(designBrief.visualStyle || '').toLowerCase();
  const refinement = String(designBrief.refinementChoice || '').toLowerCase();
  const itemCount = Array.isArray(designBrief.itemNames) && designBrief.itemNames.length
    ? designBrief.itemNames.length
    : 1;

  let score = 0;

  if (presetId === 'dark-premium') {
    if (style.includes('dark') || style.includes('premium')) score += 4;
    if (refinement.includes('premium')) score += 3;
    if (designBrief.backgroundMode === 'dark') score += 2;
  }

  if (presetId === 'bold-promo') {
    if (style.includes('bright') || style.includes('fun')) score += 4;
    if (style.includes('text heavy')) score += 2;
    if (refinement.includes('bolder') || refinement.includes('highlight')) score += 3;
    if (itemCount >= 3) score += 4;
  }

  if (presetId === 'minimal-clean') {
    if (style.includes('minimal') || style.includes('clean')) score += 4;
    if (refinement.includes('cleaner')) score += 3;
    if (designBrief.textDensity === 'more_image') score += 2;
    if (itemCount === 2) score += 2;
  }

  if (presetId === 'dark-premium' && itemCount === 1) score += 2;

  if (designBrief.refinementChoice === 'Make it more fun' && presetId === 'bold-promo') score += 2;
  if (designBrief.refinementChoice === 'Make it more premium' && presetId === 'dark-premium') score += 2;

  return score;
}

function resolvePresetId(designBrief, preferredPresetId) {
  if (preferredPresetId) return preferredPresetId;
  const itemCount = Array.isArray(designBrief.itemNames) && designBrief.itemNames.length
    ? designBrief.itemNames.length
    : 1;
  if (itemCount >= 4) return 'bold-promo';

  const candidates = ['dark-premium', 'bold-promo', 'minimal-clean'];
  return candidates
    .map((id) => ({ id, score: scorePreset(designBrief, id) }))
    .sort((a, b) => b.score - a.score)[0].id;
}

function styleTokens(designBrief, presetId) {
  const backgroundMode = designBrief.backgroundMode === 'light' ? 'light' : 'dark';

  const base = {
    themeName: presetId,
    foreground: backgroundMode === 'dark' ? '#f8fafc' : '#111827',
    subForeground: backgroundMode === 'dark' ? '#cbd5e1' : '#374151',
    background: backgroundMode === 'dark' ? '#0f172a' : '#f8fafc',
    accent: '#f97316',
    fontFamily: designBrief.fontMood === 'elegant' ? 'Playfair Display, serif' : 'Anton, sans-serif',
  };

  if (presetId === 'bold-promo') {
    return {
      ...base,
      background: '#111827',
      foreground: '#fff7ed',
      subForeground: '#fdba74',
      accent: '#fb7185',
    };
  }

  if (presetId === 'minimal-clean') {
    return {
      ...base,
      background: '#f8fafc',
      foreground: '#0f172a',
      subForeground: '#475569',
      accent: '#0891b2',
      fontFamily: designBrief.fontMood === 'bold' ? 'Oswald, sans-serif' : 'Cormorant Garamond, serif',
    };
  }

  return {
    ...base,
    background: '#0b1120',
    foreground: '#f1f5f9',
    subForeground: '#cbd5e1',
    accent: '#f59e0b',
  };
}

module.exports = {
  resolvePresetId,
  styleTokens,
};
