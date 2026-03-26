const express = require("express");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { sendReminderEmail } = require("./mail/reminders");
const { registerPromotionRoutes } = require("./promotions/routes");
const { listPresetCatalog, buildPreview } = require("./promotions/service");

const app = express();
app.use(express.json({ limit: "15mb" }));
app.use(express.static(path.join(__dirname, "..", "frontend")));
registerPromotionRoutes(app);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

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

function defaultData() {
  return { offers: [], redemptions: [], offerEvents: [], ownerProfiles: {} };
}

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

function dayKeyForDate(date, timezone = "America/New_York") {
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: timezone,
  });
  return formatter.format(date).toLowerCase();
}

function minutesForDate(date, timezone = "America/New_York") {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  });
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

function minutesFromTimeString(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function parseRewardValue(offer) {
  if (typeof offer.rewardValue === "number" && Number.isFinite(offer.rewardValue)) {
    return offer.rewardValue;
  }

  const source = `${offer.reward || ""} ${offer.name || ""}`.trim();
  const percentMatch = source.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch) {
    return Number(percentMatch[1]);
  }

  const moneyMatch = source.match(/\$?\s*(\d+(?:\.\d+)?)/);
  if (moneyMatch) {
    return Number(moneyMatch[1]);
  }

  return null;
}

function isOfferWithinSchedule(offer, now = new Date()) {
  if (offer.startAt && new Date(offer.startAt) > now) {
    return false;
  }

  if (offer.endAt && new Date(offer.endAt) < now) {
    return false;
  }

  if (offer.activeDays?.length) {
    const today = dayKeyForDate(now, offer.timezone);
    if (!offer.activeDays.includes(today)) {
      return false;
    }
  }

  const presetWindows = {
    lunch: ["11:00", "14:00"],
    dinner: ["17:00", "21:00"],
  };

  const [windowStart, windowEnd] =
    offer.activeWindowType === "custom"
      ? [offer.activeWindowStart, offer.activeWindowEnd]
      : presetWindows[offer.activeWindowType] || [null, null];

  if (windowStart && windowEnd) {
    const currentMinutes = minutesForDate(now, offer.timezone);
    const startMinutes = minutesFromTimeString(windowStart);
    const endMinutes = minutesFromTimeString(windowEnd);
    if (startMinutes !== null && endMinutes !== null) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
  }

  return true;
}

function getOfferStatusDisplay(offer, now = new Date()) {
  if (offer.status === "archived") {
    return "archived";
  }

  if (offer.endAt && new Date(offer.endAt) < now) {
    return "expired";
  }

  if (offer.status === "scheduled") {
    return isOfferWithinSchedule(offer, now) ? "live" : "scheduled";
  }

  if (offer.status === "active") {
    if (offer.startAt && new Date(offer.startAt) > now) {
      return "scheduled";
    }
    return isOfferWithinSchedule(offer, now) ? "live" : "scheduled";
  }

  if (offer.status === "paused" && !offer.launchedAt) {
    return "draft";
  }

  return offer.status || "draft";
}

function getStatusTone(statusDisplay) {
  if (statusDisplay === "live") {
    return "success";
  }
  if (statusDisplay === "scheduled") {
    return "info";
  }
  if (statusDisplay === "expired" || statusDisplay === "archived") {
    return "muted";
  }
  return "warning";
}

function getDiscountValueForOffer(offer) {
  const parsedRewardValue = parseRewardValue(offer);
  const averageItemPrice = Number(offer.averageItemPrice) || 0;

  if (!parsedRewardValue || !averageItemPrice) {
    return parsedRewardValue || null;
  }

  const rewardType = (offer.rewardType || offer.offerType || offer.type || "").toLowerCase();
  if (rewardType.includes("percentage")) {
    return Number(((averageItemPrice * parsedRewardValue) / 100).toFixed(2));
  }

  return Number(parsedRewardValue.toFixed(2));
}

function buildStaffSummary(offer) {
  const lines = [];
  lines.push(`Guest shows code`);
  lines.push(`Apply ${offer.reward || offer.name}`);

  if (offer.oneTimeOnly || offer.usageLimitPerCustomer === 1) {
    lines.push("One per guest");
  } else if (offer.usageLimitPerCustomer) {
    lines.push(`Up to ${offer.usageLimitPerCustomer} uses per guest`);
  }

  if (offer.fulfillmentMode === "pickup") {
    lines.push("Valid for pickup only");
  } else if (offer.fulfillmentMode === "dine-in") {
    lines.push("Valid for dine-in only");
  }

  if (offer.activeWindowType === "lunch") {
    lines.push("Valid during lunch hours");
  } else if (offer.activeWindowType === "dinner") {
    lines.push("Valid during dinner hours");
  } else if (offer.activeWindowType === "custom" && offer.activeWindowStart && offer.activeWindowEnd) {
    lines.push(`Valid from ${offer.activeWindowStart} to ${offer.activeWindowEnd}`);
  }

  if (offer.activeDays?.length) {
    lines.push(`Valid on ${offer.activeDays.map((day) => day.slice(0, 1).toUpperCase() + day.slice(1)).join(", ")}`);
  }

  if (offer.usageLimitPerDay) {
    lines.push(`Daily cap: ${offer.usageLimitPerDay}`);
  }

  return lines;
}

function buildScheduleSummary(offer) {
  const parts = [];
  if (offer.startAt) {
    parts.push(`Starts ${new Date(offer.startAt).toLocaleDateString()}`);
  }
  if (offer.endAt) {
    parts.push(`Ends ${new Date(offer.endAt).toLocaleDateString()}`);
  }
  if (offer.activeWindowType === "lunch") {
    parts.push("Lunch hours");
  } else if (offer.activeWindowType === "dinner") {
    parts.push("Dinner hours");
  } else if (offer.activeWindowType === "custom" && offer.activeWindowStart && offer.activeWindowEnd) {
    parts.push(`${offer.activeWindowStart} - ${offer.activeWindowEnd}`);
  } else {
    parts.push("All day");
  }

  if (offer.activeDays?.length) {
    parts.push(offer.activeDays.map((day) => day.slice(0, 3)).join(", "));
  }

  return parts.join(" • ");
}

