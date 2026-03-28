# Flow: Offers backend & domain

**Scope:** Offer records, create/update, pause/relaunch/duplicate, enrichment metrics, validation, normalization.

**Key files**
- `backend/routes/offers.js` — `POST /offers`, GET list/compare/recommendation/history, pause, relaunch, duplicate
- `backend/services/offersDomain.js` — `validateOfferPayload`, `getStoreOffers`, `enrichOffer`, `parseRewardValue`, `getOfferStatusDisplay`, etc.
- `backend/server.js` — `normalizeOffer`, `generateOfferId`, registration deps
- Payload fields include `campaignGoal`, `audiencePrimary`, `selectedChannels`, etc.

**Data:** `backend/db/data.json` — `offers` array (coordinate with team when merging JSON).

**Branch:** `feature/offers-api-*`

**Avoid mixing:** Redemption/reminder sending → `06-reminders-redemptions.md`.
