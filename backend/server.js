require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const express = require("express");
const path = require("path");
const QRCode = require("qrcode");
const { sendReminderEmail } = require("./mail/reminders");
const { createDataStore } = require("./data/store");
const { registerPromotionRoutes } = require("./promotions/routes");
const { registerOfferRoutes } = require("./routes/offers");
const { registerProfileRoutes } = require("./routes/profile");
const { registerRedemptionRoutes } = require("./routes/redemptions");
const { registerLegacyPromoRoutes } = require("./routes/promo");
const { registerQrRoutes } = require("./routes/qr");
const { registerPublicMenuRoutes } = require("./routes/publicMenu");
const { registerOrderGuestPublicRoutes } = require("./routes/orderGuestPublic");
const { registerMenuRoutes } = require("./routes/menu");
const { registerCampaignRoutes } = require("./routes/campaign");
const { registerSmartActionsRoutes } = require("./routes/smart-actions");
const { createReminderService } = require("./services/reminders");
const { getOwnerProfile, updateOwnerProfile, normalizeAudiencePrimary } = require("./services/ownerProfile");
const {
  parseRewardValue,
  validateOfferPayload,
  getStoreOffers,
  getActiveOffer,
  getOfferById,
  enrichOffer,
  getOfferMetrics,
  getOfferHistory,
  getOffersComparison,
  getOfferRecommendation,
} = require("./services/offersDomain");
const { listPresetCatalog, buildPreview } = require("./promotions/service");

const app = express();
app.use(express.json({ limit: "15mb" }));
app.use(express.static(path.join(__dirname, "..", "frontend")));
registerPromotionRoutes(app);
registerMenuRoutes(app);
registerCampaignRoutes(app);

app.get('/api/config/mode', (_req, res) => {
  res.json({ devMode: String(process.env.DEV_MODE || '').toLowerCase() === 'true' });
});

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

registerOrderGuestPublicRoutes(app);

app.use((error, _req, res, next) => {
  if (error && error.type === "entity.too.large") {
    return res.status(413).json({
      error: "payload too large",
      details: ["Uploaded file exceeds allowed size."],
    });
  }
  return next(error);
});

const PORT = 3000;
const dataPath = path.join(__dirname, "db", "data.json");
const REMINDER_DELAY_MS = 30 * 60 * 1000;

function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateOfferId() {
  return generateId("offer");
}

function generateRedemptionId() {
  return generateId("red");
}

function generateOfferEventId() {
  return generateId("offer_event");
}

function createOfferSlug(store, name) {
  return `${store}::${name}`.trim().toLowerCase();
}

