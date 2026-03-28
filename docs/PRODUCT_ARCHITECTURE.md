# PostPlate — Product Architecture (Build Spec)

**Working product name:** PostPlate — Growth OS for Restaurants  

**Audience:** Engineers, designers, and AI agents (Cursor/Codex) implementing the owner app, customer menu, and supporting APIs.  

**Companion doc:** [`backend/PRODUCT_OVERVIEW.md`](../backend/PRODUCT_OVERVIEW.md) — backend domain boundaries, attribution rules, and API philosophy. This document defines **what the product surfaces**; that doc defines **how the backend should behave**.

**How to use this file**

- Implement **App shell** once; every owner screen mounts inside **Main Canvas** with shared **Top Nav** + **Sidebar**.
- For each **Screen**, ship the **exact sections** in order unless a ticket explicitly defers a section.
- For each **Flow**, preserve step order and data handoff (campaign ID, session, attribution).
- **System logic** sections name the engines responsible; wire UI to APIs/events per `PRODUCT_OVERVIEW.md`.

---

## 0) Global app structure

### 0.1 Layout (owner app)

Fixed chrome for all owner routes:

```text
┌────────────────────────────────────────────────────────────┐
│ Top Nav — context (restaurant name / env) + primary actions │
├─────────────────┬──────────────────────────────────────────┤
│ Sidebar         │ Main Canvas — route-specific UI            │
│ (primary nav)   │ (scrollable; max width ~1280px centered)   │
└─────────────────┴────────────────────────────────────────────┘
```

**Top Nav (required behaviors)**

| Region        | Content |
|---------------|---------|
| Left          | Product mark + current restaurant name (or single-restaurant label) |
| Center (opt.) | Page title or breadcrumb when deeper than one level |
| Right         | Global actions: help, notifications (stub OK for MVP), account menu |

**Sidebar (MVP — minimal, fixed order)**

1. Dashboard  
2. Campaigns  
3. Orders  
4. Menu  
5. Analytics  
6. Customers (Retention)  
7. Settings  

**Rules**

- No secondary nav clutter in MVP; use in-page tabs only when a screen spec calls for them.
- **Active route** clearly indicated; collapsed sidebar on small breakpoints is acceptable if toggle preserves order.

### 0.2 Suggested route map (owner)

Use these paths (or equivalent) so agents and humans stay aligned:

| Route            | Screen ID        | Purpose |
|------------------|------------------|---------|
| `/` or `/dashboard` | `SCR-DASHBOARD` | Command center |
| `/campaigns`     | `SCR-CAMPAIGN-LIST` | Campaign grid |
| `/campaigns/new` | `SCR-CAMPAIGN-WIZARD` | 4-step create |
| `/campaigns/:id` | `SCR-CAMPAIGN-DETAIL` | Edit / status (optional MVP; wizard may cover most) |
| `/orders`        | `SCR-ORDERS`     | Lightweight order list |
| `/menu`          | `SCR-MENU-OWNER` | Owner menu management |
| `/analytics`     | `SCR-ANALYTICS`  | Funnel + campaign performance |
| `/suggestions`   | `SCR-SUGGESTIONS`| Dedicated recommendations (may mirror dashboard strip) |
| `/customers`     | `SCR-CUSTOMERS`  | Retention |
| `/settings`      | `SCR-SETTINGS`   | Profile, billing hooks, prefs |

**Customer / public routes** (conversion engine; separate layout — no owner sidebar):

| Route              | Screen ID           |
|--------------------|---------------------|
| `/m/:slug` or `/menu?...` | `SCR-MENU-CUSTOMER` |
| `/cart`            | `SCR-CART`          |
| `/checkout/...`    | `SCR-CHECKOUT`      |
| `/order/:id`       | `SCR-ORDER-STATUS`  |

Exact slugs/query params follow QR/session design in backend; UI must read **campaign/menu context** from server on load.

---

## 1) Dashboard — Home / Command Center

**Screen ID:** `SCR-DASHBOARD`  
**Goal:** One glance: today’s numbers, trend, what’s live, what to do next, what’s blocked.

