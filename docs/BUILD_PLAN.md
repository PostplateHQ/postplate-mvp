# PostPlate — Build Plan (Safe, Strong, Future-Ready)

This plan turns **[`PRODUCT_ARCHITECTURE.md`](./PRODUCT_ARCHITECTURE.md)** and **[`../backend/PRODUCT_OVERVIEW.md`](../backend/PRODUCT_OVERVIEW.md)** into an execution sequence for humans and agents. It respects **vertical slices** where possible and **horizontal foundations** where required (attribution, APIs, adapter).

---

## 1) Sources of truth (read order)

| Order | Document | Use for |
|-------|----------|---------|
| 1 | [`backend/PRODUCT_OVERVIEW.md`](../backend/PRODUCT_OVERVIEW.md) | Domain boundaries, attribution, what not to build (POS creep) |
| 2 | [`PRODUCT_ARCHITECTURE.md`](./PRODUCT_ARCHITECTURE.md) | Screen IDs, sections, routes, UX acceptance |
| 3 | [`ux-growth-os-spec.md`](./ux-growth-os-spec.md) | Campaign UX nuance, events naming already in flight |
| 4 | This file | Sequencing, gates, risks, branching |

If two docs conflict, resolve in favor of **attribution integrity** and **growth-first scope**, then update the doc that is wrong.

---

## 2) Current repo baseline (honest)

**Already present (leverage, don’t rewrite blindly)**

- Backend: `campaign`, `promotions`, `suggestion-engine`, `menu`, `profile`, `qr`, `offers`, `redemptions`, `smart-actions`, `reminders`, `promo` routes; JSON-backed stores (`data.json`, `poster-data.json`).
- Frontend: static flows (`growth-os-app.js`, HTML pages) + **`frontend/growth-home`** (React/Vite) with dashboard-style components.
- README “Butter” phases: UX foundation → orchestrator → publish → analytics events (partially specified).

**Gaps vs architecture spec**

- **Single owner shell** with the exact sidebar IA and routes may not exist end-to-end in one app (unify React shell vs static pages deliberately).
- **Customer path**: menu → cart → checkout → pay with **persistent campaign/session IDs** may be incomplete or split across pages.
- **Analytics**: dashboard sections and `SCR-ANALYTICS` four blocks need **contracted aggregate APIs**, not ad hoc UI numbers.
- **Suggestions**: dedicated `SCR-SUGGESTIONS` + **apply/dismiss** lifecycle may need API + UI parity.
- **Data layer**: file JSON is fine for MVP **if** schemas are versioned and migration path is planned before scale.

---

## 3) Principles for “safe” and “strong”

### Safe (shipping without breaking trust or scope)

1. **Attribution first** — Every new endpoint that touches orders, menu views, or payments accepts or returns `restaurant_id`, `campaign_id` where applicable, and a **session or scan id**; document what is required vs optional.
2. **Contract before pixels** — For each screen section in `PRODUCT_ARCHITECTURE.md`, define request/response shape (OpenAPI, TypeScript types, or a short `docs/api/*.md`) before building final UI.
3. **Feature flags** — Reels/optional steps ship behind flags so the core loop stays releasable.
4. **Idempotent writes** — Draft save, “apply suggestion,” payment webhooks: safe to retry.
5. **Privacy defaults** — Customers screen and messaging: collect and show only what policy allows; stub CTAs clearly.

### Strong (future maintainability)

1. **Domain modules** — New code goes under clear folders (campaign, menu, orders, analytics, suggestions, customers) even if one Express app; avoid 2k-line route files.
2. **Adapter boundary** — Payment, creative generation, messaging: **interface + one implementation**; core domain never imports vendor SDKs directly in business logic.
3. **Event vocabulary** — One canonical list of analytics event names and required properties; extend additively (`v` field or new names, don’t repurpose).
4. **UI data adapter** — One place (`ui-data-adapter.js` or TS equivalent) maps API → view models so Growth Home and legacy pages don’t duplicate mapping logic forever.
5. **Migration runway** — Treat `data.json` as **implementation detail**; keep entity IDs stable and relationships explicit so a move to Postgres/SQLite is a **storage swap**, not a redesign.