function generateCode(store) {
  const prefix = (store || "PST")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3)
    .padEnd(3, "X");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${random}`;
}

function normalizeOffer(item) {
  const now = new Date().toISOString();
  const activeDays = Array.isArray(item.activeDays) ? item.activeDays : [];
  const rewardValue = typeof item.rewardValue === "number"
    ? item.rewardValue
    : Number.parseFloat(item.rewardValue);
  const completedSteps = Array.isArray(item.completedSteps) ? item.completedSteps : [];

  return {
    id: item.id || generateOfferId(),
    store: item.store || "",
    storeId: item.storeId || item.store || "",
    restaurant: item.restaurant || "",
    name: item.name || item.offer || "Special Offer",
    type: item.type || "Percentage Off",
    offerType: item.offerType || item.type || "Percentage Off",
    reward: item.reward || item.name || item.offer || "Reward details coming soon",
    rewardType: item.rewardType || item.type || "Percentage Off",
    rewardValue: Number.isFinite(rewardValue) ? rewardValue : null,
    discountType: item.discountType || item.rewardType || item.type || "percentage",
    discountValue: Number.isFinite(Number(item.discountValue)) ? Number(item.discountValue) : null,
    eligibleItem: item.eligibleItem || null,
    minSpend: Number.isFinite(Number(item.minSpend)) ? Number(item.minSpend) : null,
    termsText: item.termsText || item.terms || "",
    terms: item.terms || "Valid for dine-in and pickup. One redemption per guest.",
    captureEmail: typeof item.captureEmail === "boolean" ? item.captureEmail : true,
    captureName: typeof item.captureName === "boolean" ? item.captureName : false,
    reminderOn: typeof item.reminderOn === "boolean" ? item.reminderOn : true,
    remindersEnabled: typeof item.remindersEnabled === "boolean" ? item.remindersEnabled : (typeof item.reminderOn === "boolean" ? item.reminderOn : true),
    status: item.status || "active",
    creationSource: item.creationSource || "new",
    sourceOfferId: item.sourceOfferId || null,
    templateId: item.templateId || null,
    startAt: item.startAt || null,
    endAt: item.endAt || null,
    startDate: item.startDate || item.startAt || null,
    endDate: item.endDate || item.endAt || null,
    startTime: item.startTime || item.activeWindowStart || "",
    endTime: item.endTime || item.activeWindowEnd || "",
    allDay: typeof item.allDay === "boolean" ? item.allDay : !(item.activeWindowType === "custom"),
    durationDays: Number.isFinite(Number(item.durationDays)) ? Number(item.durationDays) : null,
    scheduleType: item.scheduleType || "custom",
    activeDays,
    activeWindowType: item.activeWindowType || "all-day",
    activeWindowStart: item.activeWindowStart || "",
    activeWindowEnd: item.activeWindowEnd || "",
    timezone: item.timezone || "America/New_York",
    oneTimeOnly: Boolean(item.oneTimeOnly),
    usageLimitType: item.usageLimitType || "standard",
    usageLimitPerCustomer: Number.isFinite(Number(item.usageLimitPerCustomer)) ? Number(item.usageLimitPerCustomer) : null,
    usageLimitPerDay: Number.isFinite(Number(item.usageLimitPerDay)) ? Number(item.usageLimitPerDay) : null,
    campaignGoal: item.campaignGoal || "traffic",
    audiencePrimary: normalizeAudiencePrimary(item.audiencePrimary),
    customRule: item.customRule && typeof item.customRule === "object" ? item.customRule : {},
    selectedChannels: Array.isArray(item.selectedChannels) ? item.selectedChannels : ["Instagram Post", "In-store QR"],
    orchestratorTags: item.orchestratorTags && typeof item.orchestratorTags === "object" ? item.orchestratorTags : {},
    fulfillmentMode: item.fulfillmentMode || "all",
    averageItemPrice: Number.isFinite(Number(item.averageItemPrice)) ? Number(item.averageItemPrice) : null,
    internalNotes: item.internalNotes || "",
    parentOfferId: item.parentOfferId || null,
    clonedFromOfferId: item.clonedFromOfferId || null,
    qrEnabled: typeof item.qrEnabled === "boolean" ? item.qrEnabled : true,
    qrAssetUrl: item.qrAssetUrl || null,
    posterAssetUrl: item.posterAssetUrl || null,
    socialEnabled: Boolean(item.socialEnabled),
    reminderEnabled: typeof item.reminderEnabled === "boolean" ? item.reminderEnabled : (typeof item.remindersEnabled === "boolean" ? item.remindersEnabled : true),
    boostEnabled: Boolean(item.boostEnabled),
    boosted: Boolean(item.boosted),
    boostStartedAt: item.boostStartedAt || null,
    currentStep: Number.isFinite(Number(item.currentStep)) ? Number(item.currentStep) : 0,
    completedSteps,
    lastCompletedStep: item.lastCompletedStep || null,
    draftCompletionPercent: Number.isFinite(Number(item.draftCompletionPercent)) ? Number(item.draftCompletionPercent) : 0,
    isSetupComplete: Boolean(item.isSetupComplete),
    stepTimestamps: item.stepTimestamps || {},
    stepDurations: item.stepDurations || {},
    scanCount: Number.isFinite(Number(item.scanCount)) ? Number(item.scanCount) : 0,
    claimCount: Number.isFinite(Number(item.claimCount)) ? Number(item.claimCount) : 0,
    impressionsCount: Number.isFinite(Number(item.impressionsCount)) ? Number(item.impressionsCount) : 0,
    posterDownloadCount: Number.isFinite(Number(item.posterDownloadCount)) ? Number(item.posterDownloadCount) : 0,
    qrScanCount: Number.isFinite(Number(item.qrScanCount)) ? Number(item.qrScanCount) : 0,
    landingPageViews: Number.isFinite(Number(item.landingPageViews)) ? Number(item.landingPageViews) : 0,
    reminderSentCount: Number.isFinite(Number(item.reminderSentCount)) ? Number(item.reminderSentCount) : 0,
    reminderSuccessCount: Number.isFinite(Number(item.reminderSuccessCount)) ? Number(item.reminderSuccessCount) : 0,
    reminderFailureCount: Number.isFinite(Number(item.reminderFailureCount)) ? Number(item.reminderFailureCount) : 0,
    repeatCustomerCount: Number.isFinite(Number(item.repeatCustomerCount)) ? Number(item.repeatCustomerCount) : 0,
    estimatedRevenue: Number.isFinite(Number(item.estimatedRevenue)) ? Number(item.estimatedRevenue) : null,
    actualRevenue: Number.isFinite(Number(item.actualRevenue)) ? Number(item.actualRevenue) : null,
    conversionRate: Number.isFinite(Number(item.conversionRate)) ? Number(item.conversionRate) : null,
    createdBy: item.createdBy || "owner",
    lastAction: item.lastAction || "created",
    lastActionAt: item.lastActionAt || item.updatedAt || item.createdAt || now,
    archivedAt: item.archivedAt || null,
    pausedAt: item.pausedAt || null,
    launchedAt: item.launchedAt || null,
    relaunchedAt: item.relaunchedAt || null,
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || item.createdAt || now,
  };
}

function normalizeOfferEvent(item) {
  return {
    offerEventId: item.offerEventId || generateOfferEventId(),
    offerId: item.offerId || null,
    eventType: item.eventType || "updated",
    actorType: item.actorType || "system",
    metadata: item.metadata || {},
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

function normalizeRedemption(item, offerLookup) {
  const createdAt = item.createdAt || item.time || new Date().toISOString();
  const email = item.email || "";
  const offerFromLookup =
    (item.offerId && offerLookup.byId.get(item.offerId)) ||
    offerLookup.byStoreAndName.get(createOfferSlug(item.store || "", item.offer || ""));

  return {
    id: item.id || generateRedemptionId(),
    store: item.store || "",
    restaurant: item.restaurant || offerFromLookup?.restaurant || "",
    offerId: item.offerId || offerFromLookup?.id || null,
    offer: item.offer || offerFromLookup?.name || "",
    name: item.name || "",
    email,
    code: item.code || generateCode(item.store || "store"),
    redeemed: Boolean(item.redeemed),
    reminderEligible:
      typeof item.reminderEligible === "boolean"
        ? item.reminderEligible
        : Boolean(email),
    reminderSent: Boolean(item.reminderSent),
    reminderSentAt: item.reminderSentAt || null,
    createdAt,
    redeemedAt: item.redeemedAt || null,
  };
}

const { loadData, saveData } = createDataStore({
  dataPath,
  normalizeOffer,
  normalizeRedemption,
  normalizeOfferEvent,
  createOfferSlug,
  generateOfferId,
});

function recordOfferEvent(data, offerId, eventType, metadata = {}, actorType = "owner") {
  data.offerEvents = data.offerEvents || [];
  data.offerEvents.push(normalizeOfferEvent({
    offerId,
    eventType,
    actorType,
    metadata,
    createdAt: new Date().toISOString(),
  }));
}

const {
  isReminderEligible,
  processReminderById,
  scheduleReminder,
} = createReminderService({
  loadData,
  saveData,
  sendReminderEmail,
  recordOfferEvent,
});

registerSmartActionsRoutes(app, {
  loadData,
  isReminderEligible,
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

registerProfileRoutes(app, {
  loadData,
  saveData,
  getOwnerProfile,
  updateOwnerProfile,
});

registerOfferRoutes(app, {
  loadData,
  saveData,
  getStoreOffers,
  enrichOffer,
  getOffersComparison,
  getOfferRecommendation,
  getOfferById,
  getOfferHistory,
  validateOfferPayload,
  parseRewardValue,
  normalizeOffer,
  normalizeAudiencePrimary,
  generateOfferId,
  recordOfferEvent,
  getOfferMetrics,
});

registerPublicMenuRoutes(app, {
  loadData,
  getOwnerProfile,
  getOfferById,
});

registerLegacyPromoRoutes(app, {
  listPresetCatalog,
  buildPreview,
});

registerQrRoutes(app, {
  QRCode,
  loadData,
  getOfferById,
  getOwnerProfile,
});

registerRedemptionRoutes(app, {
  path,
  loadData,
  saveData,
  getOfferById,
  getStoreOffers,
  getActiveOffer,
  generateCode,
  generateRedemptionId,
  recordOfferEvent,
  scheduleReminder,
  REMINDER_DELAY_MS,
  isReminderEligible,
  processReminderById,
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (String(process.env.DEV_MODE || '').toLowerCase() === 'true') {
    console.log('⚡ DEV_MODE=true — All AI calls are FREE (using placeholders + cache)');
    console.log('  → Set DEV_MODE=false in .env when ready for production');
  }
});

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    server.close(() => {
      process.exit(0);
    });
  });
});