### Sections (top → bottom — do not reorder for MVP)

#### Section 1 — Today snapshot (metric cards)

**ID:** `DASH-SEC-01`  

| Card              | Primary metric        | Notes |
|-------------------|------------------------|-------|
| Revenue today     | Currency, large bold   | Single day, restaurant TZ |
| Orders today      | Integer, large bold    | Count of paid or placed per product rule |
| Active campaigns  | Integer + link         | “Live + scheduled starting today” definition in API |
| Conversion rate   | Percentage             | Define numerator/denominator in analytics (e.g. menu sessions → orders) |

**UX:** Large, bold numbers; short labels; tap/click card → filtered drill-down where applicable (e.g. campaigns → list filtered Live).

#### Section 2 — Performance graph

**ID:** `DASH-SEC-02`  

- **Metric:** Revenue  
- **Toggle:** 7d | 30d (segmented control)  
- **Overlay:** Campaign markers (vertical markers or labeled points on timeline) tied to `campaign_id`  
- **Empty state:** “No revenue in this period” + CTA to Campaigns  

#### Section 3 — Active campaigns (horizontal cards)

**ID:** `DASH-SEC-03`  

Each card **must** show:

- Poster preview (thumbnail)  
- Campaign / offer title  
- Orders (period aligned with card or “all time” — pick one and document in API)  
- Revenue (same period)  
- Status: **Live** | **Scheduled** | **Paused** | **Draft** (show only relevant MVP states)  

**CTAs per card:**

- **Edit** → `SCR-CAMPAIGN-WIZARD` or detail with edit  
- **Pause** → confirm → API updates status  

**Layout:** Horizontal scroll on narrow view; grid/wrap on wide if specified by design system.

#### Section 4 — Smart suggestions (sticky below-the-fold OK; “sticky” = visually distinct band)

**ID:** `DASH-SEC-04`  

- List/card format: **insight line** + **one-line rationale** + **primary CTA**  
- Examples (copy patterns, not hardcoded):  
  - “Run this offer tomorrow” → **Apply in 1 click**  
  - “Push Biryani (high margin)” → **Apply in 1 click** / **Create campaign**  
  - “Lunch is underperforming” → **View analytics** / **Create campaign**  

**Behavior:** Primary CTA should invoke suggestion API (apply draft campaign, prefill wizard, or deep link) with `suggestion_id` for attribution.

#### Section 5 — Pending actions

**ID:** `DASH-SEC-05`  

- **Offers not redeemed** (or “low redemption” — define threshold server-side)  
- **Campaign not finished setup** (drafts missing step 4, or validation errors)  

Each row: title, short reason, CTA **Complete setup** / **View offer**.

### Dashboard — system logic

| Section    | Depends on              | Engine / service        |
|------------|-------------------------|-------------------------|
| 1–2        | Aggregates, time range  | Analytics + billing/orders |
| 3          | Campaign list + stats   | Campaign + Analytics    |
| 4          | Patterns, rules, AI     | Suggestion              |
| 5          | Draft + redemption data | Campaign + Offers       |

---

## 2) Campaigns module (core engine)

### Screen A — Campaign list

**Screen ID:** `SCR-CAMPAIGN-LIST`  
**Goal:** Browse and launch work; marketing feel, not spreadsheet.

**Layout:** **Grid of cards** (not a table for MVP).

**Top bar actions**

- **Create Campaign** → `SCR-CAMPAIGN-WIZARD` step 1  
- **Filter:** Active | Past | Draft (single filter or tabs; mutually exclusive)  

**Each card must show**

- Poster preview  
- Offer title  
- Revenue generated (filter-scoped or all-time — consistent with dashboard)  
- Status  
- Date range (start–end)  

**Card click:** Open campaign detail or wizard at last completed step (product decision: prefer detail view when exists).

### Screen B — Create campaign (4-step wizard)

**Screen ID:** `SCR-CAMPAIGN-WIZARD`  
**Goal:** Guided publish path; smart defaults; minimal typing.

**Global wizard UI**

