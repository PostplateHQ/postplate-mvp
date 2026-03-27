const { getOwnerProfile } = require('../services/ownerProfile');
const { getStoreOffers, getOfferStatusDisplay } = require('../services/offersDomain');

function buildAction(targetRoute, intent, metadata = {}) {
  return {
    targetRoute,
    entityType: metadata.entityType || 'campaign',
    entityId: metadata.entityId || '',
    intent,
    metadata: { ...metadata },
  };
}

function registerSmartActionsRoutes(app, deps) {
  const { loadData, isReminderEligible } = deps;

  app.get('/api/stores/:storeId/reminders/eligible', (req, res) => {
    const storeId = String(req.params.storeId || '').trim();
    if (!storeId) return res.status(400).json({ error: 'storeId required' });
    const data = loadData();
    const items = (data.redemptions || []).filter((r) => r.store === storeId);
    const eligible = items.filter(isReminderEligible);
    res.json({
      count: eligible.length,
      items: eligible.map((r) => ({
        id: r.id,
        name: r.name || '',
        email: r.email ? `${String(r.email).slice(0, 2)}***` : '',
        offer: r.offer || '',
        createdAt: r.createdAt || null,
      })),
    });
  });

  app.get('/api/stores/:storeId/smart-actions', (req, res) => {
    const storeId = String(req.params.storeId || '').trim() || 'taco123';
    const data = loadData();
    const profile = getOwnerProfile(data, storeId);
    const offers = getStoreOffers(data, storeId, { includeArchived: false });
    const liveOffers = offers.filter((o) => getOfferStatusDisplay(o) === 'live');
    const redemptions = (data.redemptions || []).filter((r) => r.store === storeId);
    const eligibleReminders = redemptions.filter(isReminderEligible);
    const totalScans = liveOffers.reduce((s, o) => s + (Number(o.scanCount) || 0), 0);
    const totalClaims = liveOffers.reduce((s, o) => s + (Number(o.claimCount) || 0), 0);
    const bestMenu = (profile.menuItems || []).find((m) => m.status === 'best_seller')
      || (profile.menuItems || []).find((m) => m.category === 'main')
      || (profile.menuItems || [])[0];
    const topOffer = [...liveOffers].sort((a, b) => (Number(b.claimCount) || 0) - (Number(a.claimCount) || 0))[0]
      || offers[0];

    const hasMenu = (profile.menuItems || []).length > 0;
    const hasLive = liveOffers.length > 0;
    const meta = {
      windowLabel: 'Based on your connected data right now',
      source: 'live',
    };

    const actions = [];

    const weekendSample = !hasLive || totalScans + totalClaims === 0;
    actions.push({
      id: 'action_boost_weekend',
      icon: '↗',
      title: 'Boost Weekend Traffic',
      reason: weekendSample
        ? 'Weekend traffic often lags weekdays — a timed weekend offer can bring families back in.'
        : `You have ${liveOffers.length} live offer(s) and ${totalScans} QR scans — try a weekend push to close the gap.`,
      confidenceLabel: weekendSample ? 'Suggested' : 'High confidence',
      score: weekendSample ? 0.75 : 0.9,
      insightSample: weekendSample,
      ctaLabel: 'Launch Weekend Offer',
      action: buildAction('create', 'boost_weekend_traffic', { preset: 'weekend_combo' }),
    });

    const reminderSample = eligibleReminders.length === 0;
    actions.push({
      id: 'action_send_reminder',
      icon: '✉',
      title: 'Send Reminder',
      reason: reminderSample
        ? 'When guests leave an email at redeem, you can nudge them before the offer expires.'
        : `${eligibleReminders.length} guest${eligibleReminders.length === 1 ? '' : 's'} can get a friendly reminder about their offer.`,
      confidenceLabel: reminderSample ? 'Suggested' : 'Medium confidence',
      score: reminderSample ? 0.7 : 0.86,
      insightSample: reminderSample,
      ctaLabel: 'Send Reminder',
      action: buildAction('smart-reminders', 'send_reminder', {}),
    });

    const cuisine = profile.cuisineType ? String(profile.cuisineType).replace(/_/g, ' ') : 'your category';
    actions.push({
      id: 'action_try_reel',
      icon: '▶',
      title: 'Try a 7-Second Reel',
      reason: `Short reels often reach more locals for ${cuisine} — you film, we give the script.`,
      confidenceLabel: 'High confidence',
      score: 0.88,
      insightSample: true,
      ctaLabel: 'Create Reel',
      action: buildAction('reel-guide', 'create_reel', { mode: 'reel' }),
    });

    const promoteSample = !bestMenu;
    actions.push({
      id: 'action_promote_top_item',
      icon: '★',
      title: 'Promote Top Item',
      reason: promoteSample
        ? 'Tag a best seller in Menu setup, then we will spotlight it in one tap.'
        : `Give "${bestMenu.name}" a poster and QR — it is marked as a favorite on your menu.`,
      confidenceLabel: promoteSample ? 'Suggested' : 'Medium confidence',
      score: promoteSample ? 0.72 : 0.84,
      insightSample: promoteSample,
      ctaLabel: 'Promote Item',
      action: buildAction('create', 'promote_top_item', {
        mode: 'offer',
        menuItemId: bestMenu?.id || '',
      }),
    });

    const dupSample = !topOffer;
    actions.push({
      id: 'action_duplicate_winner',
      icon: '⎘',
      title: 'Duplicate Winning Offer',
      reason: dupSample
        ? 'When you have a live campaign, you can repeat what worked with fresh dates.'
        : `Your "${topOffer.name || 'latest'}" offer is performing — run it again with one tap.`,
      confidenceLabel: dupSample ? 'Suggested' : 'High confidence',
      score: dupSample ? 0.68 : 0.9,
      insightSample: dupSample,
      ctaLabel: 'Duplicate',
      action: buildAction('create', 'duplicate_winning_offer', {
        mode: 'offer',
        sourceCampaignId: topOffer?.id || '',
      }),
    });

    if (actions.every((a) => a.insightSample)) {
      meta.source = 'sample';
      meta.windowLabel = 'Sample ideas — connect menu and campaigns for personalized tips';
    } else if (actions.some((a) => a.insightSample)) {
      meta.source = 'mixed';
    }

    res.json({ smartActions: actions, smartActionsMeta: meta });
  });
}

module.exports = { registerSmartActionsRoutes };
