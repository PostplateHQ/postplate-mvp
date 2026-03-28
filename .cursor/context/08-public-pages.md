# Flow: Public / legacy HTML pages

**Scope:** Standalone pages outside the main Growth OS SPA router—redeem, capture, success, QR, promotions, classic offers page.

**Key files**
- `frontend/redeem.html`, `frontend/capture.html`, `frontend/success.html`, `frontend/qr.html`
- `frontend/offers.html`, `frontend/offers.js` — legacy offers UX
- `frontend/promotions.html`, `frontend/dashboard.html` — as used in product
- `backend/routes/qr.js`, `backend/routes/promo.js` — supporting APIs

**Note:** Campaign QR links point at `/redeem/:store` (see `backend/routes/campaign.js`).

**Branch:** `feature/public-pages-*`

**Avoid mixing:** Full dashboard SPA behavior → `01-growth-os-shell.md`.
