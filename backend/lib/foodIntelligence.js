/**
 * Food classification layer: restaurant + item profiles, prompt rules, templates, validation.
 * Cuisine → dietary type → restrictions → tone → output (enforced server-side).
 */

const FOOD_TYPES = new Set(['veg', 'non_veg', 'egg_based', 'vegan', 'jain', 'unspecified']);
const MEAT_TYPES = new Set(['chicken', 'mutton', 'beef', 'seafood', '']);

function normalizeType(raw) {
  const t = String(raw || 'unspecified').trim().toLowerCase().replace(/-/g, '_');
  return FOOD_TYPES.has(t) ? t : 'unspecified';
}

function normalizeMeat(raw) {
  const m = String(raw || '').trim().toLowerCase();
  return MEAT_TYPES.has(m) ? m : '';
}

/**
 * @param {object} raw
 * @returns {{ type: string, meatType: string, dietaryFlags: { halal?: boolean, containsEgg?: boolean, dairyFree?: boolean } }}
 */
function normalizeFoodProfile(raw) {
  if (!raw || typeof raw !== 'object') {
    return { type: 'unspecified', meatType: '', dietaryFlags: {} };
  }
  const dietaryFlags = raw.dietaryFlags && typeof raw.dietaryFlags === 'object' ? raw.dietaryFlags : {};
  return {
    type: normalizeType(raw.type),
    meatType: normalizeMeat(raw.meatType),
    dietaryFlags: {
      halal: Boolean(dietaryFlags.halal),
      containsEgg: Boolean(dietaryFlags.containsEgg),
      dairyFree: Boolean(dietaryFlags.dairyFree),
    },
  };
}

function inferFromItemName(name) {
  const n = String(name || '').toLowerCase();
  if (!n.trim()) return { type: 'unspecified', meatType: '', dietaryFlags: {} };
  if (/\b(jain)\b/i.test(name)) return { type: 'jain', meatType: '', dietaryFlags: {} };
  if (/\b(vegan)\b/i.test(name)) return { type: 'vegan', meatType: '', dietaryFlags: { dairyFree: true } };
  if (/\b(egg|omelette|omelet|bhurji)\b/i.test(n)) return { type: 'egg_based', meatType: '', dietaryFlags: { containsEgg: true } };
  if (/\b(chicken|murg|tikka)\b/i.test(n)) return { type: 'non_veg', meatType: 'chicken', dietaryFlags: {} };
  if (/\b(beef|steak|burger)\b/i.test(n) && !/\bveg(etarian)?\b/i.test(n)) return { type: 'non_veg', meatType: 'beef', dietaryFlags: {} };
  if (/\b(lamb|mutton|goat)\b/i.test(n)) return { type: 'non_veg', meatType: 'mutton', dietaryFlags: {} };
  if (/\b(fish|prawn|shrimp|salmon|tuna|seafood|crab|lobster)\b/i.test(n)) return { type: 'non_veg', meatType: 'seafood', dietaryFlags: {} };
  if (/\b(paneer|dal|veggie|vegetarian|veg\b|sambar|dosa|idli)\b/i.test(n)) return { type: 'veg', meatType: '', dietaryFlags: {} };
  return { type: 'unspecified', meatType: '', dietaryFlags: {} };
}

/**
 * Merge restaurant default, item override, then name inference for missing type.
 */
function mergeFoodProfiles(restaurantRaw, itemRaw, itemName) {
  const base = normalizeFoodProfile(restaurantRaw);
  const item = normalizeFoodProfile(itemRaw);
  const out = {
    type: item.type !== 'unspecified' ? item.type : base.type,
    meatType: item.meatType || base.meatType,
    dietaryFlags: {
      halal: item.dietaryFlags.halal || base.dietaryFlags.halal,
      containsEgg: item.dietaryFlags.containsEgg || base.dietaryFlags.containsEgg,
      dairyFree: item.dietaryFlags.dairyFree || base.dietaryFlags.dairyFree,
    },
  };
  if (out.type === 'unspecified') {
    const inf = inferFromItemName(itemName);
    if (inf.type !== 'unspecified') {
      out.type = inf.type;
      if (!out.meatType && inf.meatType) out.meatType = inf.meatType;
      if (inf.dietaryFlags.containsEgg) out.dietaryFlags.containsEgg = true;
      if (inf.dietaryFlags.dairyFree) out.dietaryFlags.dairyFree = true;
    }
  }
  if (out.type === 'non_veg' && !out.meatType) {
    const inf = inferFromItemName(itemName);
    if (inf.meatType) out.meatType = inf.meatType;
  }
  if (out.type === 'vegan') {
    out.dietaryFlags.dairyFree = true;
  }
  return out;
}