- Step indicator: 1–4  
- **Back** / **Next**; **Save draft** available on every step  
- Draft persists `campaign_id` for resume  

---

#### Step 1 — Offer basics

**ID:** `WIZ-STEP-01`  
**Title (screen):** “Let’s create your offer”

| Field           | Control        | Notes |
|-----------------|----------------|-------|
| Offer type      | Dropdown       | Backed by canonical offer types in API |
| Items           | Multi-select   | From menu items API |
| Discount / deal | Inputs per type| Validation server-side |
| Days active     | Date range or presets | Smart defaults: e.g. weekend, 7 days |

**UX:** Apply **smart defaults** on load (pre-selected type, dates); show “Recommended” badge when from suggestion.

---

#### Step 2 — Style & intent

**ID:** `WIZ-STEP-02`  
**Title:** “What’s on your mind?”

**Chips (multi-select where applicable)**

- Dark | Light  
- Bold | Minimal  
- Text heavy | Image heavy  

**Keywords:** Free text (feeds generation prompt; max length enforced).

---

#### Step 3 — Creative generation

**ID:** `WIZ-STEP-03`

**Show**

- **3 poster options** (select one as primary)  
- **2 reel previews** (optional MVP — hide section if feature flag off)  

**Controls**

- **Regenerate** (async; show job state)  
- **Edit text** (inline or modal)  
- **Change image** (upload or variant)  

**System:** Creative generation is **async** per `PRODUCT_OVERVIEW.md`; UI must poll or subscribe to job completion.

---

#### Step 4 — Preview & launch

**ID:** `WIZ-STEP-04`

**Full preview (modal or full page)**

- Poster (final)  
- Offer details (terms, items, discount)  
- QR code (encoded with menu/campaign attribution)  
- Terms / legal copy block  

**Actions**

- **Save Draft**  
- **Go Live** → validation → status Live + confirmation  

**After Go Live:** Redirect to `SCR-CAMPAIGN-LIST` (Active) or campaign detail with share/QR emphasis.

### Campaigns — system logic

| Step / screen | Inputs                    | Output                         |
|---------------|---------------------------|--------------------------------|
| List          | Filters                   | Card grid + metrics            |
| 1–2           | Offer + style             | Draft campaign + gen context   |
| 3             | Draft + prompts           | Creative assets + versions     |
| 4             | Final creative            | Live campaign + QR + attribution id |

---

## 3) Menu + order flow (conversion engine)

**Scope:** Lightweight **scan-to-order** flow — not a full POS. No POS maintenance, labor tooling, or kitchen operations products. See `PRODUCT_OVERVIEW.md` pillar 2.

### Screen — Customer menu (QR entry)

**Screen ID:** `SCR-MENU-CUSTOMER`  
**Layout:** Mobile-first; no owner chrome.

**Header**

- Restaurant name  
- **Active offer banner** (pull from campaign linked to QR/session)  

**Body — menu**

- Categories (vertical list or tabs)  
- Items: image, name, price, **“Offer applied”** badge when line item matches active campaign  

**Bottom sticky**

- **Cart** button with item count + subtotal teaser  

### Cart — complements + review

**Screen ID:** `SCR-CART` (or cart drawer that expands to full **Review** step on mobile)

After adding items, before payment:

1. **Complementary suggestions** — e.g. cart has mains → surface **drinks / sides** (one row or carousel; **Add** is one tap). Rules come from menu metadata (category/tags), bundles, or a small suggestion service — keep explainable and skippable.  
2. **Review cart** — line items, qty adjust/remove, subtotal, taxes/fees per product rules, **offer savings** row.  
3. Primary CTA: **Continue to payment** → `SCR-CHECKOUT`.

**Empty cart:** redirect or prompt back to menu.

### Screen — Checkout

**Screen ID:** `SCR-CHECKOUT`

- Order summary (lines, qty, prices) — may mirror review or stay as final confirmation strip  
- **Apply offer** — auto-applied when campaign valid; show savings row  
- **Payment CTA** (integrates with billing provider per backend)  

**Attribution:** Request carries `campaign_id` + session id from menu load through order create.