---

## 4) Execution model (branches and batches)

Aligned with repo rules: **sync main → branch per flow → merge in dependency order**.

### Batch ordering (always)

| Batch | Contents | Merge when |
|-------|----------|------------|
| **A** | Schemas, attribution fields, new/changed APIs, event payloads | Contract reviewed |
| **B** | Adapter + shared types + client fetch layer | APIs stable enough to mock |
| **C** | UI per screen (Growth Home or agreed shell) | B merged for that slice |
| **D** | Integrations (payment webhook, generation jobs) | Core CRUD path works |

**Rule:** Do not stack unrelated flows on one branch without explicit approval.

### Suggested branch names (examples)

- `feature/owner-app-shell-routes`
- `feature/campaign-wizard-api`
- `feature/menu-checkout-attribution`
- `feature/analytics-aggregates`
- `feature/suggestions-lifecycle`

---

## 5) Phased roadmap (what to build, in what order)

Phases are **gates**: exit each phase with a demo script and a short “definition of done” checklist.

### Phase 0 — Foundations (1–2 weeks calendar, depends on team size)

**Goal:** No ambiguity on IDs, events, and environments.

| Work item | Output |
|-----------|--------|
| **Attribution spec** | Doc table: each event type → required props (`restaurant_id`, `campaign_id`, `session_id`, `order_id`, timestamps) |
| **Entity IDs** | UUIDs or stable strings everywhere new; document generation |
| **API inventory** | List existing routes vs `PRODUCT_OVERVIEW` ideal paths; map or alias (no duplicate meanings) |
| **Error shape** | Standard JSON error: `code`, `message`, `details?` |
| **Auth stub** | How owner vs public routes are distinguished in MVP (token, cookie, demo owner) |

**Exit criteria**

- [ ] One markdown or OpenAPI file lists **all** analytics events the product will emit in Phase 1–2.
- [ ] QR/menu landing URL format documented (query params for `campaign_id`, etc.).

---

### Phase 1 — Owner shell + campaign core (Growth engine spine)

**Goal:** Owner can create, save draft, generate creative, go live, see campaign in a list.

| Sequence | Work | Ties to architecture |
|----------|------|----------------------|
| 1.1 | App shell: Top Nav + Sidebar + routed placeholders | §0 `SCR-*` routes |
| 1.2 | Campaign list API + `SCR-CAMPAIGN-LIST` grid | Cards, filters |
| 1.3 | Wizard steps 1–2 + persist draft | `WIZ-STEP-01`, `02` |
| 1.4 | Creative step async + asset pick | `WIZ-STEP-03` |
| 1.5 | Preview + QR + Go Live | `WIZ-STEP-04` |

**Safety**

- Draft autosave debounced; conflict strategy (last-write-wins OK for MVP).
- Go Live validates required fields server-side.

**Exit criteria**

- [ ] End-to-end: new campaign from empty → Live with scannable QR pointing at menu URL including attribution params.
- [ ] `campaign_id` immutable after create; status transitions documented.

---

### Phase 2 — Conversion engine (menu → cart → order → pay)

**Goal:** Customer journey **Flow 2** with revenue recorded and linked. **Lightweight ordering only** — complementary add-ons (e.g. drinks with food), cart review, pay, and **customer-visible order status** until the order is with the customer. **No** POS maintenance, labor tooling, or full kitchen ops (see `PRODUCT_OVERVIEW.md`).

