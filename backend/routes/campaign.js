const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const foodIntelligence = require('../lib/foodIntelligence');

const CACHE_DIR = path.join(__dirname, '..', 'db', 'ai-cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

function isDevMode() {
  return String(process.env.DEV_MODE || '').toLowerCase() === 'true';
}

function getCacheKey(prefix, params) {
  const raw = JSON.stringify(params);
  let hash = 0;
  for (let i = 0; i < raw.length; i++) { hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0; }
  return `${prefix}_${Math.abs(hash).toString(36)}`;
}

function readCache(key) {
  try {
    const file = path.join(CACHE_DIR, `${key}.json`);
    if (!fs.existsSync(file)) return null;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Date.now() - data.ts > 7 * 24 * 60 * 60 * 1000) return null;
    return data.value;
  } catch { return null; }
}

function writeCache(key, value) {
  try {
    const file = path.join(CACHE_DIR, `${key}.json`);
    fs.writeFileSync(file, JSON.stringify({ ts: Date.now(), value }));
  } catch { /* ignore */ }
}

function audienceCopyBrief(audiencePrimary) {
  const map = {
    general: 'general local diners',
    families: 'families — value, sharing, welcoming, kid-friendly energy without being childish',
    young_professionals: 'busy young professionals — speed, lunch breaks, efficiency, modern',
    students: 'students — great value, generous portions, casual fun',
    tourists: 'visitors and tourists — signature experience, memorable, approachable intro to the cuisine',
    regulars: 'loyal regulars — appreciation, warmth, "your neighborhood spot" familiarity',
    new_nearby: 'people new to the area — discovery, welcome, first-visit hook',
  };
  return map[audiencePrimary] || map.general;
}

function audiencePosterBrief(audiencePrimary) {
  const map = {
    general: 'authentic busy-restaurant atmosphere',
    families: 'shared plates or family-style table, warm casual lighting, welcoming',
    young_professionals: 'quick-service or counter vibe, clean modern lines, daytime energy',
    students: 'casual energetic hangout feel, approachable plating',
    tourists: 'memorable "destination bite" presentation, traveler-friendly clarity',
    regulars: 'cozy familiar neighborhood table, understated premium care',
    new_nearby: 'bright inviting "come try us" first-impression plating',
  };
  return map[audiencePrimary] || map.general;
}

function campaignGoalBrief(goal) {
  const map = {
    traffic: 'primary goal: drive more foot traffic and walk-ins',
    aov: 'primary goal: increase average order size and upsells',
    redemption: 'primary goal: move specific menu items / clear inventory',
    repeat_visits: 'primary goal: bring guests back and build habit',
  };
  return map[goal] || map.traffic;
}

function parseMergedFoodProfile(body) {
  const item = String(body.item || '').trim();
  const restaurant = body.restaurantFoodProfile || body.foodProfile || {};
  const itemFp = body.itemFoodProfile || {};
  return foodIntelligence.mergeFoodProfiles(restaurant, itemFp, item);
}

