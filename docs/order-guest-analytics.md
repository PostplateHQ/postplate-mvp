# Customer order flow — analytics events

Client implementation: [`frontend/order-guest.js`](../frontend/order-guest.js) posts to `POST /api/public/order-guest/event` with JSON bodies. The server route ([`backend/routes/orderGuestPublic.js`](../backend/routes/orderGuestPublic.js)) currently returns **204** and logs in non-production; replace with durable ingestion (queue, DB, or analytics vendor) when ready.

**Menu source:** [`GET /api/public/menu`](../backend/routes/publicMenu.js) serves store-scoped public items from `ownerProfiles[store].menuItems` (see [`backend/services/ownerProfile.js`](../backend/services/ownerProfile.js) for `priceCents` / `displayPrice`).

## Event catalog

All events include at minimum:

| Field | Type | Description |
|-------|------|-------------|
| `event` | string | Event name below |
| `ts` | string (ISO) | Client timestamp |

### `menu_viewed`

| Property | Type | Description |
|----------|------|-------------|
| `store_id` | string | Store / tenant key from URL |
| `offer_id` | string or null | `offerId` query param |
| `session_id` | string | Generated or restored session id (`pp_order_guest_v1` in localStorage) |

### `item_added`

| Property | Type | Description |
|----------|------|-------------|
| `item_id` | string | Menu item id |
| `store_id` | string | |
| `offer_id` | string or null | |
| `session_id` | string | |

### `cart_viewed`

| Property | Type | Description |
|----------|------|-------------|
| `store_id` | string | |
| `offer_id` | string or null | |
| `session_id` | string | |

### `complement_impression`

Fired when the complement carousel is shown (cart has a “main” and suggestions exist).

| Property | Type | Description |
|----------|------|-------------|
| `store_id` | string | |
| `session_id` | string | |
| `complement_ids` | string[] | Suggested item ids |

### `complement_added`

| Property | Type | Description |
|----------|------|-------------|
| `item_id` | string | Added complement item id |
| `store_id` | string | |
| `session_id` | string | |

### `checkout_started`

| Property | Type | Description |
|----------|------|-------------|
| `store_id` | string | |
| `offer_id` | string or null | |
| `session_id` | string | |

### `intro_viewed`

Fired on [`menu-intro.html`](../frontend/menu-intro.html) load (before session skip).

| Property | Type | Description |
|----------|------|-------------|
| `store_id` | string | |

### `intro_completed`

User tapped **Continue to menu** (sessionStorage marks intro seen for store).

| Property | Type | Description |
|----------|------|-------------|
| `store_id` | string | |

### `menu_search`

Debounced search input on menu (length-only payload to avoid logging query text).

| Property | Type | Description |
|----------|------|-------------|
| `store_id` | string | |
| `session_id` | string | |
| `q_len` | number | Search string length |

### `theme_changed`

User cycled theme (Auto / Light / Dark) via chrome toggle.

| Property | Type | Description |
|----------|------|-------------|
| `theme_pref` | string | `auto`, `light`, or `dark` |

### `payment_method_selected`

Checkout: user chose **Apple Pay (demo)** or **Pay with card (demo)**.

| Property | Type | Description |
|----------|------|-------------|
| `method` | string | e.g. `apple_pay_demo`, `card_demo` |
| `store_id` | string | |
| `session_id` | string | |

### `payment_completed`

Demo checkout: fired when user completes payment before redirect to **receipt** page. Also triggers `POST /api/public/orders` (stub).

| Property | Type | Description |
|----------|------|-------------|
| `order_id` | string | Generated order id |
| `store_id` | string | |
| `offer_id` | string or null | |
| `session_id` | string | |
| `revenue_cents` | number | Total charged (integer cents) |
| `payment_method` | string | Same as `payment_method_selected.method` |

### `receipt_requested`

User submitted optional email/phone on receipt; `POST /api/public/order-guest/receipt` (204 stub).

| Property | Type | Description |
|----------|------|-------------|
| `order_id` | string | |
| `store_id` | string | |
| `has_email` | boolean | |
| `has_phone` | boolean | |

### `order_status_viewed`

| Property | Type | Description |
|----------|------|-------------|
| `order_id` | string or null | From query `id=` |
| `store_id` | string | |
| `session_id` | string or null | From last order payload or URL |

## Alignment with product analytics

These names map to the funnel described in [`backend/PRODUCT_OVERVIEW.md`](../backend/PRODUCT_OVERVIEW.md) (menu view → cart → checkout → payment). Add server-side duplicates (e.g. on order create) for authoritative revenue and attribution when the order API exists.

## Debugging

Set `window.__PP_ORDER_GUEST_DEBUG__ = true` before loading `order-guest.js` to mirror events to the console. Listen for `pp-order-guest` `CustomEvent` on `window` with `detail` equal to the payload.
