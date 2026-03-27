function createOfferSlug(store, name) {
  return `${store}::${name}`.trim().toLowerCase();
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
  lines.push("Guest shows code");
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

module.exports = {
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
  getOfferStatusDisplay,
};
