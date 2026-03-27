const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function registerRedemptionRoutes(app, deps) {
  const {
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
  } = deps;

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
    res.sendFile(path.join(__dirname, "..", "..", "frontend", "redeem.html"));
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
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!store) {
      return res.status(400).json({ error: "store is required" });
    }
    if (normalizedEmail && !EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ error: "valid email is required when provided" });
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
      email: normalizedEmail,
      code,
      redeemed: false,
      reminderEligible: Boolean(normalizedEmail) && Boolean(linkedOffer?.reminderOn ?? true),
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

    if (normalizedEmail && (linkedOffer?.reminderOn ?? true)) {
      scheduleReminder(redemptionId, REMINDER_DELAY_MS);
    }

    res.json({ code, redemptionId, offerId: linkedOffer?.id || null });
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
}

module.exports = { registerRedemptionRoutes };
