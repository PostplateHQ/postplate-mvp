const { OpenAIImageGenerationProvider } = require('../../engine/providerRegistry');

function isDevMode() {
  return String(process.env.DEV_MODE || '').toLowerCase() === 'true';
}

function menuVisionModel() {
  return String(process.env.OPENAI_MENU_VISION_MODEL || 'gpt-4o-mini').trim() || 'gpt-4o-mini';
}

function dataUrlImageMime(imageDataUrl) {
  const m = String(imageDataUrl).match(/^data:(image\/[a-z0-9+.+-]+);base64,/i);
  return m ? m[1] : 'image/jpeg';
}

function buildDishImagePrompt(itemName, note, restaurantName, cuisineType) {
  const parts = [
    'Food photo that looks human-shot and appetizing: natural light, shallow depth of field, believable texture and steam where appropriate,',
    'not overly perfect or CGI-like; restaurant-quality plating, no text or logos, no watermarks.',
    `Main subject: ${itemName}.`,
  ];
  if (note) parts.push(`Dish details: ${String(note).slice(0, 200)}.`);
  if (cuisineType) parts.push(`Cuisine: ${String(cuisineType).trim().slice(0, 80)}.`);
  if (restaurantName) {
    parts.push(`Style suited for a restaurant like ${String(restaurantName).trim().slice(0, 80)} (no readable words in the image).`);
  }
  return parts.join(' ');
}

