# Context packs for separate chats

Use **one Cursor chat / Composer per flow** so each thread stays focused. At the **start of a new chat**, attach the matching file with `@` (e.g. `@.cursor/context/03-campaign-builder.md`).

| File | Use this chat for |
|------|-------------------|
| [01-growth-os-shell.md](01-growth-os-shell.md) | SPA shell, routing, nav, global state boot |
| [02-smart-actions-hub.md](02-smart-actions-hub.md) | Smart Actions cards, hub data, analytics events |
| [03-campaign-builder.md](03-campaign-builder.md) | Create-campaign wizard, poster UI, publish/draft |
| [04-campaign-generation-api.md](04-campaign-generation-api.md) | `/api/campaign/generate`, copy & poster prompts |
| [05-offers-backend.md](05-offers-backend.md) | Offers CRUD, `offersDomain`, live/paused lifecycle |
| [06-reminders-redemptions.md](06-reminders-redemptions.md) | Eligible reminders, send batch, redemption flows |
| [07-menu-profile.md](07-menu-profile.md) | Owner profile, menu import/wizard, settings form |
| [08-public-pages.md](08-public-pages.md) | redeem, capture, success, QR, legacy offers HTML |
| [09-visual-creative-direction.md](09-visual-creative-direction.md) | Food images, posters, future reels/video—authentic vs “AI look” |

**Branch rule:** Sync `main`, then `git checkout -b feature/...` before implementation (see `.cursor/rules/git-branch-workflow.mdc`).
