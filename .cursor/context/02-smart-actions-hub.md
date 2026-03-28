# Flow: Smart Actions & Growth Hub

**Scope:** Dashboard “Smart Actions” cards, hub meta (window label, sample badge), quick actions, `handleAction` routing to create / reminders / reel.

**Key files**
- `frontend/growth-os-app.js` — `renderSmartActionCard`, `handleAction`, `applySmartActionToCampaignBuilder`, `renderHomeRoute`, `trackSmartActionImpression`, `trackSmartActionClick`, `renderSmartRemindersRoute`, `renderReelGuideRoute`
- `frontend/ui-data-adapter.js` — `fetchSmartActionsBundle`, `getGrowthHubData`, `getEligibleReminders`, `sendReminderBatch`
- `backend/routes/smart-actions.js` — `GET /api/stores/:storeId/smart-actions`, `GET .../reminders/eligible`

**Principles:** Trust labels tied to real signals; `insightSample` chip; no fake metrics in copy.

**Branch from:** `main` → e.g. `feature/smart-actions-*`

**Avoid mixing:** Heavy campaign step UI → use `03-campaign-builder.md` in another chat.