function registerCampaignRoutes(app) {

  app.post('/api/campaign/generate', async (req, res) => {
    const body = req.body || {};
    const intent = String(body.intent || 'dish').trim();
    const item = String(body.item || 'Chef Special').trim();
    const offerType = String(body.offerType || 'no_discount').trim();
    const discountValue = String(body.discountValue || '').trim();
    const comboDescription = String(body.comboDescription || '').trim();
    const tone = String(body.tone || 'friendly').trim();
    const restaurantName = String(body.restaurantName || 'Restaurant').trim();
    const cuisineType = String(body.cuisineType || '').trim();
    const brandTone = String(body.brandTone || '').trim();
    const audiencePrimary = String(body.audiencePrimary || 'general').trim().toLowerCase() || 'general';
    const campaignGoal = String(body.campaignGoal || 'traffic').trim().toLowerCase() || 'traffic';
    const storeId = String(body.storeId || 'store123').trim();

    const imageKeywords = String(body.imageKeywords || '').trim();
    const foodProfile = parseMergedFoodProfile(body);

    const [copyResult, posterResult, qrResult] = await Promise.allSettled([
      generateCopy({
        intent, item, offerType, discountValue, comboDescription, tone, restaurantName, cuisineType,
        brandTone, audiencePrimary, campaignGoal, foodProfile,
      }),
      generatePoster({
        intent, item, offerType, discountValue, tone, restaurantName, cuisineType, imageKeywords,
        audiencePrimary, campaignGoal, brandTone, foodProfile,
        skipPosterCache: false,
      }),
      generateQR(storeId, item),
    ]);

    const copy = copyResult.status === 'fulfilled' ? copyResult.value : buildCopyFallback({
      item, offerType, discountValue, tone, audiencePrimary, campaignGoal, brandTone, comboDescription, foodProfile,
    });
    const poster = posterResult.status === 'fulfilled' ? posterResult.value : { imageUrl: '', source: 'none' };
    const qr = qrResult.status === 'fulfilled' ? qrResult.value : '';

    if (posterResult.status === 'rejected') console.error('[campaign/generate] poster failed:', posterResult.reason?.message);
    if (copyResult.status === 'rejected') console.error('[campaign/generate] copy failed:', copyResult.reason?.message);

    return res.json({
      headline: copy.headline,
      offerLine: copy.offerLine,
      cta: copy.cta,
      posterImageUrl: poster.imageUrl,
      posterSource: poster.source,
      qrDataUrl: qr,
      suggestedChannels: ['Instagram Post', 'In-store QR'],
      suggestedDuration: 7,
    });
  });

  app.post('/api/campaign/regenerate', async (req, res) => {
    const body = req.body || {};
    const target = String(body.regenerateTarget || 'all').trim();
    const intent = String(body.intent || 'dish').trim();
    const item = String(body.item || 'Chef Special').trim();
    const offerType = String(body.offerType || 'no_discount').trim();
    const discountValue = String(body.discountValue || '').trim();
    const comboDescription = String(body.comboDescription || '').trim();
    const tone = String(body.tone || 'friendly').trim();
    const restaurantName = String(body.restaurantName || 'Restaurant').trim();
    const cuisineType = String(body.cuisineType || '').trim();
    const brandTone = String(body.brandTone || '').trim();
    const audiencePrimary = String(body.audiencePrimary || 'general').trim().toLowerCase() || 'general';
    const campaignGoal = String(body.campaignGoal || 'traffic').trim().toLowerCase() || 'traffic';
    const imageKeywords = String(body.imageKeywords || '').trim();
    const foodProfile = parseMergedFoodProfile(body);

    try {
      const result = {};

      if (target === 'copy' || target === 'all') {
        const copy = await generateCopy({
          intent, item, offerType, discountValue, comboDescription, tone, restaurantName, cuisineType,
          brandTone, audiencePrimary, campaignGoal, foodProfile,
        });
        result.headline = copy.headline;
        result.offerLine = copy.offerLine;
        result.cta = copy.cta;
      }

      if (target === 'poster' || target === 'all') {
        const poster = await generatePoster({
          intent, item, offerType, discountValue, tone, restaurantName, cuisineType, imageKeywords,
          audiencePrimary, campaignGoal, brandTone, foodProfile,
          skipPosterCache: true,
        });
        result.posterImageUrl = poster.imageUrl;
        result.posterSource = poster.source;
      }

      return res.json(result);
    } catch (error) {
      console.error('[campaign/regenerate] failed:', error.message);
      if (target === 'copy' || target === 'all') {
        const fallback = buildCopyFallback({
          item, offerType, discountValue, tone, audiencePrimary, campaignGoal, brandTone, comboDescription, foodProfile,
        });
        return res.json({ ...fallback, posterImageUrl: '', posterSource: 'fallback' });
      }
      return res.json({ posterImageUrl: '', posterSource: 'fallback' });
    }
  });
}

function buildOfferContext(offerType, discountValue, comboDescription) {
  if (offerType === 'discount' && discountValue) return `${discountValue} off`;
  if (offerType === 'bogo') return 'Buy 1 Get 1 Free';
  if (offerType === 'combo') return comboDescription || 'Special combo deal';
  return '';
}

function buildCopyFallback({
  item, offerType, discountValue, tone, audiencePrimary = 'general', campaignGoal = 'traffic', brandTone = '',
  comboDescription = '', foodProfile,
}) {
  const fp = foodProfile || foodIntelligence.mergeFoodProfiles({}, {}, item);
  return foodIntelligence.buildTemplateCopy({
    item,
    offerType,
    discountValue,
    tone,
    audiencePrimary,
    campaignGoal,
    brandTone,
    comboDescription,
    foodProfile: fp,
  });
}

