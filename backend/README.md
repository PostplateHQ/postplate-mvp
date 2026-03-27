# Backend Architecture

This backend is an Express app with route modules and service modules.

## Entry Point

- `server.js`
  - Boots Express and middleware.
  - Registers route modules.
  - Wires service dependencies (store, reminders, domain helpers).
  - Starts HTTP server.

## Routes

- `routes/offers.js`
  - Offer CRUD/lifecycle, events, comparison, recommendation, stats, redemptions listing.
- `routes/profile.js`
  - Owner profile read/update endpoints.
- `routes/redemptions.js`
  - Redeem page serving, claim submission, mark-used, send reminders.
- `routes/qr.js`
  - QR generation endpoint.
- `routes/promo.js`
  - Legacy promo endpoints (`/promo/*`) kept for compatibility.

## Services

- `services/offersDomain.js`
  - Offer business rules, validation, enrichment, metrics, recommendation logic.
- `services/ownerProfile.js`
  - Owner profile derivation and update logic.
- `services/reminders.js`
  - Reminder eligibility, processing, and in-process scheduling.

## Data Layer

- `data/store.js`
  - JSON file persistence (`backend/db/data.json`).
  - Data normalization and safe load/save behavior.

## Promotions/Creative Stack

- `promotions/routes.js`
- `promotions/service.js`
- `promotions/create-offer-engine.js`

These handle offer-design flows, AI-assisted suggestions, and preview generation.

## Current Notes

- Persistence is file-based and synchronous for MVP simplicity.
- Reminder scheduling is in-process (`setTimeout`) and not durable across restarts.
- Legacy `/promo/*` routes are still active for compatibility during migration.