function registerMenuRoutes(app) {

  app.post('/api/menu/improve-description', async (req, res) => {
    const body = req.body || {};
    const itemName = typeof body.itemName === 'string' ? body.itemName.trim() : '';
    const currentDesc = typeof body.currentDescription === 'string' ? body.currentDescription.trim() : '';
    const sectionName = typeof body.sectionName === 'string' ? body.sectionName.trim() : '';
    const restaurantName = typeof body.restaurantName === 'string' ? body.restaurantName.trim() : '';

    if (!itemName) {
      return res.status(400).json({ error: 'itemName is required', description: '' });
    }

    if (isDevMode()) {
      console.log('[DEV_MODE] Skipping description API — using fallback ($0)');
      return res.json({ description: `Freshly prepared ${itemName}, crafted with care using the finest ingredients.`, source: 'dev' });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      const fallback = currentDesc && !currentDesc.includes('Lorem') ? currentDesc : `Freshly prepared ${itemName}, crafted with care.`;
      return res.json({ description: fallback, source: 'fallback' });
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 200,
          messages: [
            {
              role: 'system',
              content: 'You are a restaurant menu copywriter. Write an appetizing, concise menu item description in plain English (1 sentence, max 100 characters). Describe the taste, ingredients, or cooking style. NEVER use placeholder text like Lorem ipsum. NEVER use quotes. Return ONLY the description text, nothing else.',
            },
            {
              role: 'user',
              content: [
                `Menu item: ${itemName}`,
                sectionName ? `Section: ${sectionName}` : '',
                restaurantName ? `Restaurant: ${restaurantName}` : '',
                currentDesc ? `Current description: ${currentDesc}` : '',
                'Write an improved, appetizing menu description for this item.',
              ].filter(Boolean).join('\n'),
            },
          ],
        }),
      });

      if (!response.ok) throw new Error(`OpenAI error ${response.status}`);
      const data = await response.json();
      let description = (data.choices?.[0]?.message?.content || '').trim().replace(/^["']|["']$/g, '').slice(0, 200);
      if (/lorem ipsum/i.test(description)) {
        description = `Freshly prepared ${itemName}, crafted with care.`;
      }
      return res.json({ description, source: 'ai' });
    } catch (error) {
      console.error('[menu] improve-description failed:', error.message);
      const fallbackDesc = currentDesc && !currentDesc.includes('Lorem') ? currentDesc : `Freshly prepared ${itemName}, crafted with care.`;
      return res.json({ description: fallbackDesc, source: 'fallback' });
    }
  });

  /**
   * Returns a generated image URL for a single menu item (does not persist to profile).
   * Owner UI should attach `imageUrl` to the item and save via profile/menu APIs.
   */
  app.post('/api/menu/suggest-item-image', async (req, res) => {
    const body = req.body || {};
    const itemName = typeof body.itemName === 'string' ? body.itemName.trim() : '';
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    const restaurantName = typeof body.restaurantName === 'string' ? body.restaurantName.trim() : '';
    const cuisineType = typeof body.cuisineType === 'string' ? body.cuisineType.trim() : '';

    if (!itemName) {
      return res.status(400).json({
        error: 'itemName is required',
        imageUrl: '',
        skipped: true,
        source: 'validation',
      });
    }

    if (isDevMode()) {
      console.log('[DEV_MODE] Skipping dish image generation — stub response ($0)');
      return res.json({
        imageUrl: '',
        skipped: true,
        source: 'dev',
        reason: 'dev_mode',
      });
    }

    const prompt = buildDishImagePrompt(itemName, note, restaurantName, cuisineType);
    const generator = new OpenAIImageGenerationProvider();

    try {
      const result = await generator.generate(prompt, {
        size: '1024x1024',
        quality: 'high',
      });

      if (result.skipped || !result.imageUrl) {
        const reason = result.reason || 'skipped';
        const source = reason === 'missing_api_key' || reason === 'disabled' ? 'fallback' : 'skipped';
        return res.json({
          imageUrl: '',
          skipped: true,
          source,
          reason,
          provider: result.provider,
        });
      }

      return res.json({
        imageUrl: result.imageUrl,
        skipped: false,
        source: 'openai',
        provider: result.provider,
        promptId: result.promptId || '',
      });
    } catch (error) {
      console.error('[menu] suggest-item-image failed:', error.message);
      return res.json({
        imageUrl: '',
        skipped: true,
        source: 'fallback',
        reason: 'generation_failed',
        details: error.statusCode ? String(error.statusCode) : undefined,
      });
    }
  });

  app.post('/api/menu/import', async (req, res) => {
    const body = req.body || {};
    const fileDataUrl = typeof body.fileDataUrl === 'string' ? body.fileDataUrl : '';
    const fileName = typeof body.fileName === 'string' ? body.fileName : '';
    const fileType = typeof body.fileType === 'string' ? body.fileType.toLowerCase() : '';
    if (!fileDataUrl) {
      return res.status(400).json({ error: 'fileDataUrl is required', sections: [], confidence: 0, warnings: [] });
    }
    try {
      const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileType) || fileDataUrl.startsWith('data:image/');
      if (isImage) {
        const result = await extractStructuredMenuFromImage(fileDataUrl);
        return res.json(result);
      }
      return res.json(structuredMenuFallback(fileName));
    } catch (error) {
      return res.status(500).json({
        error: error.message || 'menu import failed',
        sections: [],
        confidence: 0,
        warnings: ['We had trouble reading this file. Try a different format.'],
      });
    }
  });

  app.post('/api/menu/extract-from-photo', async (req, res) => {
    const body = req.body || {};
    const imageDataUrl = typeof body.imageDataUrl === 'string' ? body.imageDataUrl : '';
    if (!imageDataUrl) {
      return res.status(400).json({ error: 'imageDataUrl is required', items: [] });
    }

    try {
      const items = await extractMenuItemsFromImage(imageDataUrl);
      return res.json({ success: true, items });
    } catch (error) {
      return res.status(500).json({
        error: error.message || 'menu extraction failed',
        items: [],
      });
    }
  });
}

const VALID_CATEGORIES = ['starter', 'main', 'drink', 'dessert'];