function getPlacementSuggestions(offer) {
  const rewardType = (offer.rewardType || offer.offerType || offer.type || "").toLowerCase();
  if (rewardType.includes("pickup")) {
    return {
      bestPlacement: "Pickup shelf",
      alsoTry: "Takeout bag insert",
      goodFor: "Packaging stickers",
    };
  }

  if (rewardType.includes("slow hour") || offer.activeWindowType === "lunch") {
    return {
      bestPlacement: "Counter",
      alsoTry: "Table tents",
      goodFor: "Lunch menu inserts",
    };
  }

  return {
    bestPlacement: "Counter",
    alsoTry: "Pickup shelf",
    goodFor: "Table tents",
  };
}

function validateOfferPayload(payload) {
  if (!payload.store || !payload.name) {
    return "store and name are required";
  }

  if (payload.startAt && payload.endAt && new Date(payload.startAt) > new Date(payload.endAt)) {
    return "start date must be before end date";
  }

  if (payload.activeWindowType === "custom" && payload.activeWindowStart && payload.activeWindowEnd) {
    if (minutesFromTimeString(payload.activeWindowStart) >= minutesFromTimeString(payload.activeWindowEnd)) {
      return "custom active window must end after it starts";
    }
  }

  return null;
}

function inferOffersFromRedemptions(redemptions) {
  const seen = new Map();

  redemptions.forEach((item) => {
    if (!item.store || !item.offer) {
      return;
    }

    const key = createOfferSlug(item.store, item.offer);
    const existing = seen.get(key);
    if (existing) {
      if (new Date(item.createdAt || 0) > new Date(existing.updatedAt || 0)) {
        existing.restaurant = item.restaurant || existing.restaurant;
        existing.createdAt = existing.createdAt || item.createdAt;
        existing.updatedAt = item.createdAt || existing.updatedAt;
      }
      return;
    }

    seen.set(key, normalizeOffer({
      id: generateOfferId(),
      store: item.store,
      restaurant: item.restaurant || "",
      name: item.offer,
      reward: item.offer,
      captureEmail: true,
      captureName: false,
      reminderOn: true,
      status: "paused",
      createdAt: item.createdAt,
      updatedAt: item.createdAt,
    }));
  });

  const inferredOffers = [...seen.values()];
  const latestActiveByStore = new Map();

  inferredOffers.forEach((offer) => {
    const current = latestActiveByStore.get(offer.store);
    if (!current || new Date(offer.updatedAt) > new Date(current.updatedAt)) {
      latestActiveByStore.set(offer.store, offer);
    }
  });

  inferredOffers.forEach((offer) => {
    if (latestActiveByStore.get(offer.store)?.id === offer.id) {
      offer.status = "active";
    }
  });

  return inferredOffers;
}

function createOfferLookup(offers) {
  const byId = new Map();
  const byStoreAndName = new Map();

  offers.forEach((offer) => {
    byId.set(offer.id, offer);
    byStoreAndName.set(createOfferSlug(offer.store, offer.name), offer);
  });

  return { byId, byStoreAndName };
}

function loadData() {
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify(defaultData(), null, 2));
  }

  const raw = fs.readFileSync(dataPath, "utf8").trim();
  if (!raw) {
    return defaultData();
  }

  try {
    const parsed = JSON.parse(raw);
    const rawRedemptions = Array.isArray(parsed.redemptions) ? parsed.redemptions : [];
    const normalizedOffers = Array.isArray(parsed.offers)
      ? parsed.offers.map(normalizeOffer)
      : inferOffersFromRedemptions(rawRedemptions);
    const offerLookup = createOfferLookup(normalizedOffers);

    return {
      offers: normalizedOffers,
      redemptions: rawRedemptions.map((item) => normalizeRedemption(item, offerLookup)),
      offerEvents: Array.isArray(parsed.offerEvents) ? parsed.offerEvents.map(normalizeOfferEvent) : [],
      ownerProfiles: parsed.ownerProfiles && typeof parsed.ownerProfiles === "object" ? parsed.ownerProfiles : {},
    };
  } catch (error) {
    return defaultData();
  }
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify({
    offers: data.offers || [],
    redemptions: data.redemptions || [],
    offerEvents: data.offerEvents || [],
    ownerProfiles: data.ownerProfiles && typeof data.ownerProfiles === "object" ? data.ownerProfiles : {},
  }, null, 2));
}

function initialsForName(name = '') {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'PP';
}

function getOwnerProfile(data, requestedStore = '') {
  const profiles = data.ownerProfiles && typeof data.ownerProfiles === "object" ? data.ownerProfiles : {};
  if (requestedStore && profiles[requestedStore]) {
    const saved = profiles[requestedStore];
    const restaurantName = String(saved.restaurantName || "Your Restaurant");
    return {
      storeId: requestedStore,
      restaurantName,
      restaurantLocation: saved.restaurantLocation || "Primary location",
      logoAsset: saved.logoAsset || "",
      businessType: saved.businessType || "casual_restaurant",
      cuisineType: saved.cuisineType || "",
      category: saved.category || "",
      businessHours: saved.businessHours || "",
      brandTone: saved.brandTone || "",
      businessInitials: initialsForName(restaurantName),
      updatedAt: saved.updatedAt || null,
    };
  }

  const candidates = (Array.isArray(data.offers) ? data.offers : [])
    .filter((offer) => String(offer.restaurant || '').trim());
  const scoped = requestedStore
    ? candidates.filter((offer) => offer.store === requestedStore || offer.storeId === requestedStore)
    : candidates;
  const pool = scoped.length ? scoped : candidates;
  const sorted = [...pool].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  const latest = sorted[0] || null;

  if (!latest) {
    return {
      storeId: requestedStore || 'store123',
      restaurantName: 'Your Restaurant',
      restaurantLocation: 'Primary location',
      logoAsset: '',
      businessType: 'casual_restaurant',
      cuisineType: '',
      category: '',
      businessHours: '',
      brandTone: '',
      businessInitials: 'YR',
    };
  }

  return {
    storeId: latest.storeId || latest.store || requestedStore || 'store123',
    restaurantName: latest.restaurant || 'Your Restaurant',
    restaurantLocation: latest.restaurantLocation || 'Primary location',
    logoAsset: latest.logoAsset || '',
    businessType: latest.businessType || 'casual_restaurant',
    cuisineType: latest.cuisineType || '',
    category: latest.category || '',
    businessHours: latest.businessHours || '',
    brandTone: latest.brandTone || '',
    businessInitials: initialsForName(latest.restaurant || 'Your Restaurant'),
  };
}

