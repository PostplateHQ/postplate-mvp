# Flow: Growth OS shell (SPA)

**Scope:** Single-page app host, client-side routing, sidebar, profile header, loading/error shells—not deep campaign logic.

**Entry:** `http://localhost:3000/` → `frontend/index.html` loads `frontend/growth-os-app.js`.

**Key files**
- `frontend/growth-os-app.js` — `ROUTES`, `navigate`, `parseRouteFromUrl`, `refreshRoute`, `boot`, global `state`, `bindGlobalEvents`
- `frontend/styles.css` — layout, sidebar, shared cards
- `frontend/ui-data-adapter.js` — `loadProfile`, `getGrowthHubData`, shared fetches (also used by other flows)

**Routing:** `?page=<route>` e.g. `home`, `campaigns`, `create-campaign`, `smart-reminders`, `reel-guide`, `settings`.

**Related flows:** Campaign builder and Smart Actions are **separate context files**—only touch their sections in `growth-os-app.js` when working those flows.

**APIs (at a glance):** Profile and hub pull via adapter; see `02-smart-actions-hub.md` / `07-menu-profile.md` for specifics.
