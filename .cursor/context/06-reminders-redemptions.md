# Flow: Reminders & redemptions

**Scope:** Guest redeem flows, reminder eligibility, batch send, email hooks.

**Key files**
- `backend/routes/redemptions.js` — redeem endpoints, `POST /send-reminders/:store`
- `backend/services/reminders.js` — `createReminderService`, eligibility, `processReminderById`
- `backend/routes/smart-actions.js` — `GET .../reminders/eligible` (list for UI)
- `frontend/growth-os-app.js` — `renderSmartRemindersRoute`, `state.smartReminders`
- `frontend/ui-data-adapter.js` — `getEligibleReminders`, `sendReminderBatch`
- `backend/mail/reminders.js` (if present) — transport

**Branch:** `feature/reminders-*`

**Avoid mixing:** Offer creation/marketing copy → `05-offers-backend.md` / `04-campaign-generation-api.md`.