function buildPromptRulesBlock(profile) {
  const { type, meatType, dietaryFlags } = profile;
  const lines = [];

  lines.push('=== FOOD & DIETARY CONSTRAINTS (MANDATORY) ===');
  if (type === 'unspecified') {
    lines.push('No strict dietary class was set — avoid extreme claims; do not assume meat for unknown items.');
    return lines.join('\n');
  }

  if (type === 'veg') {
    lines.push('This item is VEGETARIAN (no meat, poultry, fish, or seafood).');
    lines.push('FORBIDDEN words/phrases in ANY output field: chicken, meat, steak, beef, pork, lamb, mutton, fish, seafood, shrimp, BBQ ribs, grilled meat, juicy steak, carnivore.');
    lines.push('PREFER: fresh, flavorful, spiced, wholesome, vegetarian delight, plant-forward.');
  } else if (type === 'non_veg') {
    lines.push('This item is NON-VEGETARIAN.');
    if (meatType) {
      lines.push(`Mention or clearly imply the protein type when natural: ${meatType.replace('_', ' ')}.`);
    } else {
      lines.push('Mention the protein or cooking style (e.g. grilled, tender) when it fits the item name.');
    }
    lines.push('PREFER: juicy, tender, grilled, slow-cooked, bold flavors (only if truthful to the item).');
    if (dietaryFlags.halal) {
      lines.push('HALAL: never mention pork, bacon, ham, or alcohol pairings. Prefer "halal" or "halal-friendly" where appropriate.');
    }
  } else if (type === 'egg_based') {
    lines.push('This item is EGG-BASED (contains egg; not vegan).');
    lines.push('FORBIDDEN: claiming "pure veg", "100% vegetarian only", or "vegan".');
    lines.push('PREFER: rich, protein-packed, comfort food, satisfying.');
  } else if (type === 'vegan') {
    lines.push('This item is VEGAN (no animal products: no dairy, egg, honey, ghee, butter, cream, cheese).');
    lines.push('FORBIDDEN: butter, cheese, cream, ghee, milk, dairy, paneer, egg, honey.');
    lines.push('PREFER: plant-based, fresh, clean, dairy-free.');
  } else if (type === 'jain') {
    lines.push('This item is JAIN-FRIENDLY (no onion, no garlic, no root vegetables in description).');
    lines.push('FORBIDDEN: onion, garlic, leek, scallion, shallot, root vegetables.');
    lines.push('PREFER: pure, satvik, light, simple flavors, crafted with care.');
  }

  if (dietaryFlags.halal && type !== 'veg' && type !== 'vegan' && type !== 'jain') {
    lines.push('HALAL service: do not mention pork, bacon, or ham.');
  }

  lines.push('Violating these rules is unacceptable — outputs will be rejected.');
  return lines.join('\n');
}

function buildPosterDietaryLine(profile, itemName) {
  const { type, meatType, dietaryFlags } = profile;
  const parts = [];
  if (type === 'veg') {
    parts.push('The food must be clearly vegetarian — no meat, fish, or seafood visible.');
  } else if (type === 'vegan') {
    parts.push('The dish must look fully plant-based — no cheese pulls, butter gloss, egg, or dairy-forward cues.');
  } else if (type === 'jain') {
    parts.push('Plating should avoid obvious onion/garlic garnish; clean satvik-style presentation.');
  } else if (type === 'egg_based') {
    parts.push('Egg should be visually plausible as part of the dish; not marketed as vegan.');
  } else if (type === 'non_veg') {
    if (meatType === 'seafood') parts.push('Seafood should match the item — no conflicting land meats.');
    else if (meatType) parts.push(`Protein should match ${meatType} — do not show a different animal.`);
    if (dietaryFlags.halal) parts.push('No pork products; halal-appropriate presentation.');
  }
  if (itemName) parts.push(`Subject must match: ${itemName}.`);
  return parts.filter(Boolean).join(' ');
}

const BLOCK_PATTERNS = {
  veg: /\b(chicken|beef|pork|lamb|mutton|steak|seafood|fish|shrimp|prawn|salmon|tuna|crab|lobster|meat\b|bbq\s*ribs|grilled\s+meat|juicy\s+steak|carnivore|bacon|ham)\b/i,
  vegan: /\b(butter|cheese|cream\b|ghee|milk|dairy|paneer|yogurt|mozzarella|cheddar|egg|honey)\b/i,
  jain: /\b(onion|garlic|shallot|leek|scallion)\b/i,
  egg_based: /\b(pure\s*veg|100%\s*vegetarian|vegan\s*only|vegetarian\s*only)\b/i,
  halal: /\b(pork|bacon|ham|prosciutto|chorizo)\b/i,
};

