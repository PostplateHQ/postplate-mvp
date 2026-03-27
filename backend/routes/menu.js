function isDevMode() {
  return String(process.env.DEV_MODE || '').toLowerCase() === 'true';
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
    const mediaType = imageDataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
    const base64Content = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 2048,
        messages: [
          {
            role: 'system',
            content: [
              'You are a restaurant menu extraction assistant.',
              'Given a photo of a restaurant menu, extract all menu item names.',
              'For each item, return: name (string), category (one of: starter, main, drink, dessert), note (optional short description if visible).',
              'Return ONLY a JSON array of objects. No markdown, no explanation.',
              'Example: [{"name":"Butter Chicken","category":"main","note":"creamy tomato curry"},{"name":"Mango Lassi","category":"drink","note":""}]',
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
                text: 'Extract all menu items from this photo. Return JSON array only.',
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
    const mediaType = imageDataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
    const base64Content = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 4096,
        messages: [
          {
            role: 'system',
            content: [
              'You are a restaurant menu extraction assistant.',
              'Given a photo of a restaurant menu, extract ALL menu items organized by section.',
              'Return a JSON object with this structure:',
              '{"restaurantName":"string or empty","sections":[{"name":"section name","items":[{"name":"item name","price":"price as shown","description":"short description if visible"}]}],"confidence":0.85,"warnings":["any issues found"]}',
              'Group items into logical sections like Appetizers, Main Course, Drinks, Desserts, etc.',
              'Include prices exactly as shown on the menu.',
              'Return ONLY the JSON object. No markdown, no explanation.',
              'If text is hard to read, still try your best and add a warning.',
            ].join(' '),
          },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64Content}`, detail: 'high' } },
              { type: 'text', text: 'Extract the full menu from this image. Return structured JSON with sections and items.' },
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

    const sections = Array.isArray(parsed.sections) ? parsed.sections.map((sec) => ({
      id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: String(sec.name || 'Untitled Section').trim().slice(0, 80),
      items: Array.isArray(sec.items) ? sec.items
        .filter((item) => item && typeof item.name === 'string' && item.name.trim())
        .map((item, idx) => ({
          id: `item_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          name: String(item.name).trim().slice(0, 120),
          price: String(item.price || '').trim().slice(0, 20),
          description: String(item.description || '').trim().slice(0, 200),
          warnings: [],
        })) : [],
    })).filter((sec) => sec.items.length > 0) : [];

    const warnings = Array.isArray(parsed.warnings) ? parsed.warnings.map((w) => String(w).slice(0, 200)) : [];
    const confidence = typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.8;

    return {
      restaurantName: String(parsed.restaurantName || '').trim().slice(0, 120),
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