async function generateCopy({
  intent, item, offerType, discountValue, comboDescription, tone, restaurantName, cuisineType,
  brandTone = '', audiencePrimary = 'general', campaignGoal = 'traffic', foodProfile,
}) {
  const fp = foodProfile || foodIntelligence.mergeFoodProfiles({}, {}, item);
  if (isDevMode()) {
    console.log('[DEV_MODE] Skipping copy API — using smart fallback ($0)');
    return buildCopyFallback({
      item, offerType, discountValue, tone, audiencePrimary, campaignGoal, brandTone, comboDescription, foodProfile: fp,
    });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return buildCopyFallback({
      item, offerType, discountValue, tone, audiencePrimary, campaignGoal, brandTone, comboDescription, foodProfile: fp,
    });
  }

  const cacheKey = getCacheKey('copy', {
    intent, item, offerType, discountValue, tone, restaurantName, audiencePrimary, campaignGoal,
    brandTone: String(brandTone).slice(0, 60),
    food: JSON.stringify(fp),
  });
  const cached = readCache(cacheKey);
  if (cached) { console.log('[cache] copy hit'); return cached; }

  const offerContext = buildOfferContext(offerType, discountValue, comboDescription);
  const intentMap = { dish: 'promoting a specific dish', deal: 'running a deal or discount', new_launch: 'launching a new item', surprise: 'boosting walk-in traffic' };
  const toneMap = { friendly: 'warm, inviting, conversational', bold: 'urgent, action-oriented, FOMO-driven', premium: 'elegant, refined, exclusive' };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content: [
              'You are a restaurant marketing copywriter. Write short, punchy promotional copy.',
              'Return ONLY a JSON object with keys: headline (max 8 words, uppercase), offerLine (max 15 words), cta (max 10 words).',
              'No markdown, no explanation. Do not invent statistics or demographics.',
              foodIntelligence.buildPromptRulesBlock(fp),
            ].join('\n\n'),
          },
          {
            role: 'user',
            content: [
              `Restaurant: ${restaurantName}`,
              cuisineType ? `Cuisine: ${cuisineType}` : '',
              brandTone ? `Owner brand voice notes: ${brandTone}` : '',
              `Campaign intent: ${intentMap[intent] || 'promoting a dish'}`,
              `Business objective: ${campaignGoalBrief(campaignGoal)}`,
              `Primary audience to speak to: ${audienceCopyBrief(audiencePrimary)}`,
              `Item: ${item}`,
              offerContext ? `Offer: ${offerContext}` : 'No discount — just promote the item',
              `Tone: ${toneMap[tone] || toneMap.friendly}`,
              'Write headline, offerLine, and cta as JSON. Obey all FOOD & DIETARY CONSTRAINTS strictly.',
            ].filter(Boolean).join('\n'),
          },
        ],
      }),
    });

    if (!response.ok) throw new Error(`OpenAI copy error ${response.status}`);
    const data = await response.json();
    const content = (data.choices?.[0]?.message?.content || '').trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return buildCopyFallback({
        item, offerType, discountValue, tone, audiencePrimary, campaignGoal, brandTone, comboDescription, foodProfile: fp,
      });
    }
    const parsed = JSON.parse(jsonMatch[0]);
    let result = {
      headline: String(parsed.headline || '').slice(0, 80) || item.toUpperCase(),
      offerLine: String(parsed.offerLine || '').slice(0, 120) || `Try our ${item} today`,
      cta: String(parsed.cta || '').slice(0, 80) || 'Show this code to redeem',
    };
    const check = foodIntelligence.validateCopyAgainstProfile(fp, [result.headline, result.offerLine, result.cta]);
    if (!check.ok) {
      console.warn('[campaign] copy failed dietary validation:', check.violations.join('; '));
      result = buildCopyFallback({
        item, offerType, discountValue, tone, audiencePrimary, campaignGoal, brandTone, comboDescription, foodProfile: fp,
      });
    }
    writeCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[campaign] copy generation failed:', error.message);
    return buildCopyFallback({
      item, offerType, discountValue, tone, audiencePrimary, campaignGoal, brandTone, comboDescription, foodProfile: fp,
    });
  }
}

