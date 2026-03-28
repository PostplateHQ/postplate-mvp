# Flow: Menu, owner profile, settings

**Scope:** Restaurant profile, menu items, menu wizard, settings form, owner-driven fields used across campaigns.

**Key files**
- `backend/services/ownerProfile.js` — `getOwnerProfile`, `updateOwnerProfile`, `normalizeAudiencePrimary`, menu normalization
- `backend/routes/profile.js` — `GET/PUT /owner/profile`
- `frontend/growth-os-app.js` — menu wizard, `renderSettingsRoute`, `normalizeMenuItems`, profile-driven defaults in `resetCampaignBuilder`
- `backend/routes/menu.js` — menu import / extract APIs (if extending)

**Important fields:** `restaurantName`, `cuisineType`, `brandTone`, `audiencePrimary`, `primaryGoal`, `menuItems`, hours/days from wizard.

**Branch:** `feature/profile-menu-*`

**Dish / menu images:** When extending `suggest-item-image` or upload flows, follow [09-visual-creative-direction.md](09-visual-creative-direction.md) (authentic, “eat with eyes,” not sterile AI-only looks).
