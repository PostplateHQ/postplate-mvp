class NoopImageEnhancementProvider {
  async enhance(imageAssetUrl) {
    return {
      source: imageAssetUrl || '',
      enhanced: imageAssetUrl || '',
      provider: 'noop-image-enhancer',
    };
  }
}

function readBooleanEnv(name, defaultValue = false) {
  const value = String(process.env[name] || '').trim().toLowerCase();
  if (!value) return defaultValue;
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

class OpenAIImageGenerationProvider {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = config.model || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
    this.enabled = typeof config.enabled === 'boolean'
      ? config.enabled
      : readBooleanEnv('IMAGE_GEN_ENABLED', true);
    this.timeoutMs = Number(config.timeoutMs || process.env.IMAGE_GEN_TIMEOUT_MS || 15000);
  }

  async generate(prompt, context = {}) {
    if (!this.enabled) {
      return {
        imageUrl: '',
        provider: 'openai-image-generator',
        skipped: true,
        reason: 'disabled',
      };
    }

    if (!this.apiKey) {
      return {
        imageUrl: '',
        provider: 'openai-image-generator',
        skipped: true,
        reason: 'missing_api_key',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          size: context.size || '1024x1024',
          quality: context.quality || 'high',
        }),
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload.error?.message || `image_generation_failed_${response.status}`);
        error.statusCode = response.status;
        throw error;
      }

      const row = Array.isArray(payload.data) ? payload.data[0] : null;
      const imageUrl = row?.url
        || (row?.b64_json ? `data:image/png;base64,${row.b64_json}` : '');
      if (!imageUrl) {
        const error = new Error('image_generation_missing_url');
        error.statusCode = 502;
        throw error;
      }

      return {
        imageUrl,
        provider: 'openai-image-generator',
        promptId: row?.id || '',
      };
    } catch (error) {
      if (error?.name === 'AbortError') {
        const timeoutError = new Error('image_generation_timeout');
        timeoutError.statusCode = 504;
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

class NoopPosterGenerationProvider {
  async generate(brief, preview, promptPackage = null) {
    return {
      posterUrl: '',
      preview,
      promptPackage,
      itemCount: Array.isArray(brief?.itemNames) ? brief.itemNames.length : 1,
      provider: 'noop-poster-generator',
    };
  }
}

class NoopPromptHelperProvider {
  async buildPrompt(brief) {
    const items = Array.isArray(brief.itemNames) && brief.itemNames.length
      ? brief.itemNames
      : [brief.itemName || 'food item'];
    const item = items[0];
    const backgroundPreference = brief.backgroundMode === 'light' ? 'light' : 'dark';
    const location = brief.restaurantLocation || 'Location';
    const headline = brief.offerLabel || `${brief.offerType || 'Limited Time'} ${item}`;
    const offerText = brief.offerType || 'Limited Time';
    const platform = brief.platform || 'instagram_post';
    const styleKeywords = brief.styleKeywords || 'modern, appetizing, clean';
    const imageStyle = brief.imageStyle || 'natural-realistic';
    const hasImages = Boolean(brief.productImageAsset) || (Array.isArray(brief.productImageAssets) && brief.productImageAssets.length > 0);

    return {
      prompt: `Generate a visually appealing restaurant promotion layout based on the inputs.

Do NOT use a fixed template.

Instead:
- Dynamically compose the layout like a human designer
- Decide layout, spacing, and hierarchy based on content

INPUT CONTEXT:
- Food items: ${items.join(', ')}
- Offer: ${offerText}
- Restaurant: ${brief.restaurantName || 'Restaurant'}
- Platform: ${platform}
- Style: ${styleKeywords}
- Image availability: ${hasImages}
- Image style: ${imageStyle}

LAYOUT RULES:
1. PRIORITY:
- If offer is strong -> headline dominates
- If food images available -> food becomes hero
- If multiple items -> simplify headline (avoid clutter like +3)

2. HEADLINE:
- Keep short, clean, readable
- Avoid stacking too many elements
- Use headline: ${headline}

3. FOOD DISPLAY:
- If image available -> show large, clean, appetizing
- If NOT available -> do NOT reserve empty box; switch to text-focused layout

4. BACKGROUND:
- Dark -> premium + bold
- Light -> clean + casual
- Background preference: ${backgroundPreference}

5. TEXT HIERARCHY:
- Headline biggest
- Food names secondary
- Restaurant name subtle branding
- CTA clear and clickable

6. QR / CTA:
- Show logo only if provided: ${Boolean(brief.logoEnabled)}
- Show QR only if provided: ${Boolean(brief.qrEnabled)}

7. CLEAN DESIGN:
- No empty placeholders
- No overlap
- Balanced spacing
- Mobile-first readability

OUTPUT:
A clean, modern, human-like promotional design that feels intentional and real, not template-based.`,
      provider: 'noop-prompt-helper',
    };
  }

  async buildImagePrompts(brief) {
    const itemNames = Array.isArray(brief.itemNames) && brief.itemNames.length
      ? brief.itemNames
      : [brief.itemName || 'food item'];
    const promptBase = await this.buildPrompt(brief);
    const prompts = [];

    itemNames.forEach((itemName) => {
      ['hero-closeup', 'plated-lifestyle'].forEach((variant) => {
        const variantTail = variant === 'hero-closeup'
          ? 'Prioritize close-up hero framing with rich texture detail.'
          : 'Show plated context with natural table styling and depth.';

        prompts.push({
          itemName,
          variant,
          prompt: promptBase.prompt
            .replace(/Main item: .*/, `Main item: ${itemName}`)
            + `\n\nVARIANT NOTES:\n- ${variantTail}\n- Keep branding-safe composition.`,
        });
      });
    });

    return {
      prompts,
      provider: 'noop-prompt-helper',
    };
  }
}

class NoopScoringProvider {
  async score(_brief, preview) {
    return {
      score: 0.85,
      notes: ['Deterministic layout used'],
      previewPreset: preview?.presetId || null,
      provider: 'noop-scoring',
    };
  }
}

class NoopImageGenerationProvider {
  async generate(_prompt, _context = {}) {
    return {
      imageUrl: '',
      provider: 'noop-image-generator',
      skipped: true,
    };
  }
}

function createProviderRegistry(overrides = {}) {
  return {
    imageEnhancer: overrides.imageEnhancer || new NoopImageEnhancementProvider(),
    imageGenerator: overrides.imageGenerator || new OpenAIImageGenerationProvider(),
    posterGenerator: overrides.posterGenerator || new NoopPosterGenerationProvider(),
    promptHelper: overrides.promptHelper || new NoopPromptHelperProvider(),
    scorer: overrides.scorer || new NoopScoringProvider(),
  };
}

module.exports = {
  createProviderRegistry,
  NoopImageEnhancementProvider,
  NoopPosterGenerationProvider,
  OpenAIImageGenerationProvider,
  NoopImageGenerationProvider,
  NoopPromptHelperProvider,
  NoopScoringProvider,
};