async function generatePoster({
  intent, item, offerType, discountValue, tone, restaurantName, cuisineType, imageKeywords,
  audiencePrimary = 'general', campaignGoal = 'traffic', brandTone = '', foodProfile,
  skipPosterCache = false,
}) {
  const fp = foodProfile || foodIntelligence.mergeFoodProfiles({}, {}, item);
  const dietaryVisual = foodIntelligence.buildPosterDietaryLine(fp, item);
  if (isDevMode()) {
    const kw = String(imageKeywords || '').trim().slice(0, 80);
    let h = 0;
    for (let i = 0; i < kw.length; i += 1) h = ((h << 5) - h + kw.charCodeAt(i)) | 0;
    const sig = `${Date.now()}-${Math.abs(h)}`;
    const terms = [item || 'restaurant food', kw].filter(Boolean).join(' ');
    const query = encodeURIComponent(terms.slice(0, 200));
    const freeUrl = `https://source.unsplash.com/1024x1024/?${query}&sig=${sig}`;
    console.log('[DEV_MODE] Skipping DALL-E — using Unsplash placeholder ($0)');
    return { imageUrl: freeUrl, source: 'dev-placeholder' };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return { imageUrl: '', source: 'none' };

  const cacheKey = getCacheKey('poster', {
    item, tone, cuisineType, imageKeywords, audiencePrimary, campaignGoal, brandTone: String(brandTone).slice(0, 40),
    food: JSON.stringify(fp),
  });
  if (!skipPosterCache) {
    const cached = readCache(cacheKey);
    if (cached) { console.log('[cache] poster hit'); return cached; }
  }

  const offerContext = buildOfferContext(offerType, discountValue, '');
  const toneStyle = {
    friendly: 'warm golden-hour window light, cozy casual restaurant, welcoming',
    bold: 'dramatic side-lighting, dark moody background, rich contrast, vibrant colors',
    premium: 'soft diffused light, elegant muted palette, fine-dining ambiance, sophisticated',
  };
  const style = toneStyle[tone] || toneStyle.friendly;

  const angles = [
    'Shot from a slight 30-degree angle, like a guest sitting across the table',
    'Overhead 45-degree angle, like someone leaning in to take a photo before eating',
    'Eye-level close-up, as if the plate was just placed in front of you',
  ];
  const angle = angles[Math.floor(Math.random() * angles.length)];

  const sceneMood = audiencePosterBrief(audiencePrimary);
  const goalMood = ` Subtle mood for the shot (no text, optional empty background blur): ${campaignGoalBrief(campaignGoal)}.`;

  const prompt = [
    `A real photograph of ${item} at a restaurant, taken by a human with a Canon EOS R5, 50mm f/1.4 lens.`,
    dietaryVisual ? `CRITICAL dietary / plating accuracy: ${dietaryVisual}` : '',
    cuisineType ? `Authentic ${cuisineType} cuisine — traditional plating, real serving dish, correct garnish for the culture.` : '',
    imageKeywords ? `Owner specifically wants (visual cues only — interpret loosely; this is a single still photo, not video or audio): ${imageKeywords}.` : '',
    imageKeywords
      ? 'If the owner mentions music, sound, Reels, Instagram effects, or animation, ignore those — no audio, no motion, no UI overlays. Translate "smoke" or "dramatic Insta vibe" into real food photography only (e.g. steam, subtle haze, backlight, moody lighting).'
      : '',
    offerContext ? `Plating should suit a ${offerContext} style promotion.` : '',
    brandTone ? `Overall brand vibe (do not render text): ${String(brandTone).slice(0, 120)}.` : '',
    `Setting and atmosphere: ${sceneMood}.${goalMood}`,
    `${angle}.`,
    `Lighting and mood: ${style}.`,
    'This must look like a real photo a food blogger would post on Instagram — NOT an AI render.',
    'Natural imperfections: slight asymmetry in plating, a small crumb on the plate edge, condensation on a glass nearby, visible wood grain or linen texture on the table.',
    'Shallow depth of field with soft bokeh in the background — out-of-focus restaurant ambiance, maybe another plate or a candle.',
    'Real-world details: actual cutlery partially in frame, a cloth napkin, the edge of another dish, natural shadows.',
    'The food should look freshly served — steam rising, sauce glistening, herbs looking just-placed.',
    'Color grading: slightly warm, like a photo edited in Lightroom with a natural film look. Not oversaturated, not too perfect.',
    'ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO LOGOS, NO WATERMARKS, NO GRAPHIC ELEMENTS anywhere.',
    'Square 1:1 composition. The dish is the clear subject but not perfectly centered — slightly off-center like a real photo.',
  ].filter(Boolean).join(' ');

  const model = process.env.OPENAI_IMAGE_MODEL || 'dall-e-3';
  const useB64 = model === 'dall-e-3';

  try {
    const useHd = process.env.OPENAI_IMAGE_QUALITY !== 'standard';
    const requestBody = {
      model,
      prompt,
      size: '1024x1024',
      n: 1,
      style: 'natural',
    };
    if (useB64) requestBody.response_format = 'b64_json';
    if (model === 'dall-e-3' && useHd) requestBody.quality = 'hd';

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error('[campaign] poster API error:', response.status, errBody.slice(0, 300));
      throw new Error(`OpenAI image error ${response.status}`);
    }
    const payload = await response.json();
    const row = Array.isArray(payload.data) ? payload.data[0] : null;
    const imageUrl = row?.b64_json
      ? `data:image/png;base64,${row.b64_json}`
      : (row?.url || '');
    if (!imageUrl) throw new Error('No image returned from API');
    const posterResult = { imageUrl, source: 'ai' };
    writeCache(cacheKey, posterResult);
    return posterResult;
  } catch (error) {
    console.error('[campaign] poster generation failed:', error.message);
    return { imageUrl: '', source: 'none' };
  }
}

async function generateQR(storeId, item) {
  const redeemUrl = `http://localhost:3000/redeem/${encodeURIComponent(storeId)}?item=${encodeURIComponent(item)}`;
  return QRCode.toDataURL(redeemUrl, { width: 200, margin: 2 }).catch(() => '');
}

module.exports = { registerCampaignRoutes };
