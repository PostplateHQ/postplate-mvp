# E2E & BA validation matrix (PostPlate MVP)

Automation lives under `tests/e2e-blackbox-suite.test.js`, `tests/e2e-llm-menu-contracts.test.js`, and `npm run test:e2e`.  
This document is for **BA / QA / Dev** alignment: what is covered automatically, what must stay manual, and **questions for the business**.

---

## 1. Traceability: automated vs manual

| Area | Automated (API black-box) | Manual UI (dashboard / guest) | Open questions for BA |
|------|---------------------------|-------------------------------|------------------------|
| Store provisioning | `POST /api/internal/provision-store` (403/200, `pp_` id, `Set-Cookie`) | Run curl or future “New workspace” UI; confirm cookie in Application tab | Who may provision stores in prod? Internal only vs self-serve signup? |
| Owner session | Profile resolution: `?store=` overrides cookie; cookie used when query omitted | Load `dashboard.html` after provision; confirm data matches new store without `?store=` | Should **all** owner APIs ignore client `storeId` when session exists (stricter than profile only)? |
| Public menu | 400 without `store`, 200 DTO, cross-store `offerId` ignored | `menu.html?store=…` visuals, empty-state copy | Is “unknown store → synthetic empty menu” acceptable for guests, or should we 404? |
| Table-ordering QR | `/api/qr/menu-order` 400/200, PNG data URL | Modal “Create table ordering QR” on Settings | SLA for QR generation failures (network, size limits)? |
| Order-guest telemetry | `204` events, `200` order create | Browser network tab on guest flow | PII in receipt payload allowed in logs (currently dev-only console)? |
| LLM menu copy | `improve-description`: 400 missing `itemName`; `DEV_MODE` stub; no-key fallback | Campaign/menu wizards with real keys in staging | Required **latency** and **timeout** for AI endpoints; fallback copy approval? |

---

## 2. Positive cases (happy path)

- Provision in dev → new `pp_<16hex>` profile persisted; `pp_owner_store` cookie set.
- Bearer `POSTPLATE_INTERNAL_TOKEN` → provision when `DEV_MODE=false`.
- `GET /owner/profile` with valid cookie returns that store’s profile.
- `GET /api/public/menu?store=` returns normalized prices and categories.
- `GET /api/qr/menu-order?store=` returns `menuOrderUrl` + `menuOrderQrDataUrl`.
- `POST /api/menu/improve-description` with `itemName` returns 200 + non-empty description.

---

## 3. Negative & abuse cases

- Provision without dev flag or token → **403**.
- `PUT /owner/profile` with no resolvable store → **400**.
- `GET /api/public/menu` without `store` → **400**.
- Tampered `pp_owner_store` cookie → invalid signature ignored; query store still works.
- Cross-store `offerId` on public menu → **no** offer object (prevents wrong promo).

---

## 4. Edge cases (automation)

- Very long `store` query string → must not crash server (200/400/414 acceptable).
- Two provisions in a row → **distinct** store IDs.

---

## 5. Gaps — challenge dev (intentional)

1. **No browser E2E** (Playwright/Cypress): adapter `credentials: 'same-origin'` and boot `resolveBootOwnerContext` are not exercised in CI. *Recommendation:* add 2–3 Playwright specs: provision → reload dashboard → Save profile → open QR modal.
2. **Offers / campaigns** still keyed by URL `storeId` from the client; session binding is **profile-only**. *Risk:* mismatched store between profile cookie and `/offers/:id` if user tampers. *Ask dev:* unify middleware.
3. **LLM paths** beyond `improve-description` (import OCR, campaign copy, images) are not in `test:e2e`. *Recommendation:* mirror the same pattern: 400 on missing inputs, `DEV_MODE` stub contract, no-key fallback.
4. **Load / soak** not run: large `data.json`, concurrent provisions, rate limits.

---

## 6. LLM module testing notes (for QA engineers)

- **Contract tests** should assert: HTTP status, JSON schema keys (`source`, `description`), and that **no** raw API keys appear in responses.
- **DEV_MODE**: expect **deterministic** stub text (regression-friendly); do not assert poetic quality.
- **With real API key** (staging only): add **soft** assertions: length bounds, no `lorem ipsum`, language = English if BA requires.
- **Failure injection**: timeout, 429, malformed JSON from provider → expect `source: 'fallback'` or documented error code.

---

## 7. Running tests

```bash
npm test          # full suite including unit + e2e-style files in tests/*.test.js
npm run test:e2e  # focused black-box + LLM contract files only
npm run playwright:install   # Chromium + chromium-headless-shell into node_modules/.cache/ms-playwright
npm run test:playwright      # UI E2E: starts server on port 3456 (DEV_MODE=true), runs 3 flows
```

### Playwright UI flows (`tests/e2e/playwright/`)

| Spec | Mirrors API black-box |
|------|------------------------|
| `owner-provision-dashboard.spec.js` | `POST /api/internal/provision-store` + session cookie + dashboard header |
| `guest-public-menu.spec.js` | `GET /api/public/menu?store=taco123` + `.og-item` render |
| `settings-table-qr.spec.js` | `GET /api/qr/menu-order` (or fallback) + modal PNG |

**Env:** `playwright.config.js` sets `PORT=3456` so a separate `npm start` on 3000 does not block tests. Set `PLAYWRIGHT_REUSE_SERVER=1` to skip spawning if you already run the app on 3456.

**Headless shell:** Playwright 1.49+ needs **`chromium-headless-shell`** as well as `chromium`. `npm run playwright:install` installs both into the repo cache. If you still see “Executable doesn’t exist”, run `npm run playwright:install` again (or `node scripts/playwright-install.js`).

**Data:** Guest + QR specs expect seed data for `taco123` in `backend/db/data.json`. Provision spec **writes** new `pp_…` profiles to the same file (acceptable for local QA; use a fixture DB for strict isolation).

---

## 8. Sign-off checklist (BA quick pass)

- [ ] Accept “unknown store” public menu behavior (200 + empty/setup message).
- [ ] Accept provision restricted to dev + internal token until signup exists.
- [ ] Accept guest analytics as 204 fire-and-forget (no body).
- [ ] Confirm restaurant **display name** can differ from immutable **store id** for reporting.
