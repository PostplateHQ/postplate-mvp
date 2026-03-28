# Flow: Campaign builder (client wizard)

**Scope:** Multi-step create-campaign UI: intent, item picker, offer/tone, audience & goal chips, generation spinner, poster editor, preview, publish/draft.

**Key files**
- `frontend/growth-os-app.js` — `state.campaignBuilder`, `resetCampaignBuilder`, `renderCbStep*`, `handleCbAction`, `runCampaignGeneration`, `applySmartActionToCampaignBuilder` (preset merge)
- `frontend/ui-data-adapter.js` — `generateCampaignContent`, `regenerateCampaignContent`, `createLiveCampaign`
- `frontend/styles.css` — `.pp-cb-*`, context chips, poster compose

**Profile fields used:** `cuisineType`, `brandTone`, `audiencePrimary`, `primaryGoal` (via defaults), `menuItems`.

**Related:** Server-side prompts and OpenAI → separate chat with `04-campaign-generation-api.md`.

**Branch:** `feature/campaign-builder-*` (large file; avoid parallel edits with other flows in same file without coordination).