**Menu QR vs redeem QR:** `GET /qr` with **`menuOnly=1`** (or `mode=menu`) and **`store`** returns only the scan-to-order payload (`menuOrderUrl`, `menuOrderQrDataUrl`, optional `restaurantHint`) — no offer name required; use the same Store ID as the dashboard owner profile. With full params, `GET /qr` returns both **redeem** (`redeemUrl`, `qrDataUrl`) and **scan-to-order** (`menuOrderUrl`, `menuOrderQrDataUrl`). The menu URL opens [`frontend/menu-intro.html`](../frontend/menu-intro.html) (branded intro) then [`frontend/menu.html`](../frontend/menu.html); menu data is loaded from **`GET /api/public/menu?store=`** ([`backend/routes/publicMenu.js`](../backend/routes/publicMenu.js)). Optional `offerId` on menu links attaches the offer banner when it matches the store. Use `?useFixture=1` or `store=demo-store` for the static fixture. Owner generator UI: [`frontend/qr.html`](../frontend/qr.html) (`?generateMenu=1` pre-runs menu QR). Event schema: [`docs/order-guest-analytics.md`](./order-guest-analytics.md).

| Sequence | Work | Notes |
|----------|------|--------|
| 2.1 | Public menu layout + category/item APIs | `SCR-MENU-CUSTOMER` |
| 2.2 | Session: establish on QR hit; return to client | Store server-side or signed cookie |
| 2.3 | Cart UI: **complements** + **review** | `SCR-CART`; rules/tags API or server-side suggestions from cart snapshot |
| 2.4 | Checkout UI | `SCR-CHECKOUT` |
| 2.5 | Order create API | Payload includes line items, `campaign_id`, `session_id` |
| 2.6 | Payment adapter + webhook | **Sandbox first**; idempotent webhook handler |
| 2.7 | Customer **order status** | `SCR-ORDER-STATUS`; minimal statuses, no KDS/staff POS |
| 2.8 | Owner `SCR-ORDERS` | Today / All; align status with customer-facing pipeline |

**Safety**

- Never trust client totals alone; **reprice server-side** from menu.
- Payment failures leave order in recoverable state.
- Complement suggestions are **optional**; do not block checkout.

**Exit criteria**

- [ ] Single test script: QR → add item → see complements (or empty state) → review cart → checkout → test payment → order **Paid** with `campaign_id` on record.
- [ ] Customer can open **order status** after pay and see progression through a minimal state model.
- [ ] Analytics event: `payment_completed` with same attribution chain as order.

---

### Phase 3 — Intelligence (dashboard + analytics)

**Goal:** Owner sees today, trends, active campaigns, pending actions — backed by real aggregates.

| Sequence | Work | Architecture section |
|----------|------|------------------------|
| 3.1 | Event ingestion endpoint or batch writer | All funnel events |
| 3.2 | Nightly or rolling aggregations (start simple: cron in-process or manual refresh) | Revenue 7d/30d |
| 3.3 | Dashboard `DASH-SEC-01`–`05` | In order |
| 3.4 | `SCR-ANALYTICS` four sections | `ANL-SEC-01`–`04` |

**Safety**

- Define **timezone** (restaurant) for “today” and charts.
- Document how **conversion rate** is computed; same formula in UI and API.

**Exit criteria**

- [ ] Dashboard numbers match sum of underlying orders/events for a fixed fixture dataset.
- [ ] Funnel counts reconcilable to raw events (spreadsheet or test).

---

### Phase 4 — Decision + retention (suggestions + customers)

**Goal:** Close **Flow 1** and **Flow 3** with actionable cards and light retention.

| Sequence | Work | Notes |
|----------|------|--------|
| 4.1 | Suggestion CRUD or status API | `new | applied | dismissed | completed` |
| 4.2 | Dashboard `DASH-SEC-04` + `SCR-SUGGESTIONS` | Same payload model |
| 4.3 | “Apply in 1 click” → creates draft campaign or opens wizard with prefill | `suggestion_id` logged |
| 4.4 | `SCR-CUSTOMERS` minimal + reminder stub | Wire to existing `reminders` where applicable |
| 4.5 | Settings `SCR-SETTINGS` | Profile + billing status + QR preview |

**Exit criteria**

- [ ] Applying a suggestion is traceable in data (link table or fields on campaign).
- [ ] No silent failure: user sees toast/error if apply fails.

---

### Phase 5 — Hardening (before “real” pilots)