### Screen — Order status (customer)

**Screen ID:** `SCR-ORDER-STATUS`  
**Post-payment:** Show order reference, **tracked status** (minimal pipeline, e.g. Received → Preparing → Ready / On the way → Completed), and any pickup/delivery note the restaurant configures.  

**Not in scope:** Staff KDS, ticket printing, shift management — only what the **customer** needs to trust the order is in progress and done.

**Flow (customer)**

1. Scan QR  
2. Land on menu with **offer auto-highlighted** (banner + badges)  
3. Add to cart  
4. See **complementary suggestions**; add optional items  
5. **Review cart** → continue to checkout  
6. Pay → order placed  
7. **Track order** until it is with the customer (`SCR-ORDER-STATUS` or equivalent deep link)

### Menu (owner)

**Screen ID:** `SCR-MENU-OWNER`  

- CRUD categories/items for digital menu; links to campaigns for “promoted” flags.  
- Keep scope MVP: no kitchen/inventory/table modules (see `PRODUCT_OVERVIEW.md`).

---

## 4) Orders screen

**Screen ID:** `SCR-ORDERS`  
**Goal:** Operational truth without POS depth.

**Layout:** Simple **list** (not board).

**Each row**

- Order id / short ref  
- Items summary (truncated)  
- Amount  
- Status: **Paid** | **Pending** (extend only if API supports)  

**Filters**

- Today | All  

**Empty state:** “No orders yet” + link to Campaigns or QR setup.

---

## 5) Analytics

**Screen ID:** `SCR-ANALYTICS`  
**Goal:** Decision metrics, not vanity.

### Sections (top → bottom)

#### Section 1 — Revenue by campaign

**ID:** `ANL-SEC-01`  
- **Bar chart** — x: campaign, y: revenue  
- Click bar → campaign detail or filtered orders  

#### Section 2 — Conversion funnel

**ID:** `ANL-SEC-02`  
- Stages: **Views → Orders** (expand later: add to cart, checkout started, paid)  
- Show counts + drop-off %  

#### Section 3 — Top items

**ID:** `ANL-SEC-03`  
- Ranked list: item name, orders, revenue  

#### Section 4 — Time insights

**ID:** `ANL-SEC-04`  
- Best days / hours (heatmap or simple lists)  

---

## 6) Suggestions (dedicated view)

**Screen ID:** `SCR-SUGGESTIONS`  
**Goal:** Full-page focus when dashboard strip is not enough.

**Layout:** Card-based recommendations.

**Each card**

- **Insight** (headline)  
- **Suggested action** (body)  
- **Confidence** or **priority** (optional)  
- **CTA** — e.g. “Create Campaign” (prefill wizard from payload)  

**Example pattern:** “Your lunch traffic is low → Run 15% combo” → **Create Campaign**

**Sync:** Same suggestion records as `DASH-SEC-04`; status: new / applied / dismissed / completed (backend).

---

## 7) Customers (retention engine)

**Screen ID:** `SCR-CUSTOMERS`  
**Goal:** Light retention actions; no full CRM in MVP.

### Sections

#### Section 1 — Recent customers

**ID:** `CUS-SEC-01`  
- List: identifier (name/phone mask/order count), last visit, linked orders  

#### Section 2 — Repeat vs new

**ID:** `CUS-SEC-02`  
- Simple counts or ratio for period  

#### Section 3 — Actions

**ID:** `CUS-SEC-03`  
- **Send reminder** / **Send comeback offer** → opens composer or campaign wizard with segment prefill  

**Privacy:** Only fields and channels enabled by product/legal; stub actions OK with clear “coming soon” if not wired.

---

## 8) Settings

**Screen ID:** `SCR-SETTINGS`  

Minimum MVP blocks:

- Restaurant profile + branding  
- Billing / payment connection status  
- Notification preferences (stub)  
- QR / default menu link preview  

---

## 9) Core flows (UX + data)

### Flow 1 — Owner growth loop

