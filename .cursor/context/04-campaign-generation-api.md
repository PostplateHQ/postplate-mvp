# Flow: Campaign generation API (copy + poster)

**Scope:** POST handlers for AI (or dev fallback) copy and poster image; QR data URL for redeem link; caching.

**Key files**
- `backend/routes/campaign.js` — `/api/campaign/generate`, `/api/campaign/regenerate`, `generateCopy`, `generatePoster`, `generateQR`, `buildCopyFallback`
- Env: `OPENAI_API_KEY`, `DEV_MODE`, `OPENAI_IMAGE_MODEL`, etc.

**Request body (typical):** `intent`, `item`, `offerType`, `discountValue`, `comboDescription`, `tone`, `restaurantName`, `cuisineType`, `brandTone`, `audiencePrimary`, `campaignGoal`, `imageKeywords`, `storeId`, `regenerateTarget`.

**Production note:** `generateQR` uses `http://localhost:3000/redeem/...` — should eventually use a configurable public base URL.

**Branch:** `feature/campaign-api-*`

**Avoid mixing:** Wizard step UI → `03-campaign-builder.md` in another chat.

**Visual direction (posters & future motion):** See [09-visual-creative-direction.md](09-visual-creative-direction.md) — prefer human-captured, appetizing realism over generic AI-food aesthetics; subtle real motion for reels when we add video.
