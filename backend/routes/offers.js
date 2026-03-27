function registerOfferRoutes(app, deps) {
  const {
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
  } = deps;

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
      campaignGoal = "traffic",
      audiencePrimary,
      customRule = {},
      selectedChannels = [],
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
      offer.campaignGoal = campaignGoal || offer.campaignGoal || "traffic";
      offer.audiencePrimary = normalizeAudiencePrimary(
        audiencePrimary !== undefined && audiencePrimary !== null ? audiencePrimary : offer.audiencePrimary,
      );
      offer.customRule = customRule && typeof customRule === "object" ? customRule : offer.customRule || {};
      offer.selectedChannels = Array.isArray(selectedChannels) && selectedChannels.length ? selectedChannels : offer.selectedChannels || [];
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
        campaignGoal,
        audiencePrimary,
        customRule: customRule && typeof customRule === "object" ? customRule : {},
        selectedChannels: Array.isArray(selectedChannels) ? selectedChannels : [],
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
}

module.exports = { registerOfferRoutes };