| Step | Actor | Screen / action | System outcome |
|------|-------|-----------------|----------------|
| 1 | Owner | Open Dashboard | Loads aggregates |
| 2 | Owner | Create Campaign | Draft created |
| 3 | Owner | Complete wizard → Go Live | Campaign live, QR valid |
| 4 | Customer | Orders via menu | Order + attribution |
| 5 | System | Revenue recorded | Analytics update |
| 6 | System | Suggestion job | New suggestions |
| 7 | Owner | Apply suggestion / new campaign | Loop repeats |

### Flow 2 — Customer journey

| Step | Surface | Notes |
|------|---------|-------|
| 1 | Instagram / QR / link | Lands with campaign context |
| 2 | Offer awareness | Banner + badges |
| 3 | Menu | Browse; add to cart |
| 4 | Cart | Complementary suggestions (e.g. drinks with food); review lines |
| 5 | Checkout | Summary + offer line |
| 6 | Pay | Provider flow; webhook → order Paid |
| 7 | Order status | Tracked until order is with customer |

### Flow 3 — Retention loop

| Step | Actor | Notes |
|------|-------|-------|
| 1 | System | Track order + campaign |
| 2 | System | Suggestion or segment rule |
| 3 | Owner | Sends reminder / comeback offer |
| 4 | Customer | Returns via new campaign or link |

---

## 10) System logic (behind the UI)

### Engine map

| Engine            | Responsibility | Key inputs | Key outputs | Surfaces |
|-------------------|----------------|------------|-------------|----------|
| **Campaign**      | Offers, schedule, creatives, QR | Items, type, style, dates | Posters, copy, QR, `campaign_id` | Wizard, list, dashboard cards |
| **Conversion**    | Menu → cart → complements → review → pay → track | Menu, campaign context, cart snapshot | Order, line items, add-on suggestions, status, attribution | Menu, cart, checkout, order status |
| **Analytics**     | Events + aggregates | Events API, orders | Revenue, funnel, time series | Dashboard graph, Analytics |
| **Suggestion**    | Next best actions | Sales, time patterns, inventory of campaigns | Suggestion cards + apply payloads | Dashboard strip, Suggestions screen |
| **Retention**     | Customer history + outreach hooks | Orders, opt-in contacts | Segments, reminder jobs | Customers |

### Attribution chain (non-negotiable)

Every order and analytics event should be able to answer: **which restaurant, which campaign, which session, which menu path**. See `PRODUCT_OVERVIEW.md` — do not strip IDs at the UI layer if the API returns them.

---

## 11) Final product shape (engines ↔ nav)

| Pillar | Owner nav | Customer / public |
|--------|-----------|-------------------|
| Growth engine | Campaigns | — |
| Conversion engine | Menu (owner), Orders | Menu, Cart, Checkout, Order status |
| Intelligence engine | Dashboard, Analytics | — |
| Decision engine | Dashboard (suggestions), Suggestions | — |
| Retention engine | Customers | (future messaging surfaces) |

---

## 12) MVP build checklist (execution order)

Use this order to reduce rework:

1. **App shell** — Top Nav + Sidebar + routes (empty placeholders).  
2. **Campaign list + wizard skeleton** — steps 1–2 with draft save.  
3. **Creative step** — async generation UI + asset selection.  
4. **Preview + Go Live** — QR in preview.  
5. **Customer menu + cart** — complements + review + checkout — with `campaign_id` through payment.  
6. **Order status (customer)** — minimal pipeline after pay.  
7. **Orders list (owner)** — Today / All.  
8. **Dashboard** — wire sections 1 → 5 as data becomes available.  
9. **Analytics** — four sections.  
10. **Suggestions** — dashboard strip then dedicated page.  
11. **Customers** — minimal list + CTA stubs.  
12. **Settings** — profile + billing status.

---

## 13) One-line summary for agents

**PostPlate owner app:** a minimal sidebar drives **Dashboard → Campaigns → Orders → Menu → Analytics → Customers → Settings**; the customer path is **QR → menu → cart (complements + review) → checkout → pay → order tracking**, with **campaign attribution** end-to-end and **suggestions** closing the growth loop.
