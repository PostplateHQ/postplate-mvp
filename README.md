# postplate-mvp
PostPlate helps restaurants launch promotions, track redemptions, and turn walk-ins into repeat customers — all in one simple platform.

## Butter Campaign Flow Delivery (Handoff)

### Phase 1 - UX Foundation
- Owner IA and patterns: [docs/ux-growth-os-spec.md](docs/ux-growth-os-spec.md) (home → campaigns → reminders continuity, trust labels).
- Guided-first campaign entry with intent cards and manual fallback.
- Smart input model: promote items, offer type presets + custom rule, campaign goal, duration, channels.
- Look-and-feel controls and soundtrack mood capture for social-ready generation.

### Phase 2 - Orchestrator Integration
- Suggestion API now returns orchestrator recommendation summary and ranked options.
- Guided decision panel highlights best next move with confidence and rationale.
- Rule guards favor safe recommendations for high-margin slow movers.

### Phase 3 - Publish + Channel Execution
- Create flow carries channel plan and custom rules to publish payload.
- Preview continues poster/reel guidance while keeping one-path publish behavior.

### Phase 4 - Analytics + Learning
- Core funnel events mapped in UI hooks:
  - setup_started, intent_selected, menu_item_selected, offer_type_selected
  - custom_rule_added, ai_orchestrator_requested, ai_option_selected
  - campaign_published, channel_asset_published
- Tags and recommendation metadata are passed for future multi-store learning.

## Testing

- `npm test` — Node unit + API-style tests under `tests/`.
- `npm run test:e2e` — Black-box API suite (`tests/e2e-blackbox-suite.test.js`, LLM menu contracts).
- `npm run test:playwright` — Browser E2E (starts server on **port 3456** with `DEV_MODE=true`). First time: `npm run playwright:install` (installs **chromium** + **chromium-headless-shell**). `playwright.config.js` **always** sets `PLAYWRIGHT_BROWSERS_PATH` to `node_modules/.cache/ms-playwright` so IDE/sandbox caches cannot point at the wrong CPU arch.
- QA matrix and BA gaps: [docs/qa/E2E_AND_BA_CHECKLIST.md](docs/qa/E2E_AND_BA_CHECKLIST.md).
