# Product note: Guest-facing food & marketing visuals

**Applies to:** Menu dish photos (`/api/menu/suggest-item-image`, owner uploads), campaign posters, future reels/short video, and any AI-assisted image generation.

## Principle

People **eat with their eyes first**, then taste. Creative should feel **credible and appetizing in a human way**—not like generic “AI slop” or overly perfect CGI food.

## Direction for implementation & prompts

- **Favor a human-captured feel:** natural light, real plating, slight imperfection, shallow depth of field, “shot on a phone at the pass or table,” steam/texture where believable.
- **Avoid default AI-food tropes:** hyper-symmetrical layouts, plastic gloss, neon oversaturation, fake lens flares, stock “perfect burger” composition unless the brief explicitly asks for it.
- **Motion (reels / video, future):** short, subtle loops are fine (steam, pour, garnish settle); keep them grounded and documentary, not flashy synthetic motion unless brand asks.
- **When to generate vs upload:** Prefer **owner-provided or licensed real photography** when available; use generation to **fill gaps** or **variants**, with prompts steered toward authenticity (see above).

## Code touchpoints (when you change visuals)

- `engine/providerRegistry.js` — `OpenAIImageGenerationProvider` (shared image path).
- `backend/routes/menu.js` — `buildDishImagePrompt` for menu items.
- `backend/routes/campaign.js` — poster / creative image prompts.
- `frontend/growth-os-app.js` — campaign builder copy that describes visual intent (if any).

**Branch:** tag commits with the flow you’re in (`feat(campaign): …`, `feat(menu): …`); this doc is **cross-cutting**.