function validateCopyAgainstProfile(profile, texts) {
  const combined = texts.map((t) => String(t || '')).join(' ');
  const violations = [];
  const { type, dietaryFlags } = profile;

  if (type === 'veg' && BLOCK_PATTERNS.veg.test(combined)) {
    violations.push('veg item must not mention meat/fish/seafood');
  }
  if (type === 'vegan' && BLOCK_PATTERNS.vegan.test(combined)) {
    violations.push('vegan item must not mention dairy/egg/honey');
  }
  if (type === 'jain' && BLOCK_PATTERNS.jain.test(combined)) {
    violations.push('jain item must not mention onion/garlic');
  }
  if (type === 'egg_based' && BLOCK_PATTERNS.egg_based.test(combined)) {
    violations.push('egg-based item must not claim pure veg/vegan only');
  }
  if (dietaryFlags.halal && BLOCK_PATTERNS.halal.test(combined)) {
    violations.push('halal profile must not mention pork/bacon/ham');
  }
  if (type === 'non_veg' && dietaryFlags.halal && BLOCK_PATTERNS.halal.test(combined)) {
    violations.push('halal non-veg must not mention pork');
  }

  return { ok: violations.length === 0, violations };
}

function pickTemplate(profile, tone) {
  const { type, meatType, dietaryFlags } = profile;
  const meat = meatType ? meatType.replace('_', ' ') : 'protein';
  const isPremium = tone === 'premium';
  const isBold = tone === 'bold';

  if (type === 'veg') {
    if (isPremium) return `A refined vegetarian take on {item} — fresh, balanced, and full of flavor.`;
    if (isBold) return `Fresh, spiced, and impossible to ignore — your {item} is calling.`;
    return `Fresh, flavorful, and made to satisfy — your {item} is ready.`;
  }
  if (type === 'non_veg') {
    const halalBit = dietaryFlags.halal ? 'halal ' : '';
    if (dietaryFlags.halal) {
      return `Fresh ${halalBit}${meat}, perfectly spiced — made for your cravings. Try our {item}.`;
    }
    if (isPremium) return `A refined take on tender ${meat} — {item} crafted for a rich experience.`;
    if (isBold) return `Bold flavors, tender ${meat} — {item} done right. Grab yours today.`;
    return `Juicy ${meat}, perfectly spiced — made for your cravings. Discover {item}.`;
  }
  if (type === 'vegan') {
    return `Plant-based, fresh, and full of flavor — {item} made for your kind of cravings.`;
  }
  if (type === 'egg_based') {
    return `Rich, comforting, and made fresh — your egg favorite {item} is here.`;
  }
  if (type === 'jain') {
    return `Pure, simple, and full of authentic flavor — {item}, made the right way.`;
  }
  return `Come try {item} — made fresh for you today.`;
}

function fillTemplate(template, item) {
  return template.replace(/\{item\}/g, String(item || 'this dish')).replace(/\{meatType\}/g, String(item || ''));
}

function buildOfferContext(offerType, discountValue, comboDescription) {
  if (offerType === 'discount' && discountValue) return `${discountValue} off`;
  if (offerType === 'bogo') return 'Buy 1 Get 1 Free';
  if (offerType === 'combo') return comboDescription || 'Special combo deal';
  return '';
}

/**
 * Template-based copy when AI fails or validation rejects output.
 */
function buildTemplateCopy({
  item,
  offerType,
  discountValue,
  tone,
  audiencePrimary = 'general',
  campaignGoal = 'traffic',
  brandTone = '',
  comboDescription = '',
  foodProfile,
}) {
  const profile = foodProfile || { type: 'unspecified', meatType: '', dietaryFlags: {} };
  const offerCtx = buildOfferContext(offerType, discountValue, comboDescription);
  const line = pickTemplate(profile, tone);
  const offerLine = fillTemplate(line, item);
  const toneMap = {
    friendly: { cta: 'Show this code to redeem. Visit us today!' },
    bold: { cta: 'Show this code to redeem. Grab it now!' },
    premium: { cta: 'Show this code to redeem. Reserve your table.' },
  };
  const t = toneMap[tone] || toneMap.friendly;
  const aud = audiencePrimary === 'families' ? ' Perfect for sharing.' : '';
  const goal = campaignGoal === 'repeat_visits' ? ' We would love to see you again.' : '';
  const brand = brandTone ? ` ${String(brandTone).slice(0, 50)}` : '';

  const headline = offerCtx
    ? `${offerCtx.toUpperCase()} — ${String(item || 'SPECIAL').toUpperCase()}`
    : String(item || 'SPECIAL').toUpperCase();

  return {
    headline: headline.slice(0, 80),
    offerLine: `${offerLine}${offerCtx ? ` — ${offerCtx}.` : '.'}${aud}${brand ? '' : ''}`.slice(0, 200),
    cta: `${t.cta}${goal}`.slice(0, 100),
  };
}

module.exports = {
  normalizeFoodProfile,
  mergeFoodProfiles,
  inferFromItemName,
  buildPromptRulesBlock,
  buildPosterDietaryLine,
  validateCopyAgainstProfile,
  buildTemplateCopy,
  FOOD_TYPES: Array.from(FOOD_TYPES),
};