async function extractMenuItemsFromImage(imageDataUrl) {
  if (isDevMode()) {
    console.log('[DEV_MODE] Skipping menu OCR API — using placeholder ($0)');
    return extractMenuItemsFallback(imageDataUrl);
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return extractMenuItemsFallback(imageDataUrl);
  }

  try {
    const mediaType = dataUrlImageMime(imageDataUrl);
    const base64Content = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: menuVisionModel(),
        max_tokens: 8192,
        messages: [
          {
            role: 'system',
            content: [
              'You are a restaurant menu extraction assistant.',
              'Given a photo of one or more restaurant menus, extract every distinct food and drink item.',
              'Scan the ENTIRE image: all columns, panels, and side-by-side pages. Multi-column and dense layouts are common — do not skip outer columns.',
              'If TWO OR MORE different restaurant brands or menus appear in one image, still extract everything. Prefix each item name with the brand when needed to avoid duplicates, e.g. "Chili\'s — Santa Fe Chicken Salad" vs "Applebee\'s — Santa Fe Chicken Salad", OR put the brand only in the note field once per block.',
              'For each item return: name (string), category (one of: starter, main, drink, dessert), note (optional: visible description and/or price text if shown).',
              'Return ONLY a JSON array of objects. No markdown, no explanation.',
              'Example: [{"name":"Butter Chicken","category":"main","note":"creamy tomato curry $14"},{"name":"Mango Lassi","category":"drink","note":""}]',
              'If you cannot read the menu clearly, return an empty array: []',
            ].join(' '),
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mediaType};base64,${base64Content}`, detail: 'high' },
              },
              {
                type: 'text',
                text: 'Extract all menu items from this photo. Include items from every column and both sides if two menus are visible. Return JSON array only.',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`OpenAI API error ${response.status}: ${errorBody.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = (data.choices?.[0]?.message?.content || '').trim();
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item.name === 'string' && item.name.trim())
      .map((item) => ({
        name: item.name.trim().slice(0, 120),
        category: VALID_CATEGORIES.includes(String(item.category || '').toLowerCase())
          ? String(item.category).toLowerCase()
          : 'main',
        note: typeof item.note === 'string' ? item.note.trim().slice(0, 200) : '',
        status: 'regular',
      }));
  } catch (error) {
    console.error('[menu-extract] AI extraction failed, using fallback:', error.message);
    return extractMenuItemsFallback(imageDataUrl);
  }
}

function extractMenuItemsFallback(_imageDataUrl) {
  return [
    { name: 'Menu Item 1', category: 'main', note: 'Extracted placeholder — edit name after reviewing your menu photo.', status: 'regular' },
    { name: 'Menu Item 2', category: 'main', note: 'Extracted placeholder — edit name after reviewing your menu photo.', status: 'regular' },
    { name: 'Menu Item 3', category: 'starter', note: 'Extracted placeholder — edit name after reviewing your menu photo.', status: 'regular' },
  ];
}

async function extractStructuredMenuFromImage(imageDataUrl) {
  if (isDevMode()) {
    console.log('[DEV_MODE] Skipping structured menu OCR — using placeholder ($0)');
    return structuredMenuFallback('menu');
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return structuredMenuFallback('menu');

  try {
    const mediaType = dataUrlImageMime(imageDataUrl);
    const base64Content = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: menuVisionModel(),
        max_tokens: 16384,
        messages: [
          {
            role: 'system',
            content: [
              'You are a restaurant menu extraction assistant.',
              'Given a photo of restaurant menu(s), extract ALL visible dishes and drinks organized by section.',
              'CRITICAL — layout:',
              '- Scan the ENTIRE image left-to-right and top-to-bottom, including ALL columns and side-by-side panels.',
              '- Photos often show two menus or two pages next to each other; extract BOTH. Do not stop after one column.',
              '- If two different restaurant brands appear (different logos/names), use separate section groups: prefix section names with the brand, e.g. "Chili\'s — Appetizers" and "Applebee\'s — Shareable appetizers".',
              '- Field restaurantName: a SUGGESTION only for the owner profile. Use the single clearest brand if exactly one chain/menu header is visible; use an empty string if two+ distinct brands appear or you are unsure. Do not invent a name.',
              '- Field detectedBrands: array of distinct chain/brand names you can read from logos or headers (0–4 strings). Empty array if none. Helps the product explain multi-brand photos.',
              '- Do NOT attempt to export or encode logo images; text/brand names only.',
              'CRITICAL — prices:',
              '- Put the full price line in the "price" field as printed (e.g. "Cup $3.25 · Bowl $4.95", "From $12.99", "4.95").',
              '- Do NOT truncate multi-size or combo prices; the field may be up to 120 characters.',
              'Return a JSON object with this structure:',
              '{"restaurantName":"string or empty — suggested single brand only","detectedBrands":["optional strings from headers/logos"],"sections":[{"name":"section name","items":[{"name":"item name","price":"string","description":"short description if visible"}]}],"confidence":0.0-1.0,"warnings":["issues e.g. multiple menus, blurry text, missing prices"]}',
              'Group items into logical sections (Appetizers, Soups, Salads, Entrees, Kids, Drinks, Desserts, etc.).',
              'Return ONLY valid JSON. No markdown fences, no commentary.',
              'If text is hard to read, still extract what you can, lower confidence, and explain in warnings.',
            ].join(' '),
          },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64Content}`, detail: 'high' } },
              {
                type: 'text',
                text: 'Extract the full menu from this image. Include every column and both menus if two brands/panels are visible. Preserve full price strings. Return structured JSON only.',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error ${response.status}`);
    }

    const data = await response.json();
    const content = (data.choices?.[0]?.message?.content || '').trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return structuredMenuFallback('menu');
    const parsed = JSON.parse(jsonMatch[0]);

    const sections = Array.isArray(parsed.sections) ? parsed.sections.map((sec, secIdx) => ({
      id: `sec_${Date.now()}_${secIdx}_${Math.random().toString(36).slice(2, 6)}`,
      name: String(sec.name || 'Untitled Section').trim().slice(0, 80),
      items: Array.isArray(sec.items) ? sec.items
        .filter((item) => item && typeof item.name === 'string' && item.name.trim())
        .map((item, idx) => ({
          id: `item_${Date.now()}_${secIdx}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          name: String(item.name).trim().slice(0, 120),
          price: String(item.price || '').trim().slice(0, 120),
          description: String(item.description || '').trim().slice(0, 400),
          warnings: [],
        })) : [],
    })).filter((sec) => sec.items.length > 0) : [];

    const warnings = Array.isArray(parsed.warnings) ? parsed.warnings.map((w) => String(w).slice(0, 200)) : [];
    const confidence = typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.8;
    const detectedBrands = Array.isArray(parsed.detectedBrands)
      ? parsed.detectedBrands
        .map((b) => String(b || '').trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 4)
      : [];

    return {
      restaurantName: String(parsed.restaurantName || '').trim().slice(0, 120),
      detectedBrands,
      sections,
      confidence,
      warnings,
    };
  } catch (error) {
    console.error('[menu-import] Structured extraction failed:', error.message);
    return structuredMenuFallback('menu');
  }
}

function structuredMenuFallback(fileName) {
  return {
    restaurantName: '',
    detectedBrands: [],
    isDemo: true,
    sections: [
      {
        id: 'sec_starters', name: 'Starters', items: [
          { id: 'fb_1', name: 'Example Starter 1', price: '', description: '', warnings: ['Replace with your actual item'] },
          { id: 'fb_2', name: 'Example Starter 2', price: '', description: '', warnings: ['Replace with your actual item'] },
        ],
      },
      {
        id: 'sec_mains', name: 'Main Course', items: [
          { id: 'fb_3', name: 'Example Main 1', price: '', description: '', warnings: ['Replace with your actual item'] },
          { id: 'fb_4', name: 'Example Main 2', price: '', description: '', warnings: ['Replace with your actual item'] },
        ],
      },
      {
        id: 'sec_drinks', name: 'Drinks', items: [
          { id: 'fb_5', name: 'Example Drink 1', price: '', description: '', warnings: ['Replace with your actual item'] },
        ],
      },
      {
        id: 'sec_desserts', name: 'Desserts', items: [
          { id: 'fb_6', name: 'Example Dessert 1', price: '', description: '', warnings: ['Replace with your actual item'] },
        ],
      },
    ],
    confidence: 0,
    warnings: [
      'AI menu scanning is not configured yet. These are placeholder sections — replace the names with your actual items.',
      'To enable automatic menu reading, ask your admin to add an OPENAI_API_KEY.',
    ],
  };
}

module.exports = { registerMenuRoutes, extractMenuItemsFromImage };