function updateOwnerProfile(data, store, payload = {}) {
  const storeId = String(store || '').trim();
  if (!storeId) {
    const error = new Error("store is required");
    error.statusCode = 400;
    throw error;
  }
  if (!data.ownerProfiles || typeof data.ownerProfiles !== "object") {
    data.ownerProfiles = {};
  }
  const current = getOwnerProfile(data, storeId);
  const restaurantName = String(payload.restaurantName || current.restaurantName || '').trim() || "Your Restaurant";
  const next = {
    storeId,
    restaurantName,
    restaurantLocation: String(payload.restaurantLocation || current.restaurantLocation || '').trim() || "Primary location",
    logoAsset: String(payload.logoAsset || current.logoAsset || '').trim(),
    businessType: String(payload.businessType || current.businessType || '').trim() || "casual_restaurant",
    cuisineType: String(payload.cuisineType || current.cuisineType || '').trim(),
    category: String(payload.category || current.category || '').trim(),
    businessHours: String(payload.businessHours || current.businessHours || '').trim(),
    brandTone: String(payload.brandTone || current.brandTone || '').trim(),
    updatedAt: new Date().toISOString(),
  };
  data.ownerProfiles[storeId] = next;
  return {
    ...next,
    businessInitials: initialsForName(next.restaurantName),
  };
}