| Area | Actions |
|------|---------|
| **Testing** | Contract tests for payment webhook; e2e smoke: campaign → order; critical unit tests on pricing and attribution |
| **Observability** | Structured logs with `request_id`, `campaign_id` where relevant; basic error rate alert |
| **Security** | Rate limit public menu/checkout; sanitize inputs; secrets only in env |
| **Performance** | Pagination on orders and campaign lists; lazy-load poster images |
| **Backup** | If JSON remains: backup strategy and restore drill |

---

## 6) Dependency graph (simplified)

```text
Phase 0 (attribution + events + API contracts)
    ↓
Phase 1 (campaign + QR URL shape)
    ↓
Phase 2 (menu + session + order + payment)  ← blocks real revenue truth
    ↓
Phase 3 (aggregates + dashboard + analytics)
    ↓
Phase 4 (suggestions + customers + settings)
    ↓
Phase 5 (hardening)
```

**Parallel tracks (after Phase 0)**

- UI shell **can** start in parallel with **campaign API** polish if mocks exist.
- **Analytics event emission** can be added to UI **early** (Phase 1) even if aggregates land in Phase 3 (store raw events first).

---

## 7) Risk register (short)

| Risk | Impact | Mitigation |
|------|--------|------------|
| Dual frontends (static + React) drift | Inconsistent UX and bugs | Pick **one** owner shell for new IA; bridge old URLs with redirects |
| Attribution dropped in checkout | Broken ROI story | Gate Phase 2 on server-side validation of IDs |
| JSON corruption / concurrency | Data loss | Single-writer pattern or move hot paths to SQLite early |
| Payment webhook duplication | Double charge or wrong status | Idempotency keys + order state machine |
| Suggestion “apply” magic | Wrong campaign config | Preview step still required before Go Live unless explicitly “instant promo” product decision |
| Scope creep into POS | Slower MVP | `PRODUCT_OVERVIEW.md` review on every major PR |

---

## 8) Definition of done (per major slice)

Use in PR descriptions.

- **API slice:** Documented shape + example JSON + error cases + attribution fields listed.
- **UI slice:** Matches section IDs in `PRODUCT_ARCHITECTURE.md` order; empty and error states; mobile where customer-facing.
- **Integration slice:** Sandbox credentials documented; rollback steps; no secrets in repo.
- **Analytics slice:** Event name + schema in canonical list; dashboard metric defined in one sentence.

---

## 9) Alignment with README “Butter” phases

| Butter | Maps to this plan |
|--------|-------------------|
| Phase 1 UX foundation | Phase 1 wizard + `ux-growth-os-spec` details |
| Phase 2 orchestrator | Phase 4 suggestions (ensure API carries rationale/confidence) |
| Phase 3 publish | Phase 1 step 4 + Phase 2 entry URLs |
| Phase 4 analytics + learning | Phase 3 + event hooks from Phase 1 onward |

---

## 10) Future you will thank you for

1. **Stable `campaign_id` and `restaurant_id`** on every revenue-bearing row from day one.  
2. **Raw events table or append-only log** before fancy charts.  
3. **Payment provider behind an interface** — swapping Stripe/Adyen later is a config change, not a rewrite.  
4. **One owner app entry** — reduces cognitive load for team and agents.  
5. **Periodic doc updates** — when API paths diverge from `PRODUCT_ARCHITECTURE.md`, update the doc in the same PR.

---

## 11) Immediate next actions (this week)

1. **Freeze** Phase 0 outputs: attribution table + event list + QR URL format.  
2. **Decide** canonical owner app: extend `growth-home` vs unify static dashboard (document decision in README or here).  
3. **Branch** `feature/phase-0-contracts` or smallest slice of Phase 1 shell.  
4. **Smoke** existing campaign → QR → menu path in repo; note gaps in a short checklist issue or section below this doc.

---

*Last aligned with: `PRODUCT_ARCHITECTURE.md` (§12 checklist), `PRODUCT_OVERVIEW.md` (pillars + attribution), repo multi-flow rules.*
