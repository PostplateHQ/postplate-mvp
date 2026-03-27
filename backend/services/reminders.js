function createReminderService(deps) {
  const {
    loadData,
    saveData,
    sendReminderEmail,
    recordOfferEvent,
  } = deps;

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
      } catch (_error) {
        // Ignore failures here so the app remains lightweight for MVP usage.
      }
    }, delayMs);
  }

  return {
    isReminderEligible,
    processReminderById,
    scheduleReminder,
  };
}

module.exports = { createReminderService };