function getStoreOffers(data, store, options = {}) {
  const { includeArchived = false } = options;
  return data.offers
    .filter((offer) => offer.store === store && (includeArchived || offer.status !== "archived"))
    .sort((a, b) => {
      const statusPriority = {
        live: 0,
        scheduled: 1,
        paused: 2,
        draft: 3,
        expired: 4,
        archived: 5,
      };
      const aDisplay = getOfferStatusDisplay(a);
      const bDisplay = getOfferStatusDisplay(b);
      if ((statusPriority[aDisplay] ?? 99) < (statusPriority[bDisplay] ?? 99)) {
        return -1;
      }
      if ((statusPriority[aDisplay] ?? 99) > (statusPriority[bDisplay] ?? 99)) {
        return 1;
      }
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
}

function getActiveOffer(data, store) {
  return getStoreOffers(data, store).find((offer) => getOfferStatusDisplay(offer) === "live") || null;
}

function getOfferById(data, offerId) {
  return data.offers.find((offer) => offer.id === offerId) || null;
}

function enrichOffer(data, offer) {
  const offerRedemptions = data.redemptions.filter((item) => item.offerId === offer.id || (!item.offerId && item.store === offer.store && item.offer === offer.name));
  const claimCount = offerRedemptions.length;
  const redemptionCount = offerRedemptions.filter((item) => item.redeemed).length;
  const pendingRedemptionCount = claimCount - redemptionCount;
  const emailCaptureCount = offerRedemptions.filter((item) => item.email).length;
  const emailCaptureRate = claimCount ? Math.round((emailCaptureCount / claimCount) * 100) : 0;
  const redeemedRate = claimCount ? Math.round((redemptionCount / claimCount) * 100) : 0;
  const effectiveCount = redemptionCount || claimCount;
  const averageItemPrice = Number(offer.averageItemPrice) || null;
  const discountValue = getDiscountValueForOffer(offer);
  const estimatedGrossRevenue = averageItemPrice ? Number((averageItemPrice * effectiveCount).toFixed(2)) : null;
  const estimatedDiscountCost = averageItemPrice && discountValue ? Number((discountValue * effectiveCount).toFixed(2)) : null;
  const estimatedNetImpact =
    estimatedGrossRevenue !== null && estimatedDiscountCost !== null
      ? Number((estimatedGrossRevenue - estimatedDiscountCost).toFixed(2))
      : null;
  const qrScanCount = Number(offer.qrScanCount || offer.scanCount || 0);
  const conversionRate = qrScanCount ? Math.round((redemptionCount / qrScanCount) * 100) : 0;

  return {
    ...offer,
    statusDisplay: getOfferStatusDisplay(offer),
    statusTone: getStatusTone(getOfferStatusDisplay(offer)),
    claimCount,
    redemptionCount,
    pendingRedemptionCount,
    emailCaptureCount,
    emailCaptureRate,
    redeemedRate,
    qrScanCount,
    conversionRate,
    estimatedGrossRevenue,
    estimatedDiscountCost,
    estimatedNetImpact,
    scheduleSummary: buildScheduleSummary(offer),
    staffSummary: buildStaffSummary(offer),
    placementSuggestions: getPlacementSuggestions(offer),
  };
}

function getOfferMetrics(data, store) {
  const redemptions = data.redemptions.filter((item) => item.store === store);
  const offers = getStoreOffers(data, store).map((offer) => enrichOffer(data, offer));
  const bestOfferEntry = [...redemptions.reduce((map, item) => {
    const key = item.offerId || createOfferSlug(item.store, item.offer);
    const existing = map.get(key) || {
      offerId: item.offerId || null,
      offerName: item.offer || "Special Offer",
      count: 0,
    };
    existing.count += 1;
    map.set(key, existing);
    return map;
  }, new Map()).values()].sort((a, b) => b.count - a.count)[0] || null;

  return {
    activeOffers: offers.filter((offer) => offer.statusDisplay === "live").length,
    totalRedemptions: redemptions.length,
    emailsCaptured: redemptions.filter((item) => item.email !== "").length,
    redeemedCount: redemptions.filter((item) => item.redeemed).length,
    pendingCount: redemptions.filter((item) => !item.redeemed).length,
    remindersSent: redemptions.filter((item) => item.reminderSent).length,
    bestPerformingOffer: bestOfferEntry
      ? {
          offerId: bestOfferEntry.offerId,
          name: bestOfferEntry.offerName,
          redemptionCount: bestOfferEntry.count,
        }
      : null,
    offers: offers.map((offer) => ({
      id: offer.id,
      name: offer.name,
      status: offer.status,
      statusDisplay: offer.statusDisplay,
      redemptionCount: offer.redemptionCount,
      emailCaptureRate: offer.emailCaptureRate,
      redeemedRate: offer.redeemedRate,
      estimatedNetImpact: offer.estimatedNetImpact,
    })),
  };
}

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

function getOfferHistory(data, offerId) {
  return (data.offerEvents || [])
    .filter((event) => event.offerId === offerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getOffersComparison(data, store) {
  return getStoreOffers(data, store, { includeArchived: true }).map((offer) => enrichOffer(data, offer));
}

function getOfferRecommendation(data, store, offerId = null) {
  const offers = getStoreOffers(data, store, { includeArchived: true }).map((offer) => enrichOffer(data, offer));
  const selectedOffer = offers.find((offer) => offer.id === offerId) || offers.find((offer) => offer.statusDisplay === "live") || offers[0] || null;

  if (!selectedOffer) {
    return {
      title: "Create your first offer",
      explanation: "Start with one simple promotion and a QR at the counter so you can learn what guests respond to first.",
      cta: "Go Live",
      action: "go-live",
      actionable_message: "Build a first offer to unlock comparison, ROI, and retention signals.",
    };
  }

  if ((selectedOffer.scanCount || 0) < 5 && selectedOffer.claimCount < 2) {
    return {
      title: "Low scans detected. Move the QR closer to the order moment.",
      explanation: "Try counter placement first, then add a second QR near pickup or on table tents.",
      cta: "Generate QR",
      action: "generate-qr",
      actionable_message: "Visibility is the easiest lever when an offer is not getting enough scans yet.",
    };
  }

  if (selectedOffer.claimCount >= 3 && selectedOffer.redeemedRate < 50) {
    return {
      title: "Many guests are claiming but not redeeming",
      explanation: "Tighten staff instructions and send reminder follow-ups so more claims turn into completed visits.",
      cta: "Send Reminders",
      action: "send-reminders",
      actionable_message: "This offer is creating interest, but the last step needs to feel easier.",
    };
  }

  if (selectedOffer.emailCaptureRate >= 40) {
    return {
      title: "This offer captures emails well",
      explanation: "Create a weekday variation so you can turn strong capture into repeat visits instead of one-time traffic.",
      cta: "Create Variation",
      action: "create-variation",
      actionable_message: "High capture offers are your best candidates for retention-focused variations.",
    };
  }

  if ((selectedOffer.statusDisplay === "paused" || selectedOffer.statusDisplay === "expired") && selectedOffer.claimCount >= 3) {
    return {
      title: "This offer performed well before",
      explanation: "Relaunch it this week with a fresh schedule so you can reuse what already converted.",
      cta: "Relaunch This Week",
      action: "relaunch-this-week",
      actionable_message: "Strong paused offers are usually faster to relaunch than building from scratch.",
    };
  }

  if (selectedOffer.statusDisplay === "live" && selectedOffer.redeemedRate >= 60) {
    return {
      title: "This live offer is working",
      explanation: "Create a variation for lunch, pickup, or dinner so you can extend the same momentum into another slot.",
      cta: "Create Variation",
      action: "create-variation",
      actionable_message: "Use a variation when the base offer is already converting cleanly.",
    };
  }

  return {
    title: "Keep this offer simple and visible",
    explanation: "A clear reward, one staff instruction, and strong QR placement usually outperform more complicated promo rules.",
    cta: "Update Live Offer",
    action: "go-live",
    actionable_message: "Simple offers are easier for both guests and staff to act on.",
  };
}

function isReminderEligible(item) {
  return Boolean(
    item &&
    item.email &&
    item.email.trim() !== "" &&
    !item.redeemed &&
    item.reminderEligible &&
    !item.reminderSent
  );
}

async function processReminderById(redemptionId) {
  const data = loadData();
  const redemption = data.redemptions.find((item) => item.id === redemptionId);

  if (!isReminderEligible(redemption)) {
    return { sent: false, mode: "preview", preview: null };
  }

  const result = await sendReminderEmail(redemption);
  redemption.reminderSent = true;
  redemption.reminderSentAt = new Date().toISOString();
  if (redemption.offerId) {
    recordOfferEvent(data, redemption.offerId, "reminder_sent", {
      redemptionId: redemption.id,
      mode: result.mode,
    }, "system");
  }
  saveData(data);

  return {
    sent: true,
    mode: result.mode,
    preview: result.preview,
  };
}

// MVP note:
// This uses in-process timers via setTimeout. If the server restarts,
// scheduled reminders are lost. A production version should use a
// persistent job queue or cron-based scheduler.
function scheduleReminder(redemptionId, delayMs) {
  setTimeout(async () => {
    try {
      await processReminderById(redemptionId);
    } catch (error) {
      // Ignore failures here so the app remains lightweight for MVP usage.
    }
  }, delayMs);
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.get("/redeem", (req, res) => {
  const { offerId } = req.query;
  if (offerId) {
    const data = loadData();
    const offer = getOfferById(data, offerId);
    if (offer) {
      offer.scanCount = (offer.scanCount || 0) + 1;
      offer.updatedAt = new Date().toISOString();
      saveData(data);
    }
  }
  res.sendFile(path.join(__dirname, "..", "frontend", "redeem.html"));
});

app.get("/owner/profile", (req, res) => {
  const data = loadData();
  const store = String(req.query.store || '').trim();
  const profile = getOwnerProfile(data, store);
  res.json({ success: true, profile });
});

app.put("/owner/profile", (req, res) => {
  try {
    const store = String(req.query.store || req.body?.storeId || '').trim();
    const data = loadData();
    const profile = updateOwnerProfile(data, store, req.body || {});
    saveData(data);
    return res.json({ success: true, profile });
  } catch (error) {
    const code = Number(error.statusCode) || 400;
    return res.status(code).json({ error: error.message || "failed to update owner profile" });
  }
});

app.get("/offers/:store", (req, res) => {
  const data = loadData();
  const includeArchived = req.query.includeArchived === "1";
  res.json(getStoreOffers(data, req.params.store, { includeArchived }).map((offer) => enrichOffer(data, offer)));
});

app.get("/offers/:store/compare", (req, res) => {
  const data = loadData();
  res.json(getOffersComparison(data, req.params.store));
});

app.get("/offers/:store/recommendation", (req, res) => {
  const data = loadData();
  res.json(getOfferRecommendation(data, req.params.store, req.query.offerId || null));
});

app.get("/offers/:id/history", (req, res) => {
  const data = loadData();
  const offer = getOfferById(data, req.params.id);
  if (!offer) {
    return res.status(404).json({ error: "offer not found" });
  }
  res.json(getOfferHistory(data, req.params.id));
});

app.post("/offers", (req, res) => {
  const {
    id,
    store,
    restaurant = "",
    name,
    type = "Percentage Off",
    reward = "",
    terms = "",
    captureEmail = true,
    captureName = false,
    reminderOn = true,
    remindersEnabled = true,
    status = "active",
    startAt = null,
    endAt = null,
    activeDays = [],
    activeWindowType = "all-day",
    activeWindowStart = "",
    activeWindowEnd = "",
    timezone = "America/New_York",
    oneTimeOnly = false,
    usageLimitType = "standard",
    usageLimitPerCustomer = null,
    usageLimitPerDay = null,
    fulfillmentMode = "all",
    averageItemPrice = null,
    internalNotes = "",
    parentOfferId = null,
    clonedFromOfferId = null,
    creationSource = "new",
    sourceOfferId = null,
    templateId = null,
    discountType = "percentage",
    discountValue = null,
    eligibleItem = null,
    minSpend = null,
    termsText = "",
    startDate = null,
    endDate = null,
    startTime = "",
    endTime = "",
    allDay = true,
    durationDays = null,
    scheduleType = "custom",
    qrEnabled = true,
    qrAssetUrl = null,
    posterAssetUrl = null,
    socialEnabled = false,
    reminderEnabled = true,
    boostEnabled = false,
    boosted = false,
    boostStartedAt = null,
    currentStep = 0,
    completedSteps = [],
    lastCompletedStep = null,
    draftCompletionPercent = 0,
    isSetupComplete = false,
    stepTimestamps = {},
    stepDurations = {},
    impressionsCount = 0,
    posterDownloadCount = 0,
    qrScanCount = 0,
    landingPageViews = 0,
    reminderSentCount = 0,
    reminderSuccessCount = 0,
    reminderFailureCount = 0,
    repeatCustomerCount = 0,
    estimatedRevenue = null,
    actualRevenue = null,
    conversionRate = null,
    createdBy = "owner",
    lastAction = null,
    lastActionAt = null,
    flowEvent = null,
  } = req.body;

  const validationError = validateOfferPayload({
    store,
    name,
    startAt,
    endAt,
    activeWindowType,
    activeWindowStart,
    activeWindowEnd,
  });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const data = loadData();
  const now = new Date().toISOString();
  let offer = id ? getOfferById(data, id) : null;
  const computedStatus = startAt && new Date(startAt) > new Date() ? "scheduled" : status;

  if (offer) {
    offer.store = store;
    offer.storeId = store;
    offer.restaurant = restaurant;
    offer.name = name;
    offer.type = type;
    offer.offerType = type;
    offer.reward = reward || name;
    offer.rewardType = type;
    offer.rewardValue = parseRewardValue({ reward, name, rewardValue: req.body.rewardValue, type });
    offer.discountType = discountType;
    offer.discountValue = discountValue ? Number(discountValue) : null;
    offer.eligibleItem = eligibleItem || null;
    offer.minSpend = minSpend ? Number(minSpend) : null;
    offer.termsText = termsText || terms || "";
    offer.terms = terms || "Valid for dine-in and pickup. One redemption per guest.";
    offer.captureEmail = Boolean(captureEmail);
    offer.captureName = Boolean(captureName);
    offer.reminderOn = Boolean(reminderOn);
    offer.remindersEnabled = Boolean(remindersEnabled ?? reminderOn);
    offer.reminderEnabled = Boolean(reminderEnabled ?? remindersEnabled ?? reminderOn);
    offer.status = computedStatus;
    offer.creationSource = creationSource || offer.creationSource || "new";
    offer.sourceOfferId = sourceOfferId || offer.sourceOfferId || null;
    offer.templateId = templateId || offer.templateId || null;
    offer.startAt = startAt;
    offer.endAt = endAt;
    offer.startDate = startDate || startAt;
    offer.endDate = endDate || endAt;
    offer.startTime = startTime || activeWindowStart;
    offer.endTime = endTime || activeWindowEnd;
    offer.allDay = Boolean(allDay);
    offer.durationDays = durationDays ? Number(durationDays) : offer.durationDays;
    offer.scheduleType = scheduleType;
    offer.activeDays = Array.isArray(activeDays) ? activeDays : [];
    offer.activeWindowType = activeWindowType;
    offer.activeWindowStart = activeWindowStart;
    offer.activeWindowEnd = activeWindowEnd;
    offer.timezone = timezone;
    offer.oneTimeOnly = Boolean(oneTimeOnly);
    offer.usageLimitType = usageLimitType;
    offer.usageLimitPerCustomer = usageLimitPerCustomer ? Number(usageLimitPerCustomer) : null;
    offer.usageLimitPerDay = usageLimitPerDay ? Number(usageLimitPerDay) : null;
    offer.fulfillmentMode = fulfillmentMode;
    offer.averageItemPrice = averageItemPrice ? Number(averageItemPrice) : null;
    offer.internalNotes = internalNotes;
    offer.parentOfferId = parentOfferId || offer.parentOfferId || null;
    offer.clonedFromOfferId = clonedFromOfferId || offer.clonedFromOfferId || null;
    offer.qrEnabled = Boolean(qrEnabled);
    offer.qrAssetUrl = qrAssetUrl || offer.qrAssetUrl || null;
    offer.posterAssetUrl = posterAssetUrl || offer.posterAssetUrl || null;
    offer.socialEnabled = Boolean(socialEnabled);
    offer.boostEnabled = Boolean(boostEnabled);
    offer.boosted = Boolean(boosted);
    offer.boostStartedAt = boostStartedAt || offer.boostStartedAt || null;
    offer.currentStep = Number(currentStep) || offer.currentStep || 0;
    offer.completedSteps = Array.isArray(completedSteps) ? completedSteps : offer.completedSteps || [];
    offer.lastCompletedStep = lastCompletedStep || offer.lastCompletedStep || null;
    offer.draftCompletionPercent = Number(draftCompletionPercent) || 0;
    offer.isSetupComplete = Boolean(isSetupComplete);
    offer.stepTimestamps = stepTimestamps || offer.stepTimestamps || {};
    offer.stepDurations = stepDurations || offer.stepDurations || {};
    offer.impressionsCount = Number(impressionsCount) || offer.impressionsCount || 0;
    offer.posterDownloadCount = Number(posterDownloadCount) || offer.posterDownloadCount || 0;
    offer.qrScanCount = Number(qrScanCount) || offer.qrScanCount || 0;
    offer.landingPageViews = Number(landingPageViews) || offer.landingPageViews || 0;
    offer.reminderSentCount = Number(reminderSentCount) || offer.reminderSentCount || 0;
    offer.reminderSuccessCount = Number(reminderSuccessCount) || offer.reminderSuccessCount || 0;
    offer.reminderFailureCount = Number(reminderFailureCount) || offer.reminderFailureCount || 0;
    offer.repeatCustomerCount = Number(repeatCustomerCount) || offer.repeatCustomerCount || 0;
    offer.estimatedRevenue = estimatedRevenue !== null ? Number(estimatedRevenue) : offer.estimatedRevenue;
    offer.actualRevenue = actualRevenue !== null ? Number(actualRevenue) : offer.actualRevenue;
    offer.conversionRate = conversionRate !== null ? Number(conversionRate) : offer.conversionRate;
    offer.createdBy = createdBy || offer.createdBy || "owner";
    offer.lastAction = lastAction || (computedStatus === "active" ? "offer_launched" : "offer_updated");
    offer.lastActionAt = lastActionAt || now;
    offer.updatedAt = now;
    if (computedStatus === "active" && !offer.launchedAt) {
      offer.launchedAt = now;
    }
    recordOfferEvent(data, offer.id, "edited", {
      name: offer.name,
      status: computedStatus,
      currentStep: offer.currentStep,
    });
  } else {
    offer = normalizeOffer({
      id: generateOfferId(),
      store,
      storeId: store,
      restaurant,
      name,
      type,
      reward: reward || name,
      rewardType: type,
      rewardValue: parseRewardValue({ reward, name, rewardValue: req.body.rewardValue, type }),
      discountType,
      discountValue,
      eligibleItem,
      minSpend,
      termsText,
      terms,
      captureEmail: Boolean(captureEmail),
      captureName: Boolean(captureName),
      reminderOn: Boolean(reminderOn),
      remindersEnabled: Boolean(remindersEnabled ?? reminderOn),
      reminderEnabled: Boolean(reminderEnabled ?? remindersEnabled ?? reminderOn),
      status: computedStatus,
      creationSource,
      sourceOfferId,
      templateId,
      startAt,
      endAt,
      startDate: startDate || startAt,
      endDate: endDate || endAt,
      startTime: startTime || activeWindowStart,
      endTime: endTime || activeWindowEnd,
      allDay: Boolean(allDay),
      durationDays,
      scheduleType,
      activeDays,
      activeWindowType,
      activeWindowStart,
      activeWindowEnd,
      timezone,
      oneTimeOnly,
      usageLimitType,
      usageLimitPerCustomer,
      usageLimitPerDay,
      fulfillmentMode,
      averageItemPrice,
      internalNotes,
      parentOfferId,
      clonedFromOfferId,
      qrEnabled: Boolean(qrEnabled),
      qrAssetUrl,
      posterAssetUrl,
      socialEnabled: Boolean(socialEnabled),
      boostEnabled: Boolean(boostEnabled),
      boosted: Boolean(boosted),
      boostStartedAt,
      currentStep: Number(currentStep) || 0,
      completedSteps,
      lastCompletedStep,
      draftCompletionPercent: Number(draftCompletionPercent) || 0,
      isSetupComplete: Boolean(isSetupComplete),
      stepTimestamps,
      stepDurations,
      impressionsCount,
      posterDownloadCount,
      qrScanCount,
      landingPageViews,
      reminderSentCount,
      reminderSuccessCount,
      reminderFailureCount,
      repeatCustomerCount,
      estimatedRevenue,
      actualRevenue,
      conversionRate,
      createdBy,
      lastAction: lastAction || (computedStatus === "active" ? "offer_launched" : "offer_created"),
      lastActionAt: lastActionAt || now,
      launchedAt: computedStatus === "active" ? now : null,
      createdAt: now,
      updatedAt: now,
    });
    data.offers.push(offer);
    recordOfferEvent(data, offer.id, "created", {
      name: offer.name,
      status: computedStatus,
      creationSource: offer.creationSource,
    });
  }

  if (flowEvent?.eventType) {
    recordOfferEvent(data, offer.id, flowEvent.eventType, flowEvent.metadata || {}, flowEvent.actorType || "owner");
  }

  if (offer.status === "active") {
    data.offers.forEach((item) => {
      if (item.store === offer.store && item.id !== offer.id && item.status === "active") {
        item.status = "paused";
        item.pausedAt = now;
        item.updatedAt = now;
        recordOfferEvent(data, item.id, "paused", {
          reason: "replaced_by_live_offer",
          replacementOfferId: offer.id,
        });
      }
    });
    recordOfferEvent(data, offer.id, offer.launchedAt === now ? "went_live" : "updated_live_offer", {});
  } else if (offer.status === "scheduled") {
    recordOfferEvent(data, offer.id, "scheduled", {
      startAt: offer.startAt,
      endAt: offer.endAt,
    });
  }

  saveData(data);
  res.json({ success: true, offer: enrichOffer(data, offer) });
});

app.post("/offers/:id/duplicate", (req, res) => {
  const data = loadData();
  const original = getOfferById(data, req.params.id);

  if (!original) {
    return res.status(404).json({ error: "offer not found" });
  }

  const now = new Date().toISOString();
  const duplicated = normalizeOffer({
    ...original,
    id: generateOfferId(),
    name: `${original.name} Copy`,
    status: "paused",
    launchedAt: null,
    pausedAt: now,
    parentOfferId: original.parentOfferId || original.id,
    clonedFromOfferId: original.id,
    scanCount: 0,
    claimCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  data.offers.push(duplicated);
  recordOfferEvent(data, duplicated.id, "created_variation", {
    sourceOfferId: original.id,
  });
  saveData(data);
  res.json({ success: true, offer: enrichOffer(data, duplicated) });
});

app.post("/offers/:id/pause", (req, res) => {
  const data = loadData();
  const offer = getOfferById(data, req.params.id);

  if (!offer) {
    return res.status(404).json({ error: "offer not found" });
  }

  offer.status = "paused";
  offer.pausedAt = new Date().toISOString();
  offer.updatedAt = offer.pausedAt;
  recordOfferEvent(data, offer.id, "paused", {
    reason: "owner_action",
  });
  saveData(data);
  res.json({ success: true, offer: enrichOffer(data, offer) });
});

app.post("/offers/:id/relaunch", (req, res) => {
  const data = loadData();
  const offer = getOfferById(data, req.params.id);

  if (!offer) {
    return res.status(404).json({ error: "offer not found" });
  }

  const now = new Date().toISOString();
  data.offers.forEach((item) => {
    if (item.store === offer.store && item.status === "active") {
      item.status = "paused";
      item.pausedAt = now;
      item.updatedAt = now;
      recordOfferEvent(data, item.id, "paused", {
        reason: "relaunch_replacement",
        replacementOfferId: offer.id,
      });
    }
  });

  offer.status = "active";
  offer.launchedAt = offer.launchedAt || now;
  offer.relaunchedAt = now;
  offer.updatedAt = now;
  recordOfferEvent(data, offer.id, "relaunched", {});
  saveData(data);
  res.json({ success: true, offer: enrichOffer(data, offer) });
});

app.post("/offers/:id/relaunch-this-week", (req, res) => {
  const data = loadData();
  const original = getOfferById(data, req.params.id);

  if (!original) {
    return res.status(404).json({ error: "offer not found" });
  }

  const now = new Date();
  const nextSevenDays = new Date(now);
  nextSevenDays.setDate(nextSevenDays.getDate() + 7);
  const createdAt = now.toISOString();

  const cloned = normalizeOffer({
    ...original,
    id: generateOfferId(),
    name: `${original.name} This Week`,
    status: "paused",
    startAt: createdAt,
    endAt: nextSevenDays.toISOString(),
    parentOfferId: original.parentOfferId || original.id,
    clonedFromOfferId: original.id,
    relaunchedAt: createdAt,
    launchedAt: null,
    pausedAt: createdAt,
    scanCount: 0,
    claimCount: 0,
    createdAt,
    updatedAt: createdAt,
  });

  data.offers.push(cloned);
  recordOfferEvent(data, cloned.id, "relaunch_draft_created", {
    sourceOfferId: original.id,
  });
  saveData(data);
  res.json({ success: true, offer: enrichOffer(data, cloned) });
});

app.post("/offers/:id/archive", (req, res) => {
  const data = loadData();
  const offer = getOfferById(data, req.params.id);

  if (!offer) {
    return res.status(404).json({ error: "offer not found" });
  }

  if (offer.status === "active") {
    return res.status(400).json({ error: "pause the live offer before archiving it" });
  }

  offer.status = "archived";
  offer.archivedAt = new Date().toISOString();
  offer.updatedAt = offer.archivedAt;
  recordOfferEvent(data, offer.id, "archived", {});
  saveData(data);
  res.json({ success: true, offer: enrichOffer(data, offer) });
});

app.delete("/offers/:id", (req, res) => {
  const data = loadData();
  const offer = getOfferById(data, req.params.id);

  if (!offer) {
    return res.status(404).json({ error: "offer not found" });
  }

  if (offer.status !== "paused") {
    return res.status(400).json({ error: "only paused offers can be deleted" });
  }

  recordOfferEvent(data, offer.id, "deleted", {});
  data.offers = data.offers.filter((item) => item.id !== offer.id);
  saveData(data);
  res.json({ success: true });
});

app.post("/offers/:id/events", (req, res) => {
  const data = loadData();
  const offer = getOfferById(data, req.params.id);

  if (!offer) {
    return res.status(404).json({ error: "offer not found" });
  }

  const {
    eventType,
    actorType = "owner",
    metadata = {},
    posterDownloadIncrement = 0,
    qrScanIncrement = 0,
    landingViewIncrement = 0,
    reminderSentIncrement = 0,
    reminderSuccessIncrement = 0,
    reminderFailureIncrement = 0,
    impressionsIncrement = 0,
  } = req.body || {};

  if (!eventType) {
    return res.status(400).json({ error: "eventType is required" });
  }

  offer.posterDownloadCount = (offer.posterDownloadCount || 0) + Number(posterDownloadIncrement || 0);
  offer.qrScanCount = (offer.qrScanCount || 0) + Number(qrScanIncrement || 0);
  offer.landingPageViews = (offer.landingPageViews || 0) + Number(landingViewIncrement || 0);
  offer.reminderSentCount = (offer.reminderSentCount || 0) + Number(reminderSentIncrement || 0);
  offer.reminderSuccessCount = (offer.reminderSuccessCount || 0) + Number(reminderSuccessIncrement || 0);
  offer.reminderFailureCount = (offer.reminderFailureCount || 0) + Number(reminderFailureIncrement || 0);
  offer.impressionsCount = (offer.impressionsCount || 0) + Number(impressionsIncrement || 0);
  offer.lastAction = eventType;
  offer.lastActionAt = new Date().toISOString();
  offer.updatedAt = offer.lastActionAt;

  recordOfferEvent(data, offer.id, eventType, metadata, actorType);
  saveData(data);
  res.json({ success: true, offer: enrichOffer(data, offer) });
});

app.get("/promo/templates", (req, res) => {
  try {
    const presets = listPresetCatalog();
    res.json({ success: true, presets });
  } catch (error) {
    res.status(500).json({ error: "failed to load templates" });
  }
});

app.post("/promo/suggestions", (req, res) => {
  try {
    const body = req.body || {};
    const selectedPresetId = body.selectedPresetId || null;
    const designBrief = body.designBrief || {};
    const styleHints = body.styleHints || {};
    const quickHints = [
      styleHints.visualStyle || designBrief.visualStyle || "Minimal Clean",
      styleHints.backgroundMode || designBrief.backgroundMode || "dark",
      styleHints.fontMood || designBrief.fontMood || "bold",
    ];
    res.json({
      success: true,
      suggestions: {
        selectedPresetId,
        quickHints,
        note: "Use /offer-designs/preview for deterministic preview payload.",
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "failed to generate suggestions" });
  }
});

app.post("/promo/render", async (req, res) => {
  try {
    const body = req.body || {};
    const selectedPresetId = body.selectedPresetId || body.templateId || null;
    const result = await buildPreview(body.designBrief || body.content || {}, selectedPresetId);

    return res.json({
      success: true,
      selectedPresetId: result.presetId,
      render: result.preview,
      designBrief: result.designBrief,
      providerMeta: result.providerMeta,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "render failed", details: error.details || [] });
  }
});

app.get("/qr", async (req, res) => {
  let {
    store = "",
    restaurant = "",
    offer = "",
    offerId = "",
  } = req.query;

  if (offerId) {
    const data = loadData();
    const savedOffer = getOfferById(data, offerId);
    if (!savedOffer) {
      return res.status(404).json({ error: "offer not found" });
    }
    store = savedOffer.store;
    restaurant = savedOffer.restaurant;
    offer = savedOffer.name;
  }

  if (!store || !restaurant || !offer) {
    return res.status(400).json({
      error: "store, restaurant, and offer are required",
    });
  }

  const redeemUrl =
    `${req.protocol}://${req.get("host")}/redeem` +
    `?store=${encodeURIComponent(store)}` +
    `&restaurant=${encodeURIComponent(restaurant)}` +
    `&offer=${encodeURIComponent(offer)}` +
    (offerId ? `&offerId=${encodeURIComponent(offerId)}` : "");

  try {
    const qrDataUrl = await QRCode.toDataURL(redeemUrl, {
      width: 320,
      margin: 2,
    });

    res.json({
      success: true,
      redeemUrl,
      qrDataUrl,
    });
  } catch (error) {
    res.status(500).json({ error: "failed to generate QR code" });
  }
});

app.post("/redeem", (req, res) => {
  const {
    store,
    restaurant = "",
    offer = "",
    offerId = null,
    name = "",
    email = "",
  } = req.body;

  if (!store) {
    return res.status(400).json({ error: "store is required" });
  }

  const data = loadData();
  const linkedOffer =
    (offerId && getOfferById(data, offerId)) ||
    getStoreOffers(data, store).find((item) => item.name === offer) ||
    getActiveOffer(data, store);
  const code = generateCode(store);
  const timestamp = new Date().toISOString();
  const redemptionId = generateRedemptionId();

  data.redemptions.push({
    id: redemptionId,
    store,
    restaurant: restaurant || linkedOffer?.restaurant || "",
    offerId: linkedOffer?.id || offerId || null,
    offer: offer || linkedOffer?.name || "",
    name,
    email,
    code,
    redeemed: false,
    reminderEligible: Boolean(email) && Boolean(linkedOffer?.reminderOn ?? true),
    reminderSent: false,
    reminderSentAt: null,
    createdAt: timestamp,
    redeemedAt: null,
  });

  if (linkedOffer) {
    linkedOffer.claimCount = (linkedOffer.claimCount || 0) + 1;
    linkedOffer.updatedAt = timestamp;
    recordOfferEvent(data, linkedOffer.id, "claimed", {
      redemptionId,
      code,
    }, "guest");
  }

  saveData(data);

  if (email && email.trim() !== "" && (linkedOffer?.reminderOn ?? true)) {
    scheduleReminder(redemptionId, REMINDER_DELAY_MS);
  }

  res.json({ code, redemptionId, offerId: linkedOffer?.id || null });
});

app.get("/stats/:store", (req, res) => {
  const data = loadData();
  res.json(getOfferMetrics(data, req.params.store));
});

app.get("/redemptions/:store", (req, res) => {
  const data = loadData();
  const items = data.redemptions
    .filter((item) => item.store === req.params.store)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(items);
});

app.put("/redeem/:id/use", (req, res) => {
  const data = loadData();
  const item = data.redemptions.find((redemption) => redemption.id === req.params.id);

  if (!item) {
    return res.status(404).json({ error: "redemption not found" });
  }

  item.redeemed = true;
  item.redeemedAt = new Date().toISOString();
  const linkedOffer = item.offerId ? getOfferById(data, item.offerId) : null;
  if (linkedOffer) {
    linkedOffer.updatedAt = item.redeemedAt;
    recordOfferEvent(data, linkedOffer.id, "redeemed", {
      redemptionId: item.id,
      code: item.code,
    }, "staff");
  }

  saveData(data);
  res.json({ success: true, redemption: item });
});

app.post("/send-reminders/:store", async (req, res) => {
  const data = loadData();
  const items = data.redemptions.filter((item) => item.store === req.params.store);
  const eligible = items.filter(isReminderEligible);

  let sent = 0;
  let mode = "preview";
  const previews = [];

  for (const redemption of eligible) {
    try {
      const result = await processReminderById(redemption.id);
      if (result.sent) {
        mode = result.mode;
        previews.push(result.preview);
        sent += 1;
      }
    } catch (error) {
      // Leave the record untouched so it can be retried later.
    }
  }

  res.json({
    success: true,
    processed: items.length,
    sent,
    skipped: items.length - sent,
    mode,
    previews,
  });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    server.close(() => {
      process.exit(0);
    });
  });
});
