# PostPlate Backend Product Overview

Repo-level guide for Cursor, Codex, and contributors. Use this when making backend decisions, scoping features, or aligning APIs with product intent.

## What we are building

PostPlate is a restaurant growth operating system focused on helping restaurant owners attract customers, convert them into orders, measure what works, and improve future campaigns.

This is **not** a POS-first product.

This is a **growth-first** product with a lightweight commerce layer.

The backend must always protect that principle.

## Core product vision

PostPlate should help a restaurant owner do this loop:

**Create campaign → publish creative → customer scans/views → customer orders → payment/billing happens → analytics update → system suggests next best action**

Everything in the backend should support this closed loop.

## Main product pillars

### 1. Campaigns / Offers / Creatives

Owners should be able to create and manage:

- offers
- promotions
- posters
- AI-assisted creatives
- reels / short-form video concepts or generated assets
- campaign scheduling
- campaign status tracking

This module is about **bringing customers in**.

**Backend responsibilities:**

- campaign CRUD
- offer metadata storage
- creative generation request orchestration
- asset references and versions
- scheduling / status management
- linking campaign to menu items and analytics

### 2. Digital Menu + Scan to Order + Billing

Customers should be able to:

- scan a QR code
- open a digital menu
- see promoted items/offers highlighted
- add items to cart
- place an order
- pay the bill through supported billing/payment integration

This is **not** a full POS.

**Lightweight ordering (in scope — not full-width POS)**

The conversion path is intentionally narrow and customer-led:

1. Customer scans QR → opens digital menu (with offer context).
2. Customer adds items to cart.
3. System may surface **contextual add-ons** — e.g. if cart is food-heavy, suggest **complementary items** (drinks, sides) using simple rules, menu tags, or light ML later — still **optional one-tap adds**, not a staff-driven POS.
4. Customer **reviews the cart** (lines, totals, offer savings).
5. Customer pays → order is placed and stored.
6. Order is **tracked in-system** with statuses the customer can see until the order is effectively **with the customer** (e.g. received → preparing → ready/picked up or delivered — exact labels are product copy, not a kitchen display system).

This is **growth + digital order capture**, not operations software.

**Do not drift into:**

- POS maintenance, register hardware, or “replace the POS” workflows
- labor scheduling, tip pools, or staff ops tooling beyond bare MVP needs
- inventory management
- kitchen display / full BOH orchestration
- table management complexity
- staff permissions complexity beyond MVP needs
- hardware/POS replacement behavior

This module exists to **convert campaigns into trackable revenue**.

**Backend responsibilities:**

- menu/category/item APIs
- QR/menu session context
- cart and checkout state
- **complementary-item suggestion** inputs (e.g. cart snapshot, menu tags/categories) and ranked add-on payloads
- order creation
- billing/payment integration hooks
- **order status** for customer-visible tracking and owner list views (minimal state machine)
- campaign-to-order attribution

### 3. Analytics

Owners should understand:

- how campaigns performed
- which offers created revenue
- which items perform best
- when customers are buying
- what channels or promotions work

This is **not** vanity analytics.

The backend should prioritize **decision-making metrics**.

**Key examples:**

- revenue by campaign
- orders by campaign
- conversion from menu view to order
- top items
- repeat purchase indicators
- performance by day/time

**Backend responsibilities:**

- event tracking
- aggregations
- attribution logic
- metrics APIs
- summary views for dashboard and detailed views

### 4. Suggestions / Growth Guidance

The product should help owners **grow**, not just show data.

**Examples:**

- recommend an offer for tomorrow
- suggest which item to promote
- identify underperforming dayparts
- suggest aggressive campaigns when traffic is down
- propose re-engagement actions

This layer should be powered by campaign, menu, order, and analytics data.

**Backend responsibilities:**

- recommendation input pipelines
- rules engine and/or AI suggestion orchestration
- explainable suggestion payloads
- suggestion status tracking (new, applied, dismissed, completed)

### 5. Retention / Customer Re-engagement

The product should help **bring customers back**.

**Examples:**

- reminder campaigns
- unused offer follow-ups
- repeat-visit nudges
- targeted comeback campaigns

**Backend responsibilities:**

- customer profile foundations
- customer-event history
- segmentation basics
- reminder/re-engagement workflows
- future support for email/SMS/WhatsApp orchestration

## Product positioning

**PostPlate is not:**

- a generic design tool
- a pure menu tool
- a full POS
- an operations-heavy restaurant ERP

**PostPlate is:**

- a growth engine
- a campaign-to-conversion system
- a lightweight digital ordering and billing layer
- an analytics and recommendation engine for restaurant owners

**When making backend decisions, always ask:**

> Does this help owners attract, convert, measure, or grow?

If not, it is probably outside scope.

## MVP mindset

The product must remain:

- simple
- guided
- fast
- useful for non-technical restaurant owners

Avoid overbuilding.

**The backend should prefer:**

- clear domain models
- strong attribution
- flexible campaign linkage
- safe integrations
- maintainable APIs

**The backend should avoid:**

- premature complexity
- POS-style expansion
- too many detached micro-features
- deep workflow branching unless directly tied to growth or conversion

## Core backend domain model

These are the main entities the system should revolve around.

### Restaurant

Represents the business account/storefront.

**Likely includes:**

- profile
- branding
- cuisine/category
- location
- settings
- billing/payment config
- campaign preferences

### Menu

Represents the digital menu displayed to customers.

**Likely includes:**

