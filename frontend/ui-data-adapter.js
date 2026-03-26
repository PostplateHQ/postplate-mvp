(function attachPostPlateDataAdapter(globalScope) {
  const DEFAULT_STORE_ID = 'taco123';

  function asNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function asString(value, fallback = '') {
    const normalized = String(value || '').trim();
    return normalized || fallback;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function money(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(asNumber(value));
  }

  function detectStatus(offer = {}) {
    const normalized = asString(offer.statusDisplay || offer.status, 'draft').toLowerCase();
    if (normalized === 'active') return 'active';
    if (normalized === 'live') return 'active';
    if (normalized === 'scheduled') return 'scheduled';
    if (normalized === 'paused') return 'paused';
    if (normalized === 'archived') return 'completed';
    if (normalized === 'expired') return 'completed';
    return 'draft';
  }

  function getRouteAction(targetRoute, intent, metadata = {}) {
    return {
      targetRoute,
      entityType: metadata.entityType || 'campaign',
      entityId: metadata.entityId || '',
      intent,
      metadata,
    };
  }

  function apiUrl(pathname) {
    if (window.location.protocol === 'file:') return `http://localhost:3000${pathname}`;
    return pathname;
  }

  async function fetchJson(pathname) {
    const response = await fetch(apiUrl(pathname));
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || 'Request failed');
      error.statusCode = response.status;
      throw error;
    }
    return data;
  }

  async function putJson(pathname, payload) {
    const response = await fetch(apiUrl(pathname), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || 'Request failed');
      error.statusCode = response.status;
      throw error;
    }
    return data;
  }

  async function postJson(pathname, payload) {
    const response = await fetch(apiUrl(pathname), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || 'Request failed');
      error.statusCode = response.status;
      throw error;
    }
    return data;
  }

  const mockStoreProfile = {
    storeId: DEFAULT_STORE_ID,
    restaurantName: 'Spice Taco House',
    restaurantLocation: 'Primary location',
    category: 'Restaurant',
    businessType: 'casual_restaurant',
    cuisineType: 'mexican',
    businessHours: '10am - 10pm',
    brandTone: 'friendly_local',
  };

  const mockSmartActions = [
    {
      id: 'action_boost_weekend',
      icon: '↗',
      title: 'Boost Weekend Traffic',
      reason: 'Weekend dinner redemptions are 24% lower than weekday lunch.',
      confidenceLabel: 'High confidence',
      ctaLabel: 'Launch Weekend Offer',
      score: 0.93,
      action: getRouteAction('create', 'boost_weekend_traffic', { preset: 'weekend_combo' }),
    },
    {
      id: 'action_send_reminder',
      icon: '✉',
      title: 'Send Reminder',
      reason: '14 guests scanned your QR but did not redeem this week.',
      confidenceLabel: 'Medium confidence',
      ctaLabel: 'Send Reminder',
      score: 0.86,
      action: getRouteAction('campaigns', 'send_reminder', { filter: 'active' }),
    },
    {
      id: 'action_try_reel',
      icon: '▶',
      title: 'Try a 7-Second Reel',
      reason: 'Reels deliver stronger local reach for your cuisine category.',
      confidenceLabel: 'High confidence',
      ctaLabel: 'Create Reel',
      score: 0.88,
      action: getRouteAction('create', 'create_reel', { mode: 'reel' }),
    },
    {
      id: 'action_promote_top_item',
      icon: '★',
      title: 'Promote Top Item',
      reason: 'Your top-selling item has no active promotion right now.',
      confidenceLabel: 'Medium confidence',
      ctaLabel: 'Promote Item',
      score: 0.82,
      action: getRouteAction('create', 'promote_top_item', { mode: 'offer' }),
    },
    {
      id: 'action_duplicate_winner',
      icon: '⎘',
      title: 'Duplicate Winning Offer',
      reason: 'Your last lunch combo produced the highest repeat visits.',
      confidenceLabel: 'High confidence',
      ctaLabel: 'Duplicate',
      score: 0.9,
      action: getRouteAction('create', 'duplicate_winning_offer', { mode: 'offer', source: 'campaign_lunch_combo' }),
    },
  ];

  const mockCampaigns = [
    {
      id: 'campaign_lunch_combo',
      title: 'Lunch Combo Push',
      goal: 'Increase weekday lunch traffic',
      status: 'active',
      dateRange: 'Apr 1 - Apr 15',
      channels: ['Instagram', 'Stories', 'In-store QR'],
      performanceState: 'Strong',
      offerValue: 'Save 20% This Lunch Window',
      headline: 'Lunch Combo Deal',
      cta: 'Scan to redeem',
      customersGained: 42,
      engagementLift: 18,
      revenueImpact: 1240,
      bestChannel: 'Instagram Stories',
      whatWorked: 'Lunch urgency headline + combo value improved scan rate.',
      whatToImprove: 'Add a reel variant for evening traffic.',
      createdAt: '2026-03-20T10:00:00.000Z',
    },
    {
      id: 'campaign_family_weekend',
      title: 'Family Weekend Pack',
      goal: 'Drive larger basket orders',
      status: 'scheduled',
      dateRange: 'Apr 16 - Apr 30',
      channels: ['Instagram', 'Flyer'],
      performanceState: 'Upcoming',
      offerValue: 'Feed 4 for $24.99',
      headline: 'Family Weekend Pack',
      cta: 'Order now',
      customersGained: 0,
      engagementLift: 0,
      revenueImpact: 0,
      bestChannel: 'N/A',
      whatWorked: 'N/A',
      whatToImprove: 'N/A',
      createdAt: '2026-03-22T11:30:00.000Z',
    },
    {
      id: 'campaign_new_item_drop',
      title: 'New Item Spotlight',
      goal: 'Promote new menu launch',
      status: 'draft',
      dateRange: 'Not scheduled',
      channels: ['Instagram'],
      performanceState: 'Draft',
      offerValue: 'Limited First-Week Launch',
      headline: 'Try Our New Special',
      cta: 'Available now',
      customersGained: 0,
      engagementLift: 0,
      revenueImpact: 0,
      bestChannel: 'N/A',
      whatWorked: 'N/A',
      whatToImprove: 'Finalize visual and publish timing.',
      createdAt: '2026-03-24T08:15:00.000Z',
    },
  ];

  const mockAssets = [
    { id: 'asset_post_1', type: 'post', status: 'published', title: 'Lunch Deal Post', date: 'Apr 02', previewLabel: 'Post' },
    { id: 'asset_reel_1', type: 'reel', status: 'draft', title: '7-sec Lunch Reel', date: 'Apr 03', previewLabel: 'Reel' },
    { id: 'asset_offer_1', type: 'offer', status: 'active', title: 'Family Deal Poster', date: 'Apr 01', previewLabel: 'Offer' },
    { id: 'asset_draft_1', type: 'draft', status: 'draft', title: 'Weekend Promo Draft', date: 'Apr 04', previewLabel: 'Draft' },
  ];

  const mockInsights = [
    { id: 'insight_combo', title: 'Combo offers outperformed flat discounts', detail: 'Combo framing produced 18% higher redemption this week.' },
    { id: 'insight_reel', title: 'Short reels increased top-of-funnel reach', detail: 'Reel content drove 1.4x more profile visits than static posts.' },
    { id: 'insight_timing', title: 'Friday performed best', detail: 'Friday 4pm-7pm delivered your strongest campaign interaction.' },
  ];

  const mockSoundtracks = [
    { id: 'sound_upbeat_01', category: 'Upbeat', label: 'City Rush', mood: 'high-energy', usage: 'Lunch promos and quick cuts', safe: 'Commercial-safe placeholder' },
    { id: 'sound_chill_01', category: 'Chill', label: 'Warm Evening', mood: 'calm', usage: 'Premium plating or dine-in vibe', safe: 'Commercial-safe placeholder' },
    { id: 'sound_premium_01', category: 'Premium', label: 'Gold Hours', mood: 'elevated', usage: 'Fine presentation and new item drops', safe: 'Commercial-safe placeholder' },
    { id: 'sound_energetic_01', category: 'Energetic', label: 'Street Flavor', mood: 'bold', usage: 'Food truck and fast value offers', safe: 'Commercial-safe placeholder' },
  ];

  async function loadProfile(storeId = DEFAULT_STORE_ID) {
    try {
      const response = await fetchJson(`/owner/profile?store=${encodeURIComponent(storeId)}`);
      if (response && response.success && response.profile) return response.profile;
      return deepClone(mockStoreProfile);
    } catch (_error) {
      return deepClone(mockStoreProfile);
    }
  }

  async function loadOffers(storeId = DEFAULT_STORE_ID) {
    try {
      const response = await fetchJson(`/offers/${encodeURIComponent(storeId)}`);
      if (Array.isArray(response) && response.length) {
        return response.map((row) => ({
          id: row.id,
          title: row.name || 'Untitled Campaign',
          goal: row.offerType || 'Drive traffic',
          status: detectStatus(row),
          dateRange: row.endDate ? `${new Date(row.createdAt || Date.now()).toLocaleDateString()} - ${new Date(row.endDate).toLocaleDateString()}` : 'Active now',
          channels: ['Instagram', 'In-store QR'],
          performanceState: detectStatus(row) === 'active' ? 'Live' : 'In progress',
          offerValue: row.reward || row.offerType || 'Limited offer',
          headline: row.name || 'Offer headline',
          cta: 'Scan to redeem',
          customersGained: asNumber(row.repeatCustomerCount),
          engagementLift: Math.round(asNumber(row.conversionRate) * 100) || 12,
          revenueImpact: asNumber(row.estimatedRevenue || row.estimatedNetImpact),
          bestChannel: 'Instagram Stories',
          whatWorked: 'Clear value headline and QR call-to-action.',
          whatToImprove: 'Test a reel-first variant.',
          createdAt: row.createdAt || new Date().toISOString(),
        }));
      }
      return deepClone(mockCampaigns);
    } catch (_error) {
      return deepClone(mockCampaigns);
    }
  }

  async function getGrowthHubData({ storeId = DEFAULT_STORE_ID } = {}) {
    const [profile, campaigns] = await Promise.all([
      loadProfile(storeId),
      loadOffers(storeId),
    ]);

    const activeCount = campaigns.filter((row) => row.status === 'active').length;
    const revenueImpact = campaigns.reduce((sum, row) => sum + asNumber(row.revenueImpact), 0);

    return {
      profile,
      pulse: [
        { id: 'pulse_status', label: 'Today Status', value: activeCount > 1 ? 'Busy' : 'Normal', note: 'Based on active promotions + redemptions' },
        { id: 'pulse_revenue', label: 'Revenue Trend', value: '+12%', note: `${money(revenueImpact)} influenced this cycle` },
        { id: 'pulse_campaigns', label: 'Active Campaigns', value: String(activeCount), note: 'Live this week' },
        { id: 'pulse_customers', label: 'Customers Today', value: '87', note: 'Est. walk-ins + redeemers' },
      ],
      smartActions: deepClone(mockSmartActions),
      quickActions: [
        { id: 'quick_offer', title: 'Create Offer', icon: '◌', action: getRouteAction('create', 'create_offer', { mode: 'offer' }) },
        { id: 'quick_reel', title: 'Create Reel', icon: '▶', action: getRouteAction('create', 'create_reel', { mode: 'reel' }) },
        { id: 'quick_post', title: 'Create Post', icon: '✦', action: getRouteAction('create', 'create_post', { mode: 'post' }) },
      ],
      liveCampaigns: campaigns.filter((row) => row.status === 'active').slice(0, 4),
      learningFeed: deepClone(mockInsights),
    };
  }

  async function getCampaignList({ storeId = DEFAULT_STORE_ID, status = 'active' } = {}) {
    const campaigns = await loadOffers(storeId);
    const normalizedStatus = asString(status, 'active').toLowerCase();
    const filtered = normalizedStatus === 'all'
      ? campaigns
      : campaigns.filter((row) => row.status === normalizedStatus);
    return {
      status: normalizedStatus,
      items: filtered,
      totals: {
        active: campaigns.filter((row) => row.status === 'active').length,
        scheduled: campaigns.filter((row) => row.status === 'scheduled').length,
        drafts: campaigns.filter((row) => row.status === 'draft').length,
        completed: campaigns.filter((row) => row.status === 'completed').length,
      },
    };
  }

  async function getCampaignDetail(id, { storeId = DEFAULT_STORE_ID } = {}) {
    const campaigns = await loadOffers(storeId);
    const selected = campaigns.find((row) => row.id === id) || campaigns[0] || deepClone(mockCampaigns[0]);

    return {
      ...selected,
      assets: [
        { id: `${selected.id}_poster`, type: 'poster', title: 'Poster Preview', status: 'ready', body: selected.headline },
        { id: `${selected.id}_reel`, type: 'reel', title: 'Reel Preview', status: 'draft', body: 'Hook → 3 scenes → CTA' },
        { id: `${selected.id}_caption`, type: 'caption', title: 'Caption', status: 'ready', body: `${selected.offerValue}. ${selected.cta}.` },
      ],
      performanceSummary: {
        customersGained: selected.customersGained,
        engagementLift: `${selected.engagementLift}%`,
        revenueImpact: money(selected.revenueImpact),
        bestChannel: selected.bestChannel,
        whatWorked: selected.whatWorked,
        whatToImprove: selected.whatToImprove,
      },
      actions: [
        getRouteAction('create', 'run_again', { mode: 'offer', sourceCampaignId: selected.id }),
        getRouteAction('create', 'improve_campaign', { mode: 'offer', sourceCampaignId: selected.id }),
        getRouteAction('create', 'create_variant', { mode: 'post', sourceCampaignId: selected.id }),
      ],
    };
  }

  async function getContentStudioAssets(tab = 'posts') {
    const normalized = asString(tab, 'posts').toLowerCase();
    const mappedType = normalized === 'posts'
      ? 'post'
      : normalized === 'reels'
        ? 'reel'
        : normalized === 'offers'
          ? 'offer'
          : 'draft';

    const items = mockAssets.filter((asset) => asset.type === mappedType);
    return {
      tab: normalized,
      items: deepClone(items),
    };
  }

  function getMockSuggestions(input = {}) {
    const item = asString(input.item, 'Chef Special');
    const offer = asString(input.offerType, 'Limited Offer');
    const mode = asString(input.mode, 'offer');

    return [
      {
        id: `${mode}_s1`,
        title: `${item} Spotlight`,
        headline: `${item.toUpperCase()} SPECIAL`,
        offerLine: offer,
        cta: mode === 'reel' ? 'Watch and redeem' : 'Scan to redeem',
        reelHook: `Craving ${item}?`,
        confidence: 'High',
      },
      {
        id: `${mode}_s2`,
        title: `${item} Limited Drop`,
        headline: `LIMITED ${item.toUpperCase()}`,
        offerLine: 'Only this week',
        cta: 'Order now',
        reelHook: `Only this week: ${item}`,
        confidence: 'Medium',
      },
      {
        id: `${mode}_s3`,
        title: `Best Seller Push`,
        headline: `TRY ${item.toUpperCase()} TODAY`,
        offerLine: 'Best value this week',
        cta: 'Visit today',
        reelHook: `${item} in 7 seconds`,
        confidence: 'Medium',
      },
    ];
  }

  function mapIntentToPromotionIntent(intent = '') {
    const normalized = asString(intent).toLowerCase();
    if (normalized === 'increase_sales' || normalized === 'create_offer') return 'discount';
    if (normalized === 'promote_item' || normalized === 'design_post') return 'new_item';
    if (normalized.includes('bring_back')) return 'bring_back';
    return 'combo';
  }

  function mapStyleKeywordsToMood(styleKeywords = []) {
    const values = Array.isArray(styleKeywords)
      ? styleKeywords.map((value) => asString(value).toLowerCase())
      : [];
    if (values.includes('premium')) return 'premium';
    if (values.includes('fun')) return 'fun';
    return 'bold';
  }

  function toUnifiedSuggestion(row = {}, index = 0) {
    const previewImage = row.previewImage || {};
    const preview = row.preview || {};
    const mode = row.preview?.mode || 'generated';
    return {
      id: row.id || `api_suggestion_${index + 1}`,
      title: row.title || row.suggestionType || 'Smart Suggestion',
      headline: preview.headline || (row.title ? String(row.title).toUpperCase() : 'SMART PROMO'),
      offerLine: row.valueLine || row.valueFraming || row.subtitle || 'Limited Time Offer',
      cta: row.promoType === 'new_item' ? 'Available now' : 'Scan to redeem',
      reelHook: `Try ${row.itemKey || 'this special'} today`,
      confidence: row.score >= 0.85 ? 'High' : 'Medium',
      supportLine: row.supportLine || row.subtitle || '',
      visualBehavior: row.visualBehavior || row.recommendedTemplateBehavior || '',
      promoType: row.promoType || row.suggestionType || '',
      compositionType: row.compositionType || '',
      headlineOptions: Array.isArray(row.headlineOptions) ? row.headlineOptions : [],
      imageResolutionMeta: row.imageResolutionMeta || {
        source: previewImage.source || mode,
        provider: '',
        reason: '',
      },
      previewImage: {
        url: previewImage.url || preview.imageUrl || '',
        source: previewImage.source || mode,
      },
    };
  }

  async function getCreateSuggestions(input = {}) {
    const payload = {
      lifecycleStage: 'draft',
      promotionIntent: mapIntentToPromotionIntent(input.intent),
      itemDescription: asString(input.item, 'Chef Special'),
      mood: mapStyleKeywordsToMood(input.styleKeywords),
      visualStyle: Array.isArray(input.styleKeywords) && input.styleKeywords.length
        ? input.styleKeywords.join(', ')
        : 'Bold',
      layoutStyle: asString(input.platform, 'Instagram Post').toLowerCase().includes('story')
        ? 'Full background image'
        : 'Half image + text',
      imageSourcePreference: input.aiDecide ? 'Generate using AI' : 'Upload image',
      uploadedAssetIds: Array.isArray(input.uploadedAssetIds) ? input.uploadedAssetIds : [],
      userIntent: {
        rawText: asString(input.userIntentInput),
        tags: Array.isArray(input.userIntentTags) ? input.userIntentTags : [],
        parsed: input.parsedIntentHints && typeof input.parsedIntentHints === 'object' ? input.parsedIntentHints : {},
      },
      businessContext: input.businessContext || {},
      performanceSignals: input.performanceSignals || {},
    };

    try {
      const response = await postJson('/api/offers/suggestions', payload);
      const suggestions = Array.isArray(response.suggestions)
        ? response.suggestions.map(toUnifiedSuggestion)
        : [];

      return {
        input,
        suggestions: suggestions.length ? suggestions : getMockSuggestions(input),
        soundtrackSuggestions: deepClone(mockSoundtracks),
        generationStatus: {
          state: 'ready',
          message: suggestions.length
            ? 'Suggestions generated with live preview images.'
            : 'Suggestions generated with fallback previews.',
        },
      };
    } catch (_error) {
      return {
        input,
        suggestions: getMockSuggestions(input),
        soundtrackSuggestions: deepClone(mockSoundtracks),
        generationStatus: {
          state: 'fallback',
          message: 'Live generation unavailable. Showing fallback suggestions.',
        },
      };
    }
  }

  async function regenerateCreateSuggestions({
    action = 'all',
    draftInput = {},
    selectedSuggestionId = '',
    editState = {},
  } = {}) {
    try {
      const response = await postJson('/api/offers/regenerate', {
        action,
        draftInput,
        selectedSuggestionId,
        editState,
      });
      const suggestions = Array.isArray(response.suggestions)
        ? response.suggestions.map(toUnifiedSuggestion)
        : [];
      return {
        suggestions: suggestions.length ? suggestions : getMockSuggestions(draftInput),
        selectedSuggestionId: response.selectedSuggestionId || suggestions[0]?.id || '',
        copyVariants: Array.isArray(response.copyVariants) ? response.copyVariants : [],
        generationMeta: response.generationMeta || {},
      };
    } catch (_error) {
      return {
        suggestions: getMockSuggestions(draftInput),
        selectedSuggestionId: selectedSuggestionId || '',
        copyVariants: [],
        generationMeta: { sourceUsed: 'fallback', reason: 'regenerate_failed' },
      };
    }
  }

  async function getCreateReviewPayload({
    selectedSuggestion = null,
    draftInput = {},
    editState = {},
  } = {}) {
    try {
      const response = await postJson('/api/offers/review-payload', {
        selectedSuggestion,
        draftInput,
        editState,
      });
      return {
        posterPreview: response.posterPreview || null,
        campaignSummary: response.campaignSummary || null,
        qrDataUrl: response.qrDataUrl || '',
        generationMeta: response.generationMeta || {},
      };
    } catch (_error) {
      const fallback = selectedSuggestion || {};
      return {
        posterPreview: {
          headline: fallback.headline || fallback.title || 'Offer Preview',
          offerLine: fallback.offerLine || 'Limited Offer',
          cta: fallback.cta || 'Scan to redeem',
          imageUrl: fallback.previewImage?.url || '',
          footer: `${draftInput.businessContext?.restaurantName || 'Your Restaurant'} · ${draftInput.businessContext?.location || 'Primary location'}`,
        },
        campaignSummary: {
          title: fallback.title || 'Campaign',
          status: 'Draft',
          platform: draftInput.platform || 'Instagram Post',
          duration: draftInput.duration || '7 days',
          offerType: draftInput.offerType || 'Limited Time',
        },
        qrDataUrl: '',
        generationMeta: { sourceUsed: 'fallback', reason: 'review_payload_failed' },
      };
    }
  }

  async function getAnalyticsStoryData({ storeId = DEFAULT_STORE_ID } = {}) {
    const campaigns = await loadOffers(storeId);
    const topCampaign = campaigns[0] || deepClone(mockCampaigns[0]);
    return {
      summaryCards: [
        { id: 'sum_customers', title: 'Customers Gained', value: '42', explanation: 'From campaign-driven visits this week.' },
        { id: 'sum_repeat', title: 'Repeat Visits', value: '18', explanation: 'Guests who came back after redeeming.' },
        { id: 'sum_campaign', title: 'Top Campaign', value: topCampaign.title, explanation: 'Highest conversion this cycle.' },
        { id: 'sum_channel', title: 'Top Channel', value: topCampaign.bestChannel, explanation: 'Best performing destination.' },
      ],
      whatWorked: deepClone(mockInsights),
      whatToImprove: [
        { id: 'improve_1', title: 'Boost evening reach', detail: 'Your strongest redemptions happen before 3pm. Test dinner creatives.' },
        { id: 'improve_2', title: 'Add reel variants', detail: 'Campaigns with reels show stronger top-of-funnel lift.' },
      ],
      nextActions: deepClone(mockSmartActions).slice(0, 3),
    };
  }

  async function saveRestaurantProfile(payload = {}) {
    const storeId = asString(payload.storeId, DEFAULT_STORE_ID);
    const response = await putJson(`/owner/profile?store=${encodeURIComponent(storeId)}`, payload);
    return response.profile || payload;
  }

  async function trackCreateIntentInputUsed(payload = {}) {
    // Integration hook: wire to analytics pipeline when event endpoint is available.
    return {
      tracked: true,
      event: 'onIntentInputUsed',
      payload: {
        length: asNumber(payload.length),
        selectedChips: Array.isArray(payload.selectedChips) ? payload.selectedChips : [],
        parsedTags: payload.parsedTags && typeof payload.parsedTags === 'object' ? payload.parsedTags : {},
      },
    };
  }

  globalScope.PostPlateDataAdapter = {
    getGrowthHubData,
    getCampaignList,
    getCampaignDetail,
    getContentStudioAssets,
    getCreateSuggestions,
    regenerateCreateSuggestions,
    getCreateReviewPayload,
    getAnalyticsStoryData,
    saveRestaurantProfile,
    trackCreateIntentInputUsed,
  };
})(window);