- categories
- items
- modifiers if needed later
- item pricing
- availability state
- media
- tags
- promotion linkage

### Campaign

Represents an offer/promotion/marketing initiative.

**Likely includes:**

- title
- offer type
- campaign objective
- target items
- creative assets
- active dates
- status
- source/channel
- linked QR/menu routes
- analytics attribution ID

### Creative Asset

Represents a poster, image, reel concept, short video, or generated content unit.

**Likely includes:**

- asset type
- generation prompt/context
- storage location
- version
- metadata
- review status
- relation to campaign

### Order

Represents a customer purchase session.

**Likely includes:**

- menu items
- totals
- discounts applied
- linked campaign
- source entry point
- payment/billing status
- timestamps

### Payment / Billing Record

Represents payment events and bill settlement status.

**Likely includes:**

- provider reference
- amount
- status
- settlement state
- order relation

### Analytics Event

Represents measurable product/customer actions.

**Examples:**

- campaign viewed
- menu viewed
- item clicked
- cart started
- checkout started
- payment completed
- offer redeemed

This entity is **critical** for attribution and suggestions.

### Suggestion

Represents an actionable recommendation surfaced to the owner.

**Likely includes:**

- type
- reason
- confidence
- related campaign/item/time window
- status
- created_at
- acted_on_at

### Customer

Optional MVP-light entity, but important for future retention.

**Likely includes:**

- contact info if available
- order history
- campaign redemption behavior
- repeat/new classification

## Key relationships

The backend should be designed so these relationships are first-class:

- restaurant has many menus
- restaurant has many campaigns
- campaign targets many menu items
- campaign has many creative assets
- order belongs to restaurant
- order may belong to or be attributed to campaign
- order has payment record(s)
- analytics events can link to restaurant, campaign, menu item, order, and customer
- suggestions are generated from campaign + order + analytics patterns

**This attribution chain is one of the most important parts of the product.**

## Most important backend principle: attribution

A major value of PostPlate is being able to say:

- this campaign generated these orders
- this offer created this much revenue
- this item performed because of this promotion
- this suggestion was based on real behavior

Because of that, backend design must strongly preserve:

- campaign IDs
- session/source tracking
- order linkage
- event lineage
- timestamps
- restaurant context

**Never treat analytics as an afterthought.**

## API design philosophy

APIs should be:

- clean
- modular
- predictable
- easy to extend
- safe for AI-assisted product flows

Prefer **domain-based** routes/modules such as:

- `/restaurants`
- `/campaigns`
- `/creatives`
- `/menu`
- `/orders`
- `/billing`
- `/analytics`
- `/suggestions`
- `/customers`

Avoid mixing unrelated concerns.

## Recommended backend module structure

Example only; **adapt to repo conventions**.

```text
backend/
  src/
    modules/
      restaurants/
      campaigns/
      creatives/
      menu/
      orders/
      billing/
      analytics/
      suggestions/
      customers/
    common/
      auth/
      db/
      config/
      events/
      jobs/
      integrations/
      utils/
```

If the repo is not fully modular yet, still think in these domain boundaries.

## Event and job architecture

Some backend actions should be synchronous, others async.

**Synchronous examples**

- create campaign
- fetch menu
- create order
- payment intent creation
- fetch analytics summary

**Async/background examples**

- creative generation
- reel/video generation
- campaign performance summarization
- suggestions generation
- reminder/re-engagement workflows
- nightly aggregations

Keep these separations clean.

## Integrations philosophy

Integrations should **support** the core loop, not define the product.

**Examples:**

- payment/billing provider
- creative generation provider
- messaging provider
- optional future POS sync
- optional future social publishing

Integrations should be abstracted behind services/adapters so the core domain is not tightly coupled to one vendor.

## UX assumptions backend should support

The frontend experience should feel:

- simple
- guided
- owner-friendly
- low-friction
- visually strong
- not overloaded

That means backend responses should support:

- dashboards with concise summaries
- wizard-style campaign creation
- progressive disclosure
- recommendation cards
- fast campaign previews
- menu personalization based on active offer context

## What to optimize for

Always optimize backend work for:

- campaign-to-revenue traceability
- simple onboarding
- fast campaign launch
- reliable ordering/billing flow
- actionable analytics
- future recommendation quality
- maintainability as product expands

## What not to optimize for right now

Do **not** prioritize:

- deep POS behaviors
- overly advanced restaurant operations
- feature sprawl
- excessive customization before core flow is strong
- generic CMS behavior that does not improve growth/conversion

## Suggested MVP release shape

### Phase 1

- restaurant profile
- menu management
- campaign creation
- creative asset linkage
- QR/scan-to-menu
- order flow
- payment/billing integration
- basic analytics attribution

### Phase 2

- smarter campaign suggestions
- retention workflows
- better analytics depth
- aggressive campaign prompts
- creative iteration history

### Phase 3

- reels / short video generation expansion
- customer segmentation
- social publishing integrations
- optional external system sync

## Non-negotiable product guardrails

- Keep product **growth-first**.
- Do **not** become a full POS.
- **Preserve attribution** across the entire funnel.
- Build **guided workflows**, not overwhelming feature surfaces.
- Prefer systems that improve **retention and monetization**, not just feature count.
- Every backend module should either **attract, convert, track, or improve**.

## One-line summary for any coding agent

**PostPlate is a restaurant growth OS:** campaigns bring customers in, digital menu + ordering converts them, billing captures revenue, analytics explain performance, and suggestions help owners grow again.
