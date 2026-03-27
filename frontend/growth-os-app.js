(function initPostPlateGrowthOS(globalScope) {
  const dataAdapter = globalScope.PostPlateDataAdapter;
  if (!dataAdapter) return;

  const DEFAULT_STORE_ID = 'taco123';
  const ROUTES = ['home', 'live', 'campaigns', 'campaign-detail', 'content-studio', 'menu-import', 'create-campaign', 'create', 'analytics', 'settings', 'smart-reminders', 'reel-guide'];
  const CAMPAIGN_STATUSES = ['active', 'scheduled', 'drafts', 'completed'];
  const CONTENT_TABS = ['posts', 'reels', 'offers', 'drafts'];
  const FEATURE_FLAGS = {
    menu_intelligence_v1: true,
  };
  const CREATE_STEPS = ['Intent', 'Offer Basics + Schedule', 'Poster Design', 'Preview + Publish'];
  const CREATE_INTENTS = [
    { id: 'create_offer', title: 'New offer', desc: 'Start a fresh offer with recommended defaults.', mode: 'offer' },
    { id: 'increase_sales', title: 'Boost Slow Hours', desc: 'Use a simple value offer to increase traffic.', mode: 'offer' },
    { id: 'promote_item', title: 'Promote Menu Item', desc: 'Highlight one item and publish quickly.', mode: 'offer' },
  ];
  const INTENT_SUGGESTION_CHIPS = [
    'Dark Background',
    'Premium Look',
    'Bold Text',
    'Highlight Food',
    'More Text',
    'Add QR',
    'Festive',
    'Minimal',
  ];

  const WIZARD_STEPS = ['Why This Matters', 'Upload Menu', 'Review Items', 'Stars & Slow Movers', 'Business Rhythm', 'All Set'];
  const WIZARD_GOALS = [
    { id: 'get_more_people', label: 'Get more people in the door', campaignGoal: 'traffic' },
    { id: 'sell_more', label: 'Sell more of what I already make', campaignGoal: 'aov' },
    { id: 'move_slow_items', label: 'Move the slow items', campaignGoal: 'redemption' },
    { id: 'build_repeat', label: 'Build repeat customers', campaignGoal: 'repeat_visits' },
  ];
  const WIZARD_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const WIZARD_HOURS = ['6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'];

  const state = {
    storeId: DEFAULT_STORE_ID,
    route: 'home',
    routeParams: {},
    profile: null,
    growthHub: null,
    campaigns: { status: 'active', items: [], totals: {} },
    campaignListSearch: '',
    liveListSearch: '',
    livePageItems: [],
    liveLearningFeed: [],
    campaignDetail: null,
    campaignDetailTab: 'overview',
    contentStudio: { tab: 'posts', items: [] },
    analytics: null,
    settings: null,
    loadingRoute: false,
    routeError: '',
    menuWizard: {
      open: false,
      step: 1,
      extractedItems: [],
      confirmedItems: [],
      taggingPass: 'best_seller',
      peakHoursStart: '12 PM',
      peakHoursEnd: '2 PM',
      slowHoursStart: '2 PM',
      slowHoursEnd: '5 PM',
      busiestDays: [],
      primaryGoal: '',
      extractionStatus: '',
      saveStatus: '',
    },
    menuImport: {
      step: 0,
      reviewStep: 0,
      uploadStatus: '',
      processingPhase: '',
      parseConfidence: 0,
      parseWarnings: [],
      importSource: '',
      fileName: '',
      fileType: '',
      fileDataUrl: '',
      restaurantInfo: { name: '', tagline: '', contact: '', address: '', logo: '' },
      sections: [],
      style: { template: 'modern', layout: 'one-column' },
      saveStatus: '',
      errorMessage: '',
    },
    campaignBuilder: {
      step: 1,
      intent: '',
      selectedItem: '',
      selectedItemId: '',
      offerType: '',
      discountValue: '',
      comboDescription: '',
      tone: '',
      generatedPoster: '',
      headline: '',
      offerLine: '',
      cta: '',
      channels: ['Instagram Post', 'In-store QR'],
      duration: 7,
      qrDataUrl: '',
      processingPhase: '',
      generating: false,
      publishStatus: '',
      errorMessage: '',
      smartPresetId: '',
      duplicateSourceCampaignId: '',
      audiencePrimary: 'general',
      campaignGoal: 'traffic',
    },
    smartReminders: {
      step: 1,
      eligibleCount: 0,
      items: [],
      loading: false,
      sending: false,
      error: '',
      sendResult: null,
      fetchAttempted: false,
    },
    createFlow: {
      open: false,
      step: 1,
      entryMode: 'guided',
      mode: 'offer',
      intent: '',
      item: '',
      offerType: 'Percentage Off',
      campaignGoal: 'traffic',
      customOfferEnabled: false,
      customOffer: {
        customLabel: '',
        eligibilityRule: '',
        rewardRule: '',
        exclusions: '',
        legalTerms: '',
        redemptionLimit: '',
      },
      duration: '7 days',
      platform: 'Instagram Post',
      selectedChannels: ['Instagram Post', 'In-store QR'],
      soundtrackMood: 'upbeat',
      styleKeywords: ['Bold', 'Premium'],
      userIntentInput: '',
      userIntentTags: [],
      parsedIntentHints: {},
      aiDecide: true,
      selectedAssetNames: [],
      generationStatus: '',
      suggestions: [],
      soundtrackSuggestions: [],
      selectedSuggestionId: '',
      selectedSoundtrackId: '',
      headline: '',
      offerLine: '',
      cta: '',
      footer: '',
      reelHook: '',
      reviewPayload: null,
      reviewConfirmed: false,
      qrDataUrl: '',
      regenLoadingByAction: {
        headline: false,
        image: false,
        all: false,
      },
      lastSuggestionSignature: '',
      orchestratorSummary: null,
      recommendationRoutes: [],
      analyticsTags: {},
      editState: {
        layoutPreset: 'food-focus',
        alignment: 'left',
        colorPreset: 'deep-navy',
        safeZonePositions: {
          text: { x: 0, y: 0 },
          logo: { x: 0, y: 0 },
          image: { x: 0, y: 0 },
        },
      },
    },
  };

  const refs = {
    routeMount: document.getElementById('appRouteMount'),
    sidebarNav: document.getElementById('appSidebarNav'),
    businessName: document.getElementById('appBusinessName'),
    businessLocation: document.getElementById('appBusinessLocation'),
    businessAvatar: document.getElementById('appBusinessAvatar'),
    primaryCreateButton: document.getElementById('appPrimaryCreateButton'),
    globalSearchInput: document.getElementById('appGlobalSearch'),
    accountButton: document.getElementById('appAccountButton'),

    createModal: document.getElementById('unifiedCreateModal'),
    createProgress: document.getElementById('unifiedCreateProgress'),
    createBody: document.getElementById('unifiedCreateBody'),
    createNotice: document.getElementById('unifiedCreateNotice'),
    createSubtitle: document.getElementById('unifiedCreateSubtitle'),
    createClose: document.getElementById('unifiedCreateClose'),
    createCancel: document.getElementById('unifiedCreateCancel'),
    createBack: document.getElementById('unifiedCreateBack'),
    createNext: document.getElementById('unifiedCreateNext'),
    imageLightbox: document.getElementById('createImageLightbox'),
    imageLightboxClose: document.getElementById('createImageLightboxClose'),
    imageLightboxImg: document.getElementById('createImageLightboxImg'),

    wizardModal: document.getElementById('menuWizardModal'),
    wizardProgress: document.getElementById('menuWizardProgress'),
    wizardBody: document.getElementById('menuWizardBody'),
    wizardSubtitle: document.getElementById('menuWizardSubtitle'),
    wizardClose: document.getElementById('menuWizardClose'),
    wizardBack: document.getElementById('menuWizardBack'),
    wizardNext: document.getElementById('menuWizardNext'),
  };

  function asString(value, fallback = '') {
    const normalized = String(value || '').trim();
    return normalized || fallback;
  }

  function asNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalizeMenuItems(list = []) {
    if (!Array.isArray(list)) return [];
    return list
      .map((row, index) => {
        const name = asString(row?.name);
        if (!name) return null;
        const category = asString(row?.category, 'main').toLowerCase();
        const status = asString(row?.status, 'regular').toLowerCase();
        const marginBand = asString(row?.marginBand, '').toLowerCase();
        return {
          id: asString(row?.id, `menu_item_${Date.now()}_${index}`),
          name,
          category: ['starter', 'main', 'drink', 'dessert'].includes(category) ? category : 'main',
          status: ['best_seller', 'slow_mover', 'regular'].includes(status) ? status : 'regular',
          marginBand: ['high', 'medium', 'low'].includes(marginBand) ? marginBand : '',
          note: asString(row?.note),
          imageAssetId: asString(row?.imageAssetId),
          imageUrl: asString(row?.imageUrl),
        };
      })
      .filter(Boolean)
      .slice(0, 20);
  }

  function menuSignalsSummary(menuItems = []) {
    return (Array.isArray(menuItems) ? menuItems : []).reduce((acc, item) => {
      acc.totalItems += 1;
      if (item.status === 'best_seller') acc.bestSellerCount += 1;
      if (item.status === 'slow_mover') acc.slowMoverCount += 1;
      if (item.imageAssetId || item.imageUrl) acc.withImageCount += 1;
      if (item.marginBand === 'high') acc.highMarginCount += 1;
      return acc;
    }, {
      totalItems: 0,
      bestSellerCount: 0,
      slowMoverCount: 0,
      withImageCount: 0,
      highMarginCount: 0,
    });
  }

  function profileMenuItems() {
    return normalizeMenuItems(state.profile?.menuItems || []);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function money(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  }

  function formatLastUpdated(value) {
    if (!value) return 'just now';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'just now';
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value || 0)));
  }

  function setSafeZonePosition(block, axis, nextValue) {
    const current = state.createFlow.editState.safeZonePositions[block] || { x: 0, y: 0 };
    state.createFlow.editState.safeZonePositions[block] = {
      ...current,
      [axis]: clamp(nextValue, -28, 28),
    };
  }

  function nudgeSafeZone(block, axis, delta) {
    const current = state.createFlow.editState.safeZonePositions[block] || { x: 0, y: 0 };
    setSafeZonePosition(block, axis, Number(current[axis] || 0) + delta);
  }

  function buildCreateSuggestionSignature() {
    const keywordSignature = Array.isArray(state.createFlow.styleKeywords)
      ? [...state.createFlow.styleKeywords].map((value) => asString(value).toLowerCase()).sort().join('|')
      : '';
    const assetsSignature = Array.isArray(state.createFlow.selectedAssetNames)
      ? [...state.createFlow.selectedAssetNames].map((value) => asString(value).toLowerCase()).sort().join('|')
      : '';

    return [
      asString(state.createFlow.mode).toLowerCase(),
      asString(state.createFlow.intent).toLowerCase(),
      asString(state.createFlow.item).toLowerCase(),
      asString(state.createFlow.offerType).toLowerCase(),
      asString(state.createFlow.duration).toLowerCase(),
      asString(state.createFlow.platform).toLowerCase(),
      asString(state.createFlow.userIntentInput).toLowerCase(),
      (Array.isArray(state.createFlow.userIntentTags) ? [...state.createFlow.userIntentTags].sort().join('|') : ''),
      String(Boolean(state.createFlow.aiDecide)),
      keywordSignature,
      assetsSignature,
      asString(state.profile?.restaurantName).toLowerCase(),
      asString(state.profile?.restaurantLocation).toLowerCase(),
      asString(state.profile?.cuisineType).toLowerCase(),
      asString(state.profile?.businessType).toLowerCase(),
      asString(state.createFlow.campaignGoal).toLowerCase(),
      (state.createFlow.selectedChannels || []).sort().join('|'),
      asString(state.profile?.primaryGoal).toLowerCase(),
    ].join('::');
  }

  function invalidateCreateOutputs(reason = '') {
    state.createFlow.suggestions = [];
    state.createFlow.soundtrackSuggestions = [];
    state.createFlow.selectedSuggestionId = '';
    state.createFlow.selectedSoundtrackId = '';
    state.createFlow.generationStatus = '';
    state.createFlow.headline = '';
    state.createFlow.offerLine = '';
    state.createFlow.cta = '';
    state.createFlow.reelHook = '';
    state.createFlow.reviewPayload = null;
    state.createFlow.qrDataUrl = '';
    state.createFlow.lastSuggestionSignature = '';
    state.createFlow.orchestratorSummary = null;
    state.createFlow.recommendationRoutes = [];
    state.createFlow.analyticsTags = {};
    if (reason) setCreateNotice(reason, 'info');
  }

  function layoutPresetForSuggestion(suggestion = {}) {
    const behavior = asString(
      suggestion.visualBehavior
        || suggestion.recommendedTemplateBehavior
        || suggestion.visualStyleRecommendation,
    ).toLowerCase();
    const title = asString(suggestion.title).toLowerCase();

    if (behavior.includes('premium') || title.includes('premium')) return 'premium';
    if (behavior.includes('minimal') || title.includes('spotlight')) return 'minimal-clean';
    if (behavior.includes('text') || behavior.includes('banner') || title.includes('discount')) return 'text-forward';
    if (behavior.includes('bold') || title.includes('combo') || title.includes('save')) return 'bold-promo';
    return 'food-focus';
  }

  function colorPresetForSuggestion(suggestion = {}) {
    const behavior = asString(
      suggestion.visualBehavior
        || suggestion.recommendedTemplateBehavior
        || suggestion.visualStyleRecommendation,
    ).toLowerCase();
    if (behavior.includes('premium') || behavior.includes('minimal')) return 'clean-light';
    if (behavior.includes('urgent') || behavior.includes('bold')) return 'warm-dark';
    return 'deep-navy';
  }

  function applySuggestionToEditor(suggestion = {}, options = {}) {
    if (!suggestion) return;
    if (!options.skipHeadline) state.createFlow.headline = suggestion.headline || suggestion.title || state.createFlow.headline;
    if (!options.skipOfferLine) state.createFlow.offerLine = suggestion.offerLine || suggestion.supportLine || state.createFlow.offerLine;
    if (!options.skipCta) state.createFlow.cta = suggestion.cta || state.createFlow.cta;
    if (!options.skipReelHook) state.createFlow.reelHook = suggestion.reelHook || state.createFlow.reelHook;
    if (!options.keepFooter) {
      state.createFlow.footer = `${state.profile?.restaurantName || 'Your Restaurant'} · ${state.profile?.restaurantLocation || 'Primary location'}`;
    }

    if (!options.keepLayout) {
      state.createFlow.editState.layoutPreset = layoutPresetForSuggestion(suggestion);
      state.createFlow.editState.colorPreset = colorPresetForSuggestion(suggestion);
    }
  }

  function openImageLightbox(imageUrl = '', alt = 'Poster preview') {
    if (!refs.imageLightbox || !refs.imageLightboxImg || !imageUrl) return;
    refs.imageLightboxImg.src = imageUrl;
    refs.imageLightboxImg.alt = alt;
    refs.imageLightbox.classList.remove('hidden');
    refs.imageLightbox.setAttribute('aria-hidden', 'false');
  }

  function closeImageLightbox() {
    if (!refs.imageLightbox || !refs.imageLightboxImg) return;
    refs.imageLightbox.classList.add('hidden');
    refs.imageLightbox.setAttribute('aria-hidden', 'true');
    refs.imageLightboxImg.src = '';
  }

  function bindImageEnlargeHandlers() {
    refs.createBody.querySelectorAll('[data-enlarge-image]').forEach((node) => {
      node.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const imageUrl = asString(node.dataset.enlargeImage);
        if (!imageUrl) return;
        openImageLightbox(imageUrl, asString(node.dataset.enlargeLabel, 'Poster preview'));
      });
    });
  }

  function parseRouteFromUrl() {
    const query = new URLSearchParams(window.location.search);
    const page = asString(query.get('page'), 'home').toLowerCase();
    const route = ROUTES.includes(page) ? page : 'home';
    return {
      route,
      routeParams: {
        campaignId: asString(query.get('campaignId')),
        offerId: asString(query.get('offerId')),
        status: asString(query.get('status')),
        tab: asString(query.get('tab')),
        openCreate: asString(query.get('openCreate')),
        mode: asString(query.get('mode')),
        intent: asString(query.get('intent')),
      },
    };
  }

  function setUrl(route, params = {}) {
    const query = new URLSearchParams(window.location.search);
    query.set('page', route);
    if (params.campaignId) query.set('campaignId', params.campaignId); else query.delete('campaignId');
    if (params.offerId) query.set('offerId', params.offerId); else query.delete('offerId');
    if (params.status) query.set('status', params.status); else query.delete('status');
    if (params.tab) query.set('tab', params.tab); else query.delete('tab');
    if (params.openCreate) query.set('openCreate', params.openCreate); else query.delete('openCreate');
    if (params.mode) query.set('mode', params.mode); else query.delete('mode');
    if (params.intent) query.set('intent', params.intent); else query.delete('intent');
    history.replaceState(null, '', `?${query.toString()}`);
  }

  function navigate(route, params = {}) {
    if (state.route === 'campaigns' && route !== 'campaigns') {
      state.campaignListSearch = '';
      if (refs.globalSearchInput) refs.globalSearchInput.value = '';
    }
    if (state.route === 'live' && route !== 'live') {
      state.liveListSearch = '';
      if (refs.globalSearchInput) refs.globalSearchInput.value = '';
    }
    state.route = route;
    state.routeParams = params;
    setUrl(route, params);
    refreshRoute();
  }

  function setRouteError(message) {
    state.routeError = message;
    refs.routeMount.innerHTML = `
      <section class="pp-card pp-state-card" role="alert">
        <h3>Something went wrong</h3>
        <p>${escapeHtml(message)}</p>
        <button type="button" class="pp-primary-btn pp-inline-btn" data-route-retry>Retry</button>
      </section>
    `;
    refs.routeMount.querySelector('[data-route-retry]')?.addEventListener('click', () => refreshRoute());
  }

  function renderSidebarActive() {
    refs.sidebarNav.querySelectorAll('[data-route]').forEach((button) => {
      const r = button.dataset.route;
      const onDetail = state.route === 'campaign-detail';
      const detail = state.campaignDetail;
      const detailIsLive = onDetail && detail && asString(detail.status, '').toLowerCase() === 'active';
      button.classList.toggle('active', r === state.route || (onDetail && r === 'campaigns') || (detailIsLive && r === 'live'));
    });
  }

  function renderProfile() {
    const profile = state.profile || {};
    const name = profile.restaurantName || 'Your Restaurant';
    const location = profile.restaurantLocation || 'Primary location';
    refs.businessName.textContent = name;
    refs.businessLocation.innerHTML = `<span class="pp-status-dot live"></span> ${escapeHtml(location)}`;
    if (profile.logoAsset) {
      refs.businessAvatar.innerHTML = `<img class="pp-avatar-image" src="${escapeHtml(profile.logoAsset)}" alt="${escapeHtml(name)} logo" />`;
      return;
    }
    refs.businessAvatar.textContent = name.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  }

  function createSectionHeader(kicker, title, subtitle, actionHtml = '') {
    return `
      <header class="pp-section-head">
        <div>
          ${kicker ? `<p class="pp-breadcrumb">${escapeHtml(kicker)}</p>` : ''}
          <h1>${escapeHtml(title)}</h1>
          ${subtitle ? `<p class="pp-page-subtitle">${escapeHtml(subtitle)}</p>` : ''}
        </div>
        ${actionHtml ? `<div class="pp-section-head-actions">${actionHtml}</div>` : ''}
      </header>
    `;
  }

  function renderLoadingShell() {
    refs.routeMount.innerHTML = `
      <section class="pp-grid pp-grid-2">
        <article class="pp-card pp-skeleton-card"></article>
        <article class="pp-card pp-skeleton-card"></article>
      </section>
      <section class="pp-grid pp-grid-2">
        <article class="pp-card pp-skeleton-card"></article>
        <article class="pp-card pp-skeleton-card"></article>
      </section>
    `;
  }

  function actionButton(action, style = 'primary') {
    return `<button type="button" class="pp-${style}-btn pp-inline-btn" data-action='${escapeHtml(JSON.stringify(action))}'>${escapeHtml(action.label || action.intent || 'Open')}</button>`;
  }

  function renderSmartActionCard(action, index = 0) {
    const sampleChip = action.insightSample
      ? '<span class="pp-card-chip pp-card-chip-muted">Sample idea</span>'
      : '';
    return `
      <article class="pp-card pp-smart-action-card pp-smart-action-animate" data-smart-action-id="${escapeHtml(action.id || `sa_${index}`)}" style="animation-delay:${Math.min(index, 6) * 60}ms" tabindex="0" aria-label="${escapeHtml(action.title)}">
        <div class="pp-smart-action-top">
          <span class="pp-smart-action-icon" aria-hidden="true">${escapeHtml(action.icon)}</span>
          <span class="pp-smart-action-chips">
            <span class="pp-card-chip">${escapeHtml(action.confidenceLabel)}</span>
            ${sampleChip}
          </span>
        </div>
        <h3>${escapeHtml(action.title)}</h3>
        <p>${escapeHtml(action.reason)}</p>
        <button class="pp-primary-btn pp-inline-btn" type="button" data-smart-action-id="${escapeHtml(action.id || `sa_${index}`)}" data-action='${escapeHtml(JSON.stringify(action.action))}'>${escapeHtml(action.ctaLabel)}</button>
      </article>
    `;
  }

  function renderCampaignCard(campaign) {
    const isLive = campaign.status === 'active';
    const pauseLabel = isLive ? 'Pause' : 'Resume';
    const studioTab = isLive ? 'posts' : 'drafts';
    const nextStudioAction = JSON.stringify({
      targetRoute: 'content-studio',
      intent: 'open_studio',
      metadata: { tab: studioTab },
    });
    const nextReelAction = JSON.stringify({
      targetRoute: 'reel-guide',
      intent: 'create_reel',
      metadata: {},
    });
    return `
      <article class="pp-card pp-campaign-card" data-campaign-id="${escapeHtml(campaign.id)}">
        <div class="pp-campaign-row-top">
          <div>
            <h3>${escapeHtml(campaign.title)}</h3>
            <p class="pp-muted-copy">${escapeHtml(campaign.goal)}</p>
          </div>
          <span class="pp-status-badge ${campaign.status === 'active' ? 'ready' : 'pending'}">${escapeHtml(campaign.status)}</span>
        </div>
        <p class="pp-muted-copy">${escapeHtml(campaign.dateRange)} · ${escapeHtml(campaign.channels.join(', '))}</p>
        <div class="pp-campaign-meta-grid">
          <span><strong>State:</strong> ${escapeHtml(campaign.performanceState)}</span>
          <span><strong>Value:</strong> ${escapeHtml(campaign.offerValue)}</span>
        </div>
        <p class="pp-campaign-next-action">
          <span class="pp-muted-copy">Next:</span>
          <button type="button" class="pp-link-btn" data-action='${escapeHtml(nextStudioAction)}'>Content Studio</button>
          <span class="pp-muted-copy">·</span>
          <button type="button" class="pp-link-btn" data-action='${escapeHtml(nextReelAction)}'>Reel guide</button>
        </p>
        <div class="pp-inline-actions">
          <button type="button" class="pp-primary-btn pp-inline-btn" data-view-campaign="${escapeHtml(campaign.id)}">View</button>
          <button type="button" class="pp-secondary-btn pp-inline-btn" data-pause-campaign="${escapeHtml(campaign.id)}">${pauseLabel}</button>
          <button type="button" class="pp-secondary-btn pp-inline-btn" data-duplicate-campaign="${escapeHtml(campaign.id)}">Duplicate</button>
        </div>
      </article>
    `;
  }

  function renderLiveExecutionCard(campaign, insight) {
    const boostAction = JSON.stringify({ targetRoute: 'create', intent: 'boost_weekend_traffic', metadata: { preset: 'weekend_combo' } });
    const improveAction = JSON.stringify({ targetRoute: 'create', intent: 'improve_campaign', metadata: { mode: 'offer', sourceCampaignId: campaign.id } });
    return `
      <article class="pp-card pp-live-execution-card" data-campaign-id="${escapeHtml(campaign.id)}">
        <div class="pp-live-execution-top">
          <div>
            <p class="pp-card-kicker">Live now</p>
            <h2 class="pp-live-title">${escapeHtml(campaign.title)}</h2>
            <p class="pp-muted-copy">${escapeHtml(campaign.goal)}</p>
          </div>
          <span class="pp-status-badge ready">${escapeHtml(campaign.status)}</span>
        </div>
        <p class="pp-live-offer-line">${escapeHtml(campaign.offerValue)}</p>
        <div class="pp-live-metrics">
          <div class="pp-live-metric"><span>Customers gained</span><strong>${escapeHtml(String(campaign.customersGained ?? 0))}</strong></div>
          <div class="pp-live-metric"><span>Engagement lift</span><strong>${escapeHtml(String(campaign.engagementLift ?? 0))}%</strong></div>
          <div class="pp-live-metric"><span>Revenue (est.)</span><strong>${escapeHtml(money(asNumber(campaign.revenueImpact)))}</strong></div>
        </div>
        <p class="pp-live-ai-insight"><strong>Tip:</strong> ${escapeHtml(insight)}</p>
        <div class="pp-inline-actions pp-live-actions">
          <button type="button" class="pp-primary-btn pp-inline-btn" data-action='${escapeHtml(boostAction)}'>Boost</button>
          <button type="button" class="pp-secondary-btn pp-inline-btn" data-action='${escapeHtml(improveAction)}'>Improve</button>
          <button type="button" class="pp-secondary-btn pp-inline-btn" data-pause-campaign>Pause</button>
          <button type="button" class="pp-secondary-btn pp-inline-btn" data-view-campaign="${escapeHtml(campaign.id)}">View</button>
        </div>
      </article>
    `;
  }

  function emptyState(title, message, ctaLabel, actionPayload) {
    return `
      <section class="pp-card pp-empty-state" role="status">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        ${ctaLabel ? `<button class="pp-primary-btn pp-inline-btn" type="button" data-action='${escapeHtml(JSON.stringify(actionPayload || { targetRoute: 'create', intent: 'create_offer' }))}'>${escapeHtml(ctaLabel)}</button>` : ''}
      </section>
    `;
  }

  function parseActionPayload(raw) {
    try {
      return JSON.parse(raw || '{}');
    } catch (_error) {
      return null;
    }
  }

  const smartActionImpressionSeen = new Set();
  function trackGrowthEvent(name, payload = {}) {
    if (globalScope.console && typeof globalScope.console.debug === 'function') {
      globalScope.console.debug(`[growth] ${name}`, { storeId: state.storeId, ...payload });
    }
  }
  function trackSmartActionClick(action, actionId = '') {
    const id = asString(actionId, '');
    trackGrowthEvent('smart_action_click', {
      ...(id ? { actionId: id } : {}),
      targetRoute: action?.targetRoute,
      intent: action?.intent,
      preset: action?.metadata?.preset,
    });
  }
  function trackSmartActionImpression(id) {
    if (!id || smartActionImpressionSeen.has(id)) return;
    smartActionImpressionSeen.add(id);
    trackGrowthEvent('smart_action_impression', { actionId: id });
  }
  function trackFlowCompleted(name, detail = {}) {
    trackGrowthEvent('flow_completed', { flow: name, ...detail });
  }

  function applySmartActionToCampaignBuilder(action) {
    const intent = asString(action?.intent, '');
    const meta = action?.metadata || {};
    const cb = state.campaignBuilder;
    const profile = state.profile || state.growthHub?.profile || {};
    const live = Array.isArray(state.growthHub?.liveCampaigns) ? state.growthHub.liveCampaigns : [];

    cb.smartPresetId = asString(meta.preset, intent);
    cb.duplicateSourceCampaignId = '';

    if (intent === 'boost_weekend_traffic' || meta.preset === 'weekend_combo') {
      cb.intent = 'deal';
      cb.offerType = 'discount';
      cb.discountValue = '15% Off';
      cb.tone = 'friendly';
      cb.duration = 14;
      cb.channels = ['Instagram Post', 'Instagram Story', 'In-store QR'];
      cb.step = 2;
      return;
    }

    if (intent === 'promote_top_item') {
      cb.intent = 'dish';
      let item = null;
      if (meta.menuItemId) {
        item = (profile.menuItems || []).find((m) => m.id === meta.menuItemId);
      }
      if (!item) {
        item = (profile.menuItems || []).find((m) => m.status === 'best_seller')
          || (profile.menuItems || []).find((m) => m.category === 'main')
          || (profile.menuItems || [])[0];
      }
      if (item) {
        cb.selectedItem = item.name;
        cb.selectedItemId = item.id;
      } else {
        cb.selectedItem = '';
        cb.selectedItemId = '';
      }
      cb.offerType = 'no_discount';
      cb.tone = 'friendly';
      cb.step = 2;
      return;
    }

    if (intent === 'duplicate_winning_offer') {
      const cid = asString(meta.sourceCampaignId || meta.source, '');
      const camp = live.find((c) => c.id === cid) || live[0];
      if (camp) {
        cb.intent = 'deal';
        cb.offerType = 'combo';
        cb.comboDescription = asString(camp.offerValue, asString(camp.headline, 'Same great deal'));
        cb.selectedItem = asString(camp.title, asString(camp.headline, 'House favorite'));
        cb.selectedItemId = '';
        cb.tone = 'bold';
        cb.duplicateSourceCampaignId = camp.id;
        cb.channels = ['Instagram Post', 'Instagram Story', 'In-store QR'];
      }
      cb.step = 2;
      return;
    }

    if (intent === 'run_again' || intent === 'improve_campaign') {
      const cid = asString(meta.sourceCampaignId, '');
      const fromList = Array.isArray(state.campaigns?.items) ? state.campaigns.items : [];
      const camp = live.find((c) => c.id === cid)
        || fromList.find((c) => c.id === cid)
        || (state.campaignDetail && state.campaignDetail.id === cid ? state.campaignDetail : null);
      if (camp) {
        cb.intent = 'deal';
        cb.offerType = 'combo';
        cb.comboDescription = asString(camp.offerValue, asString(camp.headline, ''));
        cb.selectedItem = asString(camp.title, asString(camp.headline, 'Featured item'));
        cb.selectedItemId = '';
        cb.tone = intent === 'improve_campaign' ? 'bold' : 'friendly';
        cb.duplicateSourceCampaignId = camp.id;
        cb.channels = Array.isArray(camp.channels) && camp.channels.length
          ? [...camp.channels]
          : ['Instagram Post', 'In-store QR'];
        cb.headline = asString(camp.headline, camp.title);
        cb.offerLine = asString(camp.offerValue, '');
      }
      cb.step = 2;
      return;
    }

    cb.step = 1;
  }

  function handleAction(action, smartActionCardId = '') {
    if (!action) return;
    trackSmartActionClick(action, smartActionCardId);
    const targetRoute = asString(action.targetRoute, 'home');
    const intent = asString(action.intent, '');

    if (targetRoute === 'smart-reminders' || intent === 'send_reminder') {
      resetSmartRemindersFlow();
      navigate('smart-reminders');
      return;
    }

    if (targetRoute === 'content-studio') {
      navigate('content-studio', { tab: asString(action.metadata?.tab, 'posts') });
      return;
    }

    if (targetRoute === 'reel-guide' || intent === 'create_reel') {
      navigate('reel-guide');
      return;
    }

    if (targetRoute === 'create') {
      resetCampaignBuilder();
      applySmartActionToCampaignBuilder(action);
      navigate('create-campaign');
      return;
    }

    if (targetRoute === 'campaign-detail') {
      navigate('campaign-detail', { campaignId: action.entityId || action.metadata?.campaignId || '' });
      return;
    }

    if (targetRoute === 'campaigns') {
      navigate('campaigns', { status: action.metadata?.filter || 'active' });
      return;
    }

    navigate(targetRoute);
  }

  function resetSmartRemindersFlow() {
    state.smartReminders = {
      step: 1,
      eligibleCount: 0,
      items: [],
      loading: false,
      sending: false,
      error: '',
      sendResult: null,
      fetchAttempted: false,
    };
  }

  async function renderSmartRemindersRoute() {
    const sr = state.smartReminders;
    const profile = state.profile || {};

    if (!sr.fetchAttempted) {
      sr.fetchAttempted = true;
      sr.loading = true;
      refs.routeMount.innerHTML = `${createSectionHeader('Reminders', 'Guest reminders', 'Nudge people who asked for your offer but have not used it yet.', '')}<section class="pp-card"><p class="pp-muted-copy">Loading…</p></section>`;
      try {
        const data = await dataAdapter.getEligibleReminders(state.storeId);
        sr.items = Array.isArray(data.items) ? data.items : [];
        sr.eligibleCount = Number(data.count) || sr.items.length;
      } catch (_e) {
        sr.error = 'We could not load your guest list. Try again in a moment.';
        sr.items = [];
        sr.eligibleCount = 0;
      }
      sr.loading = false;
    }

    const previewLines = [
      `Hi {name},`,
      `This is ${profile.restaurantName || 'the restaurant'} — your offer is still waiting for you.`,
      `Show this email (or your code) when you visit. See you soon!`,
    ];

    let body = '';
    if (sr.step === 1) {
      body = `
        <section class="pp-card pp-reminder-step">
          <h3>Who will get this?</h3>
          <p class="pp-muted-copy">Only guests who left an email when they claimed your offer, and have not redeemed yet.</p>
          ${sr.error ? `
            <p class="pp-cb-error">${escapeHtml(sr.error)}</p>
            <button type="button" class="pp-secondary-btn" data-sr-action="home">Back to Home</button>
          ` : sr.eligibleCount === 0 ? `
            <p class="pp-muted-copy">No one is waiting for a reminder right now. When guests redeem with email, they will appear here.</p>
            <button type="button" class="pp-secondary-btn" data-sr-action="home">Back to Home</button>
          ` : `
            <p><strong>${sr.eligibleCount}</strong> guest${sr.eligibleCount === 1 ? '' : 's'} ready for a reminder.</p>
            <ul class="pp-reminder-guest-list">
              ${sr.items.slice(0, 12).map((row) => `<li><span>${escapeHtml(row.name || 'Guest')}</span> · ${escapeHtml(row.email || 'email on file')}</li>`).join('')}
              ${sr.items.length > 12 ? `<li class="pp-muted-copy">…and ${sr.items.length - 12} more</li>` : ''}
            </ul>
            <div class="pp-inline-actions">
              <button type="button" class="pp-primary-btn" data-sr-action="next">Continue</button>
              <button type="button" class="pp-secondary-btn" data-sr-action="home">Cancel</button>
            </div>
          `}
        </section>`;
    } else if (sr.step === 2) {
      body = `
        <section class="pp-card pp-reminder-step">
          <h3>Message preview</h3>
          <p class="pp-muted-copy">We send a short, friendly email from your brand. You do not need to write anything.</p>
          <div class="pp-reminder-preview-box">${previewLines.map((l) => `<p>${escapeHtml(l)}</p>`).join('')}</div>
          <div class="pp-inline-actions">
            <button type="button" class="pp-secondary-btn" data-sr-action="back">Back</button>
            <button type="button" class="pp-primary-btn" data-sr-action="next">Looks good</button>
          </div>
        </section>`;
    } else {
      const outcomeBlock = sr.sendResult
        ? `${sr.sendResult.error
          ? '<p class="pp-cb-error">We could not send reminders. Check your connection and try again.</p>'
          : `<p class="pp-success-inline">Sent <strong>${sr.sendResult.sent || 0}</strong> reminder(s).</p>`}
          <button type="button" class="pp-primary-btn" data-sr-action="home">Done</button>`
        : '';
      body = `
        <section class="pp-card pp-reminder-step">
          <h3>Send reminders</h3>
          ${sr.sendResult ? outcomeBlock : `
            <p>We will email up to <strong>${sr.eligibleCount}</strong> guest(s). This may take a few seconds.</p>
            <div class="pp-inline-actions">
              <button type="button" class="pp-secondary-btn" data-sr-action="back">Back</button>
              <button type="button" class="pp-primary-btn" data-sr-action="send" ${sr.sending ? 'disabled' : ''}>${sr.sending ? 'Sending…' : 'Send reminders'}</button>
            </div>
          `}
        </section>`;
    }

    refs.routeMount.innerHTML = `
      ${createSectionHeader('Reminders', 'Guest reminders', 'Three quick steps — we keep it simple.', '<button type="button" class="pp-secondary-btn" data-sr-action="home">← Home</button>')}
      <div class="pp-reminder-progress">
        <span class="${sr.step >= 1 ? 'active' : ''}">1. Who</span>
        <span class="${sr.step >= 2 ? 'active' : ''}">2. Preview</span>
        <span class="${sr.step >= 3 ? 'active' : ''}">3. Send</span>
      </div>
      ${body}
    `;

    refs.routeMount.querySelectorAll('[data-sr-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const act = btn.dataset.srAction;
        if (act === 'home') navigate('home');
        else if (act === 'back') { sr.step = Math.max(1, sr.step - 1); await renderSmartRemindersRoute(); }
        else if (act === 'next') { sr.step = Math.min(3, sr.step + 1); await renderSmartRemindersRoute(); }
        else if (act === 'send') {
          sr.sending = true;
          await renderSmartRemindersRoute();
          try {
            const res = await dataAdapter.sendReminderBatch(state.storeId);
            sr.sendResult = { sent: res.sent || 0, mode: res.mode };
            trackFlowCompleted('reminders_sent', { sent: sr.sendResult.sent });
          } catch (_e) {
            sr.sendResult = { sent: 0, error: true };
          }
          sr.sending = false;
          sr.step = 3;
          await renderSmartRemindersRoute();
        }
      });
    });
  }

  function renderReelGuideRoute() {
    const cuisine = asString(state.profile?.cuisineType, 'great food').replace(/_/g, ' ');
    refs.routeMount.innerHTML = `
      ${createSectionHeader('Reel', '7-second reel guide', 'Film on your phone — we give the beats. Posting to Instagram is one tap from their app.', '<button type="button" class="pp-secondary-btn" data-reel-back>← Home</button>')}
      <section class="pp-card pp-reel-guide">
        <h3>Your shot list</h3>
        <ol class="pp-reel-shot-list">
          <li><strong>0–2s — Hook.</strong> Close-up of steam or sizzle. Text on screen (you type in Instagram): "POV: ${escapeHtml(cuisine)} in [your city]"</li>
          <li><strong>2–5s — Hero.</strong> One plated dish or pour. Natural light by a window works best.</li>
          <li><strong>5–7s — CTA.</strong> You smiling at camera or pan to "Open now" sign / QR stand.</li>
        </ol>
        <h3>Sound</h3>
        <p class="pp-muted-copy">Pick a trending audio in Instagram — that helps local discovery. Stay on-brand; avoid copyrighted music you do not have rights to.</p>
        <div class="pp-inline-actions">
          <button type="button" class="pp-primary-btn" data-reel-create-campaign>New campaign first</button>
          <a class="pp-secondary-btn" href="https://www.instagram.com/reels/create/" target="_blank" rel="noopener noreferrer">Open Instagram Reels</a>
        </div>
        <p class="pp-muted-copy pp-reel-footnote">We do not post for you yet — you stay in control. After your poster is ready, download it and use it as a cover or cut-in.</p>
      </section>
    `;
    refs.routeMount.querySelector('[data-reel-back]')?.addEventListener('click', () => navigate('home'));
    refs.routeMount.querySelector('[data-reel-create-campaign]')?.addEventListener('click', () => {
      resetCampaignBuilder();
      applySmartActionToCampaignBuilder({ targetRoute: 'create', intent: 'dish', metadata: {} });
      state.campaignBuilder.intent = 'dish';
      state.campaignBuilder.step = 1;
      navigate('create-campaign');
    });
  }

  async function renderHomeRoute() {
    state.growthHub = await dataAdapter.getGrowthHubData({ storeId: state.storeId });
    const profile = state.growthHub?.profile || state.profile || {};
    const liveCampaigns = Array.isArray(state.growthHub?.liveCampaigns) ? state.growthHub.liveCampaigns : [];
    const hasAnalyticsData = liveCampaigns.length > 0;
    const toneLabel = asString(profile.brandTone, 'Not set').replaceAll('_', ' ');
    const restaurantName = asString(profile.restaurantName, 'Your Restaurant');
    const restaurantLocation = asString(profile.restaurantLocation, 'Primary location');
    const cuisineLabel = asString(profile.cuisineType, 'Not set').replaceAll('_', ' ');
    const businessTypeLabel = asString(profile.businessType, 'Not set').replaceAll('_', ' ');
    const profileLastUpdated = formatLastUpdated(profile.updatedAt || new Date().toISOString());

    const highLevelCards = hasAnalyticsData
      ? [
          {
            label: 'Live now',
            value: String(liveCampaigns.length),
            note: 'Offers collecting scans and redemptions',
          },
          {
            label: 'Customers gained',
            value: String(liveCampaigns.reduce((sum, row) => sum + asNumber(row.customersGained), 0)),
            note: 'From active campaigns',
          },
          {
            label: 'Engagement lift',
            value: `${Math.round(liveCampaigns.reduce((sum, row) => sum + asNumber(row.engagementLift), 0) / Math.max(1, liveCampaigns.length))}%`,
            note: 'Average across live offers',
          },
          {
            label: 'Revenue impact',
            value: money(liveCampaigns.reduce((sum, row) => sum + asNumber(row.revenueImpact), 0)),
            note: 'Estimated influenced revenue',
          },
        ]
      : [];

    let topPerformerLine = 'No live offers yet—start one to see a top performer here.';
    if (liveCampaigns.length) {
      const sorted = [...liveCampaigns].sort((a, b) => asNumber(b.revenueImpact) - asNumber(a.revenueImpact));
      const top = sorted[0];
      topPerformerLine = `${escapeHtml(top.title)} · ${escapeHtml(money(asNumber(top.revenueImpact)))} est. impact`;
    }

    let attentionLine = '';
    if (!liveCampaigns.length) {
      attentionLine = 'Add a live offer so guests have something to redeem. Open Live to execute, or Manage campaigns for the full list.';
    } else {
      const zeroGain = liveCampaigns.filter((c) => asNumber(c.customersGained) === 0).length;
      attentionLine = zeroGain > 0
        ? `${zeroGain} live offer(s) have not recorded customer gains yet—we will add sharper alerts when redemption data is fully wired.`
        : 'No urgent flags from current signals. Check Live for execution details.';
    }

    refs.routeMount.innerHTML = `
      ${createSectionHeader('Home', 'Business control center', 'Decisions and nudges live here. Execution is on Live; every draft and completed run is under Manage campaigns.', '<button class="pp-secondary-btn" type="button" data-open-create>New campaign</button>')}

      <section class="pp-agent-dashboard-hero">
        <article class="pp-card pp-agent-profile-card">
          <div class="pp-agent-profile-top">
            <div class="pp-agent-logo">
              ${profile.logoAsset
                ? `<img src="${escapeHtml(profile.logoAsset)}" alt="${escapeHtml(restaurantName)} logo" />`
                : escapeHtml(restaurantName.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase())}
            </div>
            <div>
              <p class="pp-card-kicker">Restaurant Profile</p>
              <h3>${escapeHtml(restaurantName)}</h3>
              <p class="pp-muted-copy">${escapeHtml(restaurantLocation)}</p>
            </div>
          </div>
          <div class="pp-agent-profile-meta">
            <span class="pp-card-chip">Tone: ${escapeHtml(toneLabel)}</span>
            <span class="pp-card-chip">Cuisine: ${escapeHtml(cuisineLabel)}</span>
            <span class="pp-card-chip">Type: ${escapeHtml(businessTypeLabel)}</span>
          </div>
        </article>
        <article class="pp-card pp-agent-analytics-card">
          <div class="pp-card-head compact">
            <p class="pp-card-kicker">Today at a glance</p>
            <span class="pp-muted-copy">Last updated ${escapeHtml(profileLastUpdated)}</span>
          </div>
          ${hasAnalyticsData ? `
            <div class="pp-grid pp-grid-4">
              ${highLevelCards.map((item) => `
                <div class="pp-agent-kpi">
                  <span class="pp-kpi-label">${escapeHtml(item.label)}</span>
                  <strong>${escapeHtml(item.value)}</strong>
                  <p>${escapeHtml(item.note)}</p>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="pp-agent-empty-analytics">
              <h3>No analytics yet</h3>
              <p>Publish a live offer. Once guests interact, we will summarize impact here.</p>
              <button class="pp-primary-btn pp-inline-btn" type="button" data-open-create>Start first campaign</button>
            </div>
          `}
        </article>
      </section>

      <section class="pp-card pp-home-today-snapshot">
        <div class="pp-card-head"><h3>Snapshot</h3></div>
        <p class="pp-home-snapshot-line"><strong>Top performer:</strong> ${topPerformerLine}</p>
        <p class="pp-home-snapshot-line pp-muted-copy"><strong>Needs attention:</strong> ${attentionLine}</p>
        <div class="pp-inline-actions pp-home-snapshot-actions">
          <button type="button" class="pp-primary-btn pp-inline-btn" data-route="live">Open Live</button>
          <button type="button" class="pp-secondary-btn pp-inline-btn" data-route="campaigns">Manage campaigns</button>
        </div>
      </section>

      ${FEATURE_FLAGS.menu_intelligence_v1 && (!Array.isArray(profile.menuItems) || profile.menuItems.length < 3) ? `
        <section class="pp-wizard-hero-card">
          <div class="pp-wizard-hero-content">
            <h3>Let's grow your store together</h3>
            <p>Upload your menu and we'll organize it for you. Tag your best sellers, tell us your rhythm — and every campaign after this will be smarter.</p>
            <div class="pp-inline-actions">
              <button class="pp-primary-btn" type="button" data-route="menu-import">Upload & Optimize Menu</button>
              <button class="pp-secondary-btn pp-inline-btn" type="button" data-open-menu-wizard>Quick Setup</button>
            </div>
          </div>
        </section>
      ` : (FEATURE_FLAGS.menu_intelligence_v1 ? `
        <section class="pp-wizard-hero-card compact">
          <div class="pp-wizard-hero-content">
            <p><strong>${(profile.menuItems || []).length} menu items loaded</strong> · <button class="pp-link-btn" type="button" data-open-menu-wizard>Update menu setup</button></p>
          </div>
        </section>
      ` : '')}

      <section class="pp-page-section">
        <div class="pp-card-head">
          <div>
            <p class="pp-card-kicker">Recommended Next Steps</p>
            <h3>Smart Actions</h3>
          </div>
        </div>
        <div class="pp-grid pp-grid-3">
          ${state.growthHub.smartActions.map((action, index) => renderSmartActionCard(action, index)).join('')}
        </div>
        <p class="pp-smart-actions-meta">${escapeHtml(state.growthHub.smartActionsMeta?.windowLabel || 'Tips update as you add menu items and campaigns.')}</p>
      </section>

      <section class="pp-page-section">
        <div class="pp-card-head"><h3>Quick Actions</h3></div>
        <div class="pp-grid pp-grid-3">
          ${state.growthHub.quickActions.map((quick) => `
            <button class="pp-card pp-quick-action-card" type="button" data-action='${escapeHtml(JSON.stringify(quick.action))}'>
              <span class="pp-nav-icon">${escapeHtml(quick.icon)}</span>
              <strong>${escapeHtml(quick.title)}</strong>
            </button>
          `).join('')}
        </div>
      </section>

      <section class="pp-page-section">
        <div class="pp-card-head"><h3>Learning feed</h3></div>
        <div class="pp-card-stack">
          ${state.growthHub.learningFeed.map((insight) => `
            <div class="pp-insight-card">
              <strong>${escapeHtml(insight.title)}</strong>
              <p>${escapeHtml(insight.detail)}</p>
            </div>
          `).join('')}
        </div>
      </section>
    `;

    state.profile = state.growthHub.profile || state.profile;

    refs.routeMount.querySelectorAll('[data-open-create]').forEach((node) => {
      node.addEventListener('click', () => { resetCampaignBuilder(); navigate('create-campaign'); });
    });
    refs.routeMount.querySelectorAll('[data-open-menu-wizard]').forEach((node) => {
      node.addEventListener('click', () => openMenuWizard());
    });
    refs.routeMount.querySelectorAll('[data-route="menu-import"]').forEach((button) => {
      button.addEventListener('click', () => navigate('menu-import'));
    });
    refs.routeMount.querySelectorAll('[data-route="live"]').forEach((button) => {
      button.addEventListener('click', () => navigate('live'));
    });
    refs.routeMount.querySelectorAll('[data-route="campaigns"]').forEach((button) => {
      button.addEventListener('click', () => navigate('campaigns'));
    });
    bindActionButtons();

    requestAnimationFrame(() => {
      refs.routeMount.querySelectorAll('[data-smart-action-id]').forEach((el) => {
        const id = el.getAttribute('data-smart-action-id');
        if (!id) return;
        const obs = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              trackSmartActionImpression(id);
              obs.disconnect();
            }
          });
        }, { threshold: 0.4 });
        obs.observe(el);
      });
    });
  }

  function filterCampaignItemsBySearch(items, rawQuery) {
    const q = asString(rawQuery, '').toLowerCase().trim();
    if (!q) return items;
    return items.filter((c) => {
      const hay = [c.title, c.goal, c.offerValue, c.headline, ...(Array.isArray(c.channels) ? c.channels : [])]
        .map((x) => String(x).toLowerCase()).join(' ');
      return hay.includes(q);
    });
  }

  function remountCampaignCardsOnly() {
    if (state.route !== 'campaigns') return;
    const grid = refs.routeMount.querySelector('#ppCampaignsGrid');
    if (!grid || !Array.isArray(state.campaigns?.items)) return;
    const q = state.campaignListSearch.trim();
    const filtered = filterCampaignItemsBySearch(state.campaigns.items, q);
    if (!filtered.length && q) {
      grid.innerHTML = emptyState('No matches', 'Try a different search term.', '', null);
    } else if (!filtered.length) {
      grid.innerHTML = emptyState('No campaigns in this status', 'Start a new campaign to build repeat demand.', 'New campaign', { targetRoute: 'create', intent: 'create_campaign', metadata: { mode: 'offer' } });
    } else {
      grid.innerHTML = filtered.map(renderCampaignCard).join('');
    }
    bindActionButtons();
    bindCampaignCardButtons();
  }

  function remountLiveCardsOnly() {
    if (state.route !== 'live') return;
    const grid = refs.routeMount.querySelector('#ppLiveGrid');
    if (!grid || !Array.isArray(state.livePageItems)) return;
    const q = state.liveListSearch.trim();
    const filtered = filterCampaignItemsBySearch(state.livePageItems, q);
    const feed = state.liveLearningFeed || [];
    const defaultInsight = 'Keep QR and counter cards visible during peak hours to lift redemptions.';
    if (!filtered.length && q) {
      grid.innerHTML = emptyState('No matches', 'Try a different search term.', '', null);
    } else if (!filtered.length) {
      grid.innerHTML = `
        <section class="pp-card pp-empty-state" role="status">
          <h3>No live campaigns</h3>
          <p>Nothing is active right now. Start a new offer or open Manage campaigns for drafts and scheduled.</p>
          <div class="pp-inline-actions">
            <button class="pp-primary-btn pp-inline-btn" type="button" data-open-create>New campaign</button>
            <button class="pp-secondary-btn pp-inline-btn" type="button" data-route-nav="campaigns">Manage campaigns</button>
          </div>
        </section>`;
    } else {
      grid.innerHTML = filtered.map((c, i) => {
        const ins = feed.length ? feed[i % feed.length].detail : defaultInsight;
        return renderLiveExecutionCard(c, ins);
      }).join('');
    }
    refs.routeMount.querySelector('[data-open-create]')?.addEventListener('click', () => { resetCampaignBuilder(); navigate('create-campaign'); });
    refs.routeMount.querySelectorAll('[data-route-nav]').forEach((btn) => {
      btn.addEventListener('click', () => navigate(btn.dataset.routeNav));
    });
    bindActionButtons();
    bindCampaignCardButtons();
  }

  async function renderLiveRoute() {
    const [listData, hub] = await Promise.all([
      dataAdapter.getCampaignList({ storeId: state.storeId, status: 'active' }),
      dataAdapter.getGrowthHubData({ storeId: state.storeId }),
    ]);
    state.growthHub = hub;
    state.profile = hub.profile || state.profile;
    state.livePageItems = Array.isArray(listData.items) ? listData.items : [];
    state.liveLearningFeed = Array.isArray(hub.learningFeed) ? hub.learningFeed : [];
    const feed = state.liveLearningFeed;
    const defaultInsight = 'Keep QR and counter cards visible during peak hours to lift redemptions.';
    const q = state.liveListSearch.trim();
    const filtered = filterCampaignItemsBySearch(state.livePageItems, q);
    let gridInner = '';
    if (!filtered.length && q) {
      gridInner = emptyState('No matches', 'Try a different search term.', '', null);
    } else if (!filtered.length) {
      gridInner = `
        <section class="pp-card pp-empty-state" role="status">
          <h3>No live campaigns</h3>
          <p>Nothing is active right now. Start a new offer or open Manage campaigns for drafts and scheduled.</p>
          <div class="pp-inline-actions">
            <button class="pp-primary-btn pp-inline-btn" type="button" data-open-create>New campaign</button>
            <button class="pp-secondary-btn pp-inline-btn" type="button" data-route-nav="campaigns">Manage campaigns</button>
          </div>
        </section>`;
    } else {
      gridInner = filtered.map((c, i) => {
        const ins = feed.length ? feed[i % feed.length].detail : defaultInsight;
        return renderLiveExecutionCard(c, ins);
      }).join('');
    }

    refs.routeMount.innerHTML = `
      ${createSectionHeader('Live', 'What\'s running now', 'Act on live offers—boost, improve, or pause. For drafts, scheduled, and history, use Manage campaigns.', '<button class="pp-secondary-btn" type="button" data-route-nav="campaigns">Manage campaigns</button>')}
      <section id="ppLiveGrid" class="pp-live-grid">
        ${gridInner}
      </section>
    `;
    refs.routeMount.querySelector('[data-open-create]')?.addEventListener('click', () => { resetCampaignBuilder(); navigate('create-campaign'); });
    refs.routeMount.querySelectorAll('[data-route-nav]').forEach((btn) => {
      btn.addEventListener('click', () => navigate(btn.dataset.routeNav));
    });
    bindActionButtons();
    bindCampaignCardButtons();
  }

  async function renderCampaignsRoute() {
    const status = asString(state.routeParams.status, state.campaigns.status || 'active').toLowerCase();
    state.campaigns = await dataAdapter.getCampaignList({ storeId: state.storeId, status: status === 'drafts' ? 'draft' : status });

    const totals = state.campaigns.totals;
    const q = state.campaignListSearch.trim();
    const filtered = filterCampaignItemsBySearch(state.campaigns.items, q);
    let gridInner = '';
    if (!filtered.length && q) {
      gridInner = emptyState('No matches', 'Try a different search term.', '', null);
    } else if (!filtered.length) {
      gridInner = emptyState('No campaigns in this status', 'Start a new campaign to build repeat demand.', 'New campaign', { targetRoute: 'create', intent: 'create_campaign', metadata: { mode: 'offer' } });
    } else {
      gridInner = filtered.map(renderCampaignCard).join('');
    }

    refs.routeMount.innerHTML = `
      ${createSectionHeader('Manage campaigns', 'All your campaigns', 'Organize and manage every status—active, scheduled, drafts, and completed. Live is for what\'s on air right now.', '<button class="pp-secondary-btn" type="button" data-open-create>New campaign</button>')}
      <section class="pp-grid pp-grid-4">
        <article class="pp-card pp-kpi-card"><span class="pp-kpi-label">Active</span><strong>${escapeHtml(String(totals.active || 0))}</strong><p>Live now</p></article>
        <article class="pp-card pp-kpi-card"><span class="pp-kpi-label">Scheduled</span><strong>${escapeHtml(String(totals.scheduled || 0))}</strong><p>Queued next</p></article>
        <article class="pp-card pp-kpi-card"><span class="pp-kpi-label">Drafts</span><strong>${escapeHtml(String(totals.drafts || 0))}</strong><p>Not published</p></article>
        <article class="pp-card pp-kpi-card"><span class="pp-kpi-label">Completed</span><strong>${escapeHtml(String(totals.completed || 0))}</strong><p>Finished runs</p></article>
      </section>

      <section class="pp-tab-row">
        ${CAMPAIGN_STATUSES.map((tab) => {
          const key = tab === 'drafts' ? 'drafts' : tab;
          const total = totals[tab === 'drafts' ? 'drafts' : tab] || 0;
          const active = (tab === 'drafts' ? 'draft' : tab) === state.campaigns.status;
          return `<button class="pp-tab-btn${active ? ' active' : ''}" type="button" data-campaign-status="${tab}">${tab} <span>${total}</span></button>`;
        }).join('')}
      </section>

      <section id="ppCampaignsGrid" class="pp-grid pp-grid-2">
        ${gridInner}
      </section>
    `;

    refs.routeMount.querySelector('[data-open-create]')?.addEventListener('click', () => { resetCampaignBuilder(); navigate('create-campaign'); });
    refs.routeMount.querySelectorAll('[data-campaign-status]').forEach((button) => {
      button.addEventListener('click', () => {
        const raw = button.dataset.campaignStatus;
        const mapped = raw === 'drafts' ? 'draft' : raw;
        navigate('campaigns', { status: mapped });
      });
    });

    bindActionButtons();
    bindCampaignCardButtons();
  }

  async function renderCampaignDetailRoute() {
    const campaignId = asString(state.routeParams.campaignId);
    state.campaignDetail = await dataAdapter.getCampaignDetail(campaignId, { storeId: state.storeId });

    const detail = state.campaignDetail;
    const tab = state.campaignDetailTab;
    const tabButtons = ['overview', 'content', 'performance'].map((name) => (
      `<button type="button" class="pp-tab-btn${tab === name ? ' active' : ''}" data-campaign-detail-tab="${name}">${name}</button>`
    )).join('');

    let tabBody = '';
    if (tab === 'overview') {
      tabBody = `
        <section class="pp-grid pp-grid-2">
          <article class="pp-card">
            <h3>${escapeHtml(detail.title)}</h3>
            <p class="pp-muted-copy">${escapeHtml(detail.goal)}</p>
            <p><strong>Status:</strong> ${escapeHtml(detail.status)}</p>
            <p><strong>Duration:</strong> ${escapeHtml(detail.dateRange)}</p>
            <p><strong>Channels:</strong> ${escapeHtml(detail.channels.join(', '))}</p>
            <p><strong>Main Offer:</strong> ${escapeHtml(detail.offerValue)}</p>
          </article>
          <article class="pp-card pp-highlight-panel">
            <strong>Primary Action</strong>
            <p>Keep this campaign running and publish a supporting reel variant.</p>
            <div class="pp-inline-actions">
              <button type="button" class="pp-primary-btn pp-inline-btn" data-action='${escapeHtml(JSON.stringify({ targetRoute: 'create', intent: 'improve_campaign', metadata: { mode: 'offer', sourceCampaignId: detail.id } }))}'>Improve in builder</button>
            </div>
          </article>
        </section>
      `;
    } else if (tab === 'content') {
      tabBody = `
        <section class="pp-grid pp-grid-3">
          ${detail.assets.map((asset) => `
            <article class="pp-card">
              <p class="pp-card-kicker">${escapeHtml(asset.type)}</p>
              <h3>${escapeHtml(asset.title)}</h3>
              <p>${escapeHtml(asset.body)}</p>
              <span class="pp-status-badge pending">${escapeHtml(asset.status)}</span>
              <div class="pp-inline-actions">
                <button class="pp-secondary-btn pp-inline-btn" type="button" disabled>Regenerate (soon)</button>
                <button class="pp-secondary-btn pp-inline-btn" type="button" disabled>Edit (soon)</button>
              </div>
            </article>
          `).join('')}
        </section>
      `;
    } else {
      tabBody = `
        <section class="pp-grid pp-grid-4">
          <article class="pp-card"><span class="pp-kpi-label">Customers Gained</span><strong>${escapeHtml(String(detail.performanceSummary.customersGained))}</strong></article>
          <article class="pp-card"><span class="pp-kpi-label">Engagement Lift</span><strong>${escapeHtml(detail.performanceSummary.engagementLift)}</strong></article>
          <article class="pp-card"><span class="pp-kpi-label">Revenue Impact</span><strong>${escapeHtml(detail.performanceSummary.revenueImpact)}</strong></article>
          <article class="pp-card"><span class="pp-kpi-label">Best Channel</span><strong>${escapeHtml(detail.performanceSummary.bestChannel)}</strong></article>
        </section>
        <section class="pp-grid pp-grid-2">
          <article class="pp-card">
            <h3>What worked</h3>
            <p>${escapeHtml(detail.performanceSummary.whatWorked)}</p>
          </article>
          <article class="pp-card">
            <h3>What to improve</h3>
            <p>${escapeHtml(detail.performanceSummary.whatToImprove)}</p>
          </article>
        </section>
      `;
    }

    refs.routeMount.innerHTML = `
      ${createSectionHeader('Manage campaigns / Detail', detail.title, 'Understand performance and take the next best action.', '<button class="pp-secondary-btn" type="button" data-route="campaigns">Back to Manage campaigns</button>')}
      <section class="pp-tab-row">${tabButtons}</section>
      ${tabBody}
      <section class="pp-inline-actions pp-route-actions-row">
        <button type="button" class="pp-primary-btn pp-inline-btn" data-action='${escapeHtml(JSON.stringify(detail.actions[0]))}'>Run again</button>
        <button type="button" class="pp-secondary-btn pp-inline-btn" data-action='${escapeHtml(JSON.stringify(detail.actions[1]))}'>Improve in builder</button>
        <button type="button" class="pp-secondary-btn pp-inline-btn" data-action='${escapeHtml(JSON.stringify(detail.actions[2]))}'>Open Content Studio</button>
      </section>
      <p class="pp-muted-copy pp-detail-action-hint">Run again and Improve open the campaign builder with this offer prefilled. Content Studio is for posts, reels, and reusable assets.</p>
    `;

    refs.routeMount.querySelectorAll('[data-route="campaigns"]').forEach((button) => {
      button.addEventListener('click', () => navigate('campaigns'));
    });
    refs.routeMount.querySelectorAll('[data-campaign-detail-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        state.campaignDetailTab = asString(button.dataset.campaignDetailTab, 'overview');
        refreshRoute();
      });
    });
    bindActionButtons();
    renderSidebarActive();
  }

  async function renderContentStudioRoute() {
    const tab = asString(state.routeParams.tab, state.contentStudio.tab || 'posts').toLowerCase();
    state.contentStudio = await dataAdapter.getContentStudioAssets(tab);

    refs.routeMount.innerHTML = `
      ${createSectionHeader('Content Studio', 'Content Studio', 'Reuse and optimize generated assets—separate from the campaign builder.', '<button class="pp-primary-btn" type="button" data-open-create>New asset</button>')}
      <section class="pp-tab-row">
        ${CONTENT_TABS.map((name) => (`<button class="pp-tab-btn${state.contentStudio.tab === name ? ' active' : ''}" type="button" data-content-tab="${name}">${name}</button>`)).join('')}
      </section>
      <section class="pp-grid pp-grid-3">
        ${state.contentStudio.items.length
          ? state.contentStudio.items.map((asset) => `
            <article class="pp-card">
              <div class="pp-content-preview">${escapeHtml(asset.previewLabel)}</div>
              <h3>${escapeHtml(asset.title)}</h3>
              <p class="pp-muted-copy">${escapeHtml(asset.date)} · ${escapeHtml(asset.status)}</p>
              <div class="pp-inline-actions">
                <button class="pp-secondary-btn pp-inline-btn" type="button" disabled>View (soon)</button>
                <button class="pp-secondary-btn pp-inline-btn" type="button" disabled>Reuse (soon)</button>
                <button class="pp-secondary-btn pp-inline-btn" type="button" disabled>Edit (soon)</button>
                <button class="pp-secondary-btn pp-inline-btn" type="button" disabled>Duplicate (soon)</button>
              </div>
            </article>
          `).join('')
          : emptyState('No assets yet', 'Generate your first asset using guided creation.', 'New asset', { targetRoute: 'create', intent: 'create_asset', metadata: { mode: 'post' } })}
      </section>
    `;

    refs.routeMount.querySelector('[data-open-create]')?.addEventListener('click', () => { resetCampaignBuilder(); navigate('create-campaign'); });
    refs.routeMount.querySelectorAll('[data-content-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        navigate('content-studio', { tab: button.dataset.contentTab });
      });
    });
    bindActionButtons();
  }

  async function renderCreateRoute() {
    refs.routeMount.innerHTML = `
      ${createSectionHeader('New campaign', 'New campaign', 'Same guided flow as the sidebar and top bar—publish an offer fast.', '<button class="pp-primary-btn" type="button" data-open-create>Open builder</button>')}
      <section class="pp-card pp-create-route-cta">
        <h3>4-Step Offer Flow</h3>
        <p>Intent → Offer Basics + Schedule → Poster Design → Preview + Publish.</p>
        <div class="pp-inline-actions">
          <button type="button" class="pp-primary-btn pp-inline-btn" data-open-create-mode="offer">Start in builder</button>
        </div>
      </section>
    `;

    refs.routeMount.querySelector('[data-open-create]')?.addEventListener('click', () => { resetCampaignBuilder(); navigate('create-campaign'); });
    refs.routeMount.querySelectorAll('[data-open-create-mode]').forEach((button) => {
      button.addEventListener('click', () => { resetCampaignBuilder(); navigate('create-campaign'); });
    });
  }

  async function renderAnalyticsRoute() {
    const offerId = asString(state.routeParams.offerId);
    state.analytics = await dataAdapter.getAnalyticsStoryData({ storeId: state.storeId, offerId });
    const analyticsUpdatedAt = formatLastUpdated(new Date().toISOString());
    refs.routeMount.innerHTML = `
      ${createSectionHeader('Analytics', 'Analytics', 'Simple performance stories that lead to action.', `<span class="pp-muted-copy">Last updated ${escapeHtml(analyticsUpdatedAt)}</span>`)}
      ${offerId ? `
        <section class="pp-card pp-state-card">
          <h3>Filtered to one offer</h3>
          <p>Showing analytics focused on the selected offer.</p>
        </section>
      ` : ''}
      <section class="pp-grid pp-grid-4">
        ${state.analytics.summaryCards.map((card) => `
          <article class="pp-card pp-kpi-card">
            <span class="pp-kpi-label">${escapeHtml(card.title)}</span>
            <strong>${escapeHtml(card.value)}</strong>
            <p>${escapeHtml(card.explanation)}</p>
          </article>
        `).join('')}
      </section>

      <section class="pp-grid pp-grid-2">
        <article class="pp-card">
          <div class="pp-card-head"><h3>What worked</h3></div>
          <div class="pp-card-stack">
            ${state.analytics.whatWorked.map((item) => `<div class="pp-insight-card"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p></div>`).join('')}
          </div>
        </article>

        <article class="pp-card">
          <div class="pp-card-head"><h3>What to improve</h3></div>
          <div class="pp-card-stack">
            ${state.analytics.whatToImprove.map((item) => `<div class="pp-insight-card"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p></div>`).join('')}
          </div>
        </article>
      </section>

      <section class="pp-page-section">
        <div class="pp-card-head"><h3>Recommended Next Actions</h3></div>
        <div class="pp-grid pp-grid-3">${state.analytics.nextActions.map((action, index) => renderSmartActionCard(action, index)).join('')}</div>
      </section>
    `;

    bindActionButtons();
  }

  const MENU_SETTINGS_CATEGORY_LABELS = {
    starter: 'Starters',
    main: 'Mains',
    drink: 'Drinks',
    dessert: 'Desserts',
    other: 'Other',
  };
  const MENU_SETTINGS_CATEGORY_ORDER = ['starter', 'main', 'drink', 'dessert', 'other'];

  function groupMenuItemsForSettings(items = []) {
    const bucket = { starter: [], main: [], drink: [], dessert: [], other: [] };
    items.forEach((item, index) => {
      const raw = asString(item.category, 'main').toLowerCase();
      const key = ['starter', 'main', 'drink', 'dessert'].includes(raw) ? raw : 'other';
      bucket[key].push({ item, index });
    });
    return MENU_SETTINGS_CATEGORY_ORDER.filter((k) => bucket[k].length).map((key) => ({
      key,
      label: MENU_SETTINGS_CATEGORY_LABELS[key],
      rows: bucket[key],
    }));
  }

  function renderMenuItemCompactRow(item, index, expandedIndex) {
    const isOpen = expandedIndex === index;
    const displayName = asString(item.name, '') || 'Untitled item';
    const st = asString(item.status, 'regular').replaceAll('_', ' ');
    const cat = asString(item.category, 'main');
    const imgLabel = item.imageAssetId ? 'Image' : 'No image';
    return `
      <div class="pp-menu-item-compact" data-menu-row="${escapeHtml(String(index))}">
        <div class="pp-menu-item-compact-head">
          <div class="pp-menu-item-compact-summary">
            <div class="pp-menu-item-title">${escapeHtml(displayName)}</div>
            <div class="pp-menu-item-meta" aria-hidden="true">
              <span class="pp-menu-pill">${escapeHtml(st)}</span>
              <span class="pp-menu-pill muted">${escapeHtml(cat)}</span>
              <span class="pp-menu-pill muted">${escapeHtml(imgLabel)}</span>
            </div>
          </div>
          <div class="pp-menu-item-compact-actions">
            <button type="button" class="pp-secondary-btn pp-inline-btn" data-menu-toggle-expand="${index}" aria-expanded="${isOpen ? 'true' : 'false'}">${isOpen ? 'Collapse' : 'Edit'}</button>
            <button type="button" class="pp-secondary-btn pp-inline-btn" data-menu-remove="${index}">Remove</button>
          </div>
        </div>
        ${isOpen ? `<div class="pp-menu-item-compact-body">${renderMenuItemFieldBlock(item, index, { compactBody: true })}</div>` : ''}
      </div>`;
  }

  function renderMenuItemFieldBlock(item, index, opts = {}) {
    const compactBody = Boolean(opts.compactBody);
    const idx = escapeHtml(String(index));
    const removeBtn = compactBody
      ? ''
      : `<button type="button" class="pp-secondary-btn pp-inline-btn" data-menu-remove="${idx}">Remove</button>`;
    return `
        <label>Item Name<input type="text" data-menu-field="name" data-menu-index="${idx}" value="${escapeHtml(item.name || '')}" /></label>
        <label>Status
          <select class="pp-select" data-menu-field="status" data-menu-index="${idx}">
            ${['best_seller', 'slow_mover', 'regular'].map((value) => `<option value="${value}" ${item.status === value ? 'selected' : ''}>${value.replaceAll('_', ' ')}</option>`).join('')}
          </select>
        </label>
        <label>Category
          <select class="pp-select" data-menu-field="category" data-menu-index="${idx}">
            ${['starter', 'main', 'drink', 'dessert'].map((value) => `<option value="${value}" ${item.category === value ? 'selected' : ''}>${value}</option>`).join('')}
          </select>
        </label>
        <label>Margin Band
          <select class="pp-select" data-menu-field="marginBand" data-menu-index="${idx}">
            ${['', 'high', 'medium', 'low'].map((value) => `<option value="${value}" ${item.marginBand === value ? 'selected' : ''}>${value || 'not set'}</option>`).join('')}
          </select>
        </label>
        <label>Note<input type="text" data-menu-field="note" data-menu-index="${idx}" value="${escapeHtml(item.note || '')}" placeholder="Optional context" /></label>
        <div class="pp-inline-actions">
          <label class="pp-secondary-btn pp-inline-btn" for="menuImageUpload_${idx}">Upload Item Image</label>
          <input id="menuImageUpload_${idx}" data-menu-image-index="${idx}" type="file" accept="image/*" class="hidden" />
          ${item.imageAssetId ? `<span class="pp-card-chip accent">image added</span>` : '<span class="pp-muted-copy">no image</span>'}
          ${removeBtn}
        </div>
    `;
  }

  function renderMenuItemsEditor(items = [], options = {}) {
    const ctx = asString(options.context, '');
    const variant = asString(options.variant, 'full');
    const expandedIndex = options.expandedIndex;

    if (!items.length) {
      const emptyCopy =
        ctx === 'settings'
          ? 'No menu items yet. Use + Add Item or open the Menu Setup Wizard to build your list.'
          : 'No menu items yet. Use the import options above to add your menu.';
      return `<div class="pp-empty-inline">${escapeHtml(emptyCopy)}</div>`;
    }

    if (variant === 'compact' && ctx === 'settings') {
      const groups = Array.isArray(options.menuGroups)
        ? options.menuGroups
        : groupMenuItemsForSettings(items);
      const sections = groups
        .map(
          (g) => `
      <details class="pp-menu-settings-section" id="settings-menu-section-${escapeHtml(g.key)}" open>
        <summary class="pp-menu-settings-section-summary">
          <span class="pp-menu-settings-section-title">${escapeHtml(g.label)}</span>
          <span class="pp-menu-settings-section-count">${g.rows.length}</span>
        </summary>
        <div class="pp-menu-settings-section-body">
          ${g.rows.map(({ item, index }) => renderMenuItemCompactRow(item, index, expandedIndex)).join('')}
        </div>
      </details>`
        )
        .join('');
      return `<div class="pp-menu-settings-sections">${sections}</div>`;
    }

    return items
      .map(
        (item, index) => `
      <div class="pp-menu-item-row" data-menu-row="${escapeHtml(String(index))}">
        ${renderMenuItemFieldBlock(item, index, { compactBody: false })}
      </div>
    `
      )
      .join('');
  }

  // ── Menu Onboarding Wizard ──────────────────────────────────────────

  function openMenuWizard() {
    state.menuWizard = {
      open: true,
      step: 1,
      extractedItems: [],
      confirmedItems: [],
      taggingPass: 'best_seller',
      peakHoursStart: '12 PM',
      peakHoursEnd: '2 PM',
      slowHoursStart: '2 PM',
      slowHoursEnd: '5 PM',
      busiestDays: [],
      primaryGoal: '',
      extractionStatus: '',
      saveStatus: '',
    };
    refs.wizardModal.classList.remove('hidden');
    refs.wizardModal.setAttribute('aria-hidden', 'false');
    renderMenuWizard();
  }

  function closeMenuWizard() {
    state.menuWizard.open = false;
    refs.wizardModal.classList.add('hidden');
    refs.wizardModal.setAttribute('aria-hidden', 'true');
  }

  function wizardProgressBar() {
    refs.wizardProgress.innerHTML = WIZARD_STEPS.map((label, index) => {
      const stepNum = index + 1;
      const isActive = stepNum === state.menuWizard.step;
      const isDone = stepNum < state.menuWizard.step;
      return `<span class="pp-wizard-step-pill${isActive ? ' active' : ''}${isDone ? ' done' : ''}">${stepNum}. ${escapeHtml(label)}</span>`;
    }).join('');
  }

  function wizardNextLabel() {
    const labels = ['Let\'s Do This', 'Next', 'Looks Good, Next', 'Next', 'Save & Finish', 'Close'];
    return labels[state.menuWizard.step - 1] || 'Next';
  }

  function renderWizardStep1() {
    return `
      <section class="pp-wizard-step-body">
        <div class="pp-wizard-welcome">
          <h2>Let's get to know your kitchen</h2>
          <p class="pp-wizard-subtitle">This takes about 2 minutes. After this, every campaign suggestion will be tailored to your actual menu, your best sellers, and your quiet hours.</p>
          <div class="pp-wizard-value-grid">
            <div class="pp-wizard-value-card">
              <span class="pp-wizard-value-icon">🎯</span>
              <strong>Know what to push</strong>
              <p>We'll learn which items fly off the shelf and which need a boost.</p>
            </div>
            <div class="pp-wizard-value-card">
              <span class="pp-wizard-value-icon">⏰</span>
              <strong>Perfect timing</strong>
              <p>Tell us your rush hours and slow hours — we'll time campaigns to hit hardest.</p>
            </div>
            <div class="pp-wizard-value-card">
              <span class="pp-wizard-value-icon">🤖</span>
              <strong>Smarter AI</strong>
              <p>Suggestions that actually understand your kitchen, not generic templates.</p>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderWizardStep2() {
    const status = state.menuWizard.extractionStatus;
    return `
      <section class="pp-wizard-step-body">
        <h2>Upload your menu</h2>
        <p class="pp-wizard-subtitle">Snap a photo of your physical menu — we'll read it and pull out all the items automatically.</p>
        <div class="pp-wizard-photo-tips">
          <div class="pp-wizard-tip"><strong>1. Lay it flat</strong><p>Shoot from directly above on a clean surface.</p></div>
          <div class="pp-wizard-tip"><strong>2. Good lighting</strong><p>Use daylight or a bright lamp. No shadows on the text.</p></div>
          <div class="pp-wizard-tip"><strong>3. Full page</strong><p>All edges visible. One page per photo.</p></div>
        </div>
        <div class="pp-wizard-upload-zone">
          <label class="pp-primary-btn pp-inline-btn" for="wizardMenuPhoto">Take Photo or Choose from Gallery</label>
          <input id="wizardMenuPhoto" type="file" accept="image/*" capture="environment" class="hidden" />
          ${status ? `<p class="pp-wizard-status">${escapeHtml(status)}</p>` : ''}
        </div>
        <div id="wizardPhotoPreview" class="pp-wizard-photo-preview hidden"></div>
        <details class="pp-wizard-alt-methods">
          <summary>Other ways to add your menu</summary>
          <div class="pp-wizard-alt-body">
            <label class="pp-wizard-alt-label">Paste items (one per line)
              <textarea id="wizardPasteInput" rows="4" placeholder="Butter Chicken\nGarlic Naan\nMango Lassi"></textarea>
            </label>
            <button type="button" id="wizardPasteBtn" class="pp-secondary-btn pp-inline-btn">Add Pasted Items</button>
            <div class="pp-wizard-alt-divider"></div>
            <div class="pp-inline-actions">
              <label class="pp-secondary-btn pp-inline-btn" for="wizardCsvUpload">Upload CSV</label>
              <input id="wizardCsvUpload" type="file" accept=".csv,text/csv" class="hidden" />
              <span id="wizardCsvStatus" class="pp-muted-copy"></span>
            </div>
          </div>
        </details>
      </section>
    `;
  }

  function renderWizardStep3() {
    const items = state.menuWizard.extractedItems;
    return `
      <section class="pp-wizard-step-body">
        <h2>We found ${items.length} item${items.length !== 1 ? 's' : ''} on your menu</h2>
        <p class="pp-wizard-subtitle">Uncheck anything that doesn't belong. Tap a name to fix it if we misread something.</p>
        <div class="pp-wizard-checklist">
          ${items.map((item, index) => `
            <div class="pp-wizard-check-row" data-wizard-item-index="${index}">
              <label class="pp-wizard-check-label">
                <input type="checkbox" data-wizard-check="${index}" ${item.confirmed !== false ? 'checked' : ''} />
                <input type="text" class="pp-wizard-item-name" data-wizard-name="${index}" value="${escapeHtml(item.name)}" />
              </label>
              <span class="pp-card-chip">${escapeHtml(item.category)}</span>
            </div>
          `).join('')}
        </div>
        ${!items.length ? '<p class="pp-wizard-empty">No items extracted yet. Go back and upload your menu.</p>' : ''}
      </section>
    `;
  }

  function renderWizardStep4() {
    const items = state.menuWizard.confirmedItems;
    const pass = state.menuWizard.taggingPass;
    const isBestPass = pass === 'best_seller';
    const categories = ['main', 'starter', 'drink', 'dessert'];
    const categoryLabels = { main: 'Mains', starter: 'Starters / Appetizers', drink: 'Drinks', dessert: 'Desserts' };
    const grouped = {};
    categories.forEach((cat) => { grouped[cat] = items.filter((item) => item.category === cat); });

    return `
      <section class="pp-wizard-step-body">
        <h2>${isBestPass ? 'Which items fly off the shelf?' : 'Which ones need a push?'}</h2>
        <p class="pp-wizard-subtitle">${isBestPass
          ? 'Tap your best sellers — the dishes people keep coming back for.'
          : 'Tap the slow movers — the ones you\'d love to sell more of.'}</p>
        <p class="pp-wizard-fun-copy">${isBestPass ? 'Every kitchen has heroes. Let\'s find yours.' : 'Every kitchen has underdogs. Let\'s give them a spotlight.'}</p>
        <div class="pp-wizard-tag-pass-indicator">
          <span class="pp-wizard-pass-pill${isBestPass ? ' active' : ' done'}">1. Best Sellers</span>
          <span class="pp-wizard-pass-pill${!isBestPass ? ' active' : ''}">2. Slow Movers</span>
        </div>
        ${categories.map((cat) => {
          if (!grouped[cat].length) return '';
          return `
            <div class="pp-wizard-category-group">
              <p class="pp-card-kicker">${escapeHtml(categoryLabels[cat])}</p>
              <div class="pp-wizard-tag-chips">
                ${grouped[cat].map((item) => {
                  const isTagged = isBestPass
                    ? item.status === 'best_seller'
                    : item.status === 'slow_mover';
                  const otherTag = isBestPass
                    ? item.status === 'slow_mover'
                    : item.status === 'best_seller';
                  return `<button type="button" class="pp-wizard-tag-chip${isTagged ? (isBestPass ? ' best' : ' slow') : ''}${otherTag ? ' disabled-tag' : ''}" data-wizard-tag="${escapeHtml(item.id)}" ${otherTag ? 'disabled' : ''}>${escapeHtml(item.name)}${isTagged ? (isBestPass ? ' ★' : ' ↓') : ''}</button>`;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
        ${isBestPass ? '<button type="button" id="wizardFinishBestPass" class="pp-primary-btn pp-inline-btn">Done with best sellers — show me slow movers</button>' : ''}
      </section>
    `;
  }

  function renderWizardStep5() {
    const wiz = state.menuWizard;
    return `
      <section class="pp-wizard-step-body">
        <h2>Tell us your rhythm</h2>
        <p class="pp-wizard-subtitle">Almost done — this helps us time your campaigns perfectly.</p>
        <div class="pp-wizard-rhythm-grid">
          <div class="pp-wizard-rhythm-card">
            <p class="pp-card-kicker">When's your rush?</p>
            <div class="pp-wizard-time-row">
              <select id="wizardPeakStart" class="pp-select">${WIZARD_HOURS.map((h) => `<option ${wiz.peakHoursStart === h ? 'selected' : ''}>${h}</option>`).join('')}</select>
              <span>to</span>
              <select id="wizardPeakEnd" class="pp-select">${WIZARD_HOURS.map((h) => `<option ${wiz.peakHoursEnd === h ? 'selected' : ''}>${h}</option>`).join('')}</select>
            </div>
          </div>
          <div class="pp-wizard-rhythm-card">
            <p class="pp-card-kicker">When's it quiet?</p>
            <div class="pp-wizard-time-row">
              <select id="wizardSlowStart" class="pp-select">${WIZARD_HOURS.map((h) => `<option ${wiz.slowHoursStart === h ? 'selected' : ''}>${h}</option>`).join('')}</select>
              <span>to</span>
              <select id="wizardSlowEnd" class="pp-select">${WIZARD_HOURS.map((h) => `<option ${wiz.slowHoursEnd === h ? 'selected' : ''}>${h}</option>`).join('')}</select>
            </div>
          </div>
        </div>
        <div class="pp-wizard-rhythm-card">
          <p class="pp-card-kicker">Which days bring the crowd?</p>
          <div class="pp-wizard-day-chips">
            ${WIZARD_DAYS.map((day) => `<button type="button" class="pp-wizard-day-chip${wiz.busiestDays.includes(day) ? ' active' : ''}" data-wizard-day="${day}">${day}</button>`).join('')}
          </div>
        </div>
        <div class="pp-wizard-rhythm-card">
          <p class="pp-card-kicker">What matters most to you right now?</p>
          <div class="pp-wizard-goal-options">
            ${WIZARD_GOALS.map((goal) => `<button type="button" class="pp-wizard-goal-chip${wiz.primaryGoal === goal.id ? ' active' : ''}" data-wizard-goal="${goal.id}">${escapeHtml(goal.label)}</button>`).join('')}
          </div>
        </div>
      </section>
    `;
  }

  function renderWizardStep6() {
    const items = state.menuWizard.confirmedItems;
    const bestCount = items.filter((i) => i.status === 'best_seller').length;
    const slowCount = items.filter((i) => i.status === 'slow_mover').length;
    const goalLabel = WIZARD_GOALS.find((g) => g.id === state.menuWizard.primaryGoal)?.label || 'Not set';
    const status = state.menuWizard.saveStatus;
    return `
      <section class="pp-wizard-step-body">
        <div class="pp-wizard-done">
          <h2>You're all set!</h2>
          <p class="pp-wizard-subtitle">Here's what we learned about your restaurant.</p>
          <div class="pp-wizard-summary-grid">
            <div class="pp-wizard-summary-stat">
              <strong>${items.length}</strong>
              <p>Menu items</p>
            </div>
            <div class="pp-wizard-summary-stat best">
              <strong>${bestCount}</strong>
              <p>Best sellers</p>
            </div>
            <div class="pp-wizard-summary-stat slow">
              <strong>${slowCount}</strong>
              <p>Need a push</p>
            </div>
          </div>
          <div class="pp-wizard-summary-details">
            <p><strong>Rush hours:</strong> ${escapeHtml(state.menuWizard.peakHoursStart)} – ${escapeHtml(state.menuWizard.peakHoursEnd)}</p>
            <p><strong>Quiet hours:</strong> ${escapeHtml(state.menuWizard.slowHoursStart)} – ${escapeHtml(state.menuWizard.slowHoursEnd)}</p>
            <p><strong>Busiest days:</strong> ${state.menuWizard.busiestDays.length ? escapeHtml(state.menuWizard.busiestDays.join(', ')) : 'Not set'}</p>
            <p><strong>Your priority:</strong> ${escapeHtml(goalLabel)}</p>
          </div>
          ${status ? `<p class="pp-wizard-status">${escapeHtml(status)}</p>` : ''}
        </div>
      </section>
    `;
  }

  function renderMenuWizard() {
    wizardProgressBar();
    const step = state.menuWizard.step;
    refs.wizardBack.classList.toggle('hidden', step <= 1);
    refs.wizardNext.textContent = wizardNextLabel();
    refs.wizardNext.disabled = false;

    if (step === 1) refs.wizardBody.innerHTML = renderWizardStep1();
    else if (step === 2) {
      refs.wizardBody.innerHTML = renderWizardStep2();
      bindWizardStep2();
    }
    else if (step === 3) {
      refs.wizardBody.innerHTML = renderWizardStep3();
      refs.wizardNext.disabled = !state.menuWizard.extractedItems.some((i) => i.confirmed !== false);
      bindWizardStep3();
    }
    else if (step === 4) {
      refs.wizardBody.innerHTML = renderWizardStep4();
      bindWizardStep4();
    }
    else if (step === 5) {
      refs.wizardBody.innerHTML = renderWizardStep5();
      bindWizardStep5();
    }
    else if (step === 6) {
      refs.wizardBody.innerHTML = renderWizardStep6();
      refs.wizardNext.textContent = 'Close';
    }
  }

  function bindWizardStep2() {
    refs.wizardBody.querySelector('#wizardMenuPhoto')?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const preview = refs.wizardBody.querySelector('#wizardPhotoPreview');
      const toDataUrl = (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result || '');
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      try {
        const dataUrl = await toDataUrl(file);
        if (preview) {
          preview.innerHTML = `<img src="${escapeHtml(dataUrl)}" alt="Menu photo" />`;
          preview.classList.remove('hidden');
        }
        state.menuWizard.extractionStatus = 'Reading your menu... this may take a moment.';
        renderMenuWizard();
        const result = await dataAdapter.extractMenuFromPhoto({ imageDataUrl: dataUrl, mimeType: file.type || 'image/jpeg' });
        const items = Array.isArray(result?.items) ? result.items : [];
        state.menuWizard.extractedItems = items.map((item, index) => ({
          id: `wiz_${Date.now()}_${index}`,
          name: asString(typeof item === 'string' ? item : item.name),
          category: ['starter', 'main', 'drink', 'dessert'].includes(asString(item.category).toLowerCase()) ? asString(item.category).toLowerCase() : 'main',
          status: 'regular',
          note: asString(item.note),
          confirmed: true,
          marginBand: '',
          imageAssetId: '',
          imageUrl: '',
        })).filter((i) => i.name);
        state.menuWizard.extractionStatus = items.length ? `Found ${items.length} items! Hit Next to review.` : 'Could not find items. Try a clearer photo or paste them manually.';
        renderMenuWizard();
      } catch (_error) {
        state.menuWizard.extractionStatus = 'Extraction failed. Try a different photo or paste items manually below.';
        renderMenuWizard();
      }
    });

    refs.wizardBody.querySelector('#wizardPasteBtn')?.addEventListener('click', () => {
      const textarea = refs.wizardBody.querySelector('#wizardPasteInput');
      const raw = asString(textarea?.value);
      const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
      if (!lines.length) return;
      const existing = new Set(state.menuWizard.extractedItems.map((i) => i.name.toLowerCase()));
      lines.forEach((line, index) => {
        if (existing.has(line.toLowerCase())) return;
        state.menuWizard.extractedItems.push({
          id: `wiz_paste_${Date.now()}_${index}`,
          name: line,
          category: 'main',
          status: 'regular',
          note: '',
          confirmed: true,
          marginBand: '',
          imageAssetId: '',
          imageUrl: '',
        });
        existing.add(line.toLowerCase());
      });
      if (textarea) textarea.value = '';
      state.menuWizard.extractionStatus = `${state.menuWizard.extractedItems.length} items ready. Hit Next to review.`;
      renderMenuWizard();
    });

    refs.wizardBody.querySelector('#wizardCsvUpload')?.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      const csvStatus = refs.wizardBody.querySelector('#wizardCsvStatus');
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = asString(reader.result);
        const rows = text.split('\n').map((r) => r.trim()).filter(Boolean);
        if (rows.length < 2) { if (csvStatus) csvStatus.textContent = 'CSV appears empty.'; return; }
        const headers = rows[0].toLowerCase().split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
        const nameIdx = headers.indexOf('name');
        if (nameIdx < 0) { if (csvStatus) csvStatus.textContent = 'CSV needs a "name" column.'; return; }
        const catIdx = headers.indexOf('category');
        const existing = new Set(state.menuWizard.extractedItems.map((i) => i.name.toLowerCase()));
        let added = 0;
        rows.slice(1).forEach((row) => {
          const cols = row.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          const name = asString(cols[nameIdx]);
          if (!name || existing.has(name.toLowerCase())) return;
          const rawCat = asString(cols[catIdx]).toLowerCase();
          state.menuWizard.extractedItems.push({
            id: `wiz_csv_${Date.now()}_${added}`,
            name,
            category: ['starter', 'main', 'drink', 'dessert'].includes(rawCat) ? rawCat : 'main',
            status: 'regular',
            note: '',
            confirmed: true,
            marginBand: '',
            imageAssetId: '',
            imageUrl: '',
          });
          existing.add(name.toLowerCase());
          added += 1;
        });
        state.menuWizard.extractionStatus = `${state.menuWizard.extractedItems.length} items ready. Hit Next to review.`;
        renderMenuWizard();
      };
      reader.readAsText(file);
    });
  }

  function bindWizardStep3() {
    refs.wizardBody.querySelectorAll('[data-wizard-check]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const idx = Number(cb.dataset.wizardCheck);
        if (state.menuWizard.extractedItems[idx]) {
          state.menuWizard.extractedItems[idx].confirmed = cb.checked;
        }
        refs.wizardNext.disabled = !state.menuWizard.extractedItems.some((i) => i.confirmed !== false);
      });
    });
    refs.wizardBody.querySelectorAll('[data-wizard-name]').forEach((input) => {
      input.addEventListener('input', (event) => {
        const idx = Number(input.dataset.wizardName);
        if (state.menuWizard.extractedItems[idx]) {
          state.menuWizard.extractedItems[idx].name = asString(event.target.value);
        }
      });
    });
  }

  function bindWizardStep4() {
    refs.wizardBody.querySelectorAll('[data-wizard-tag]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.wizardTag;
        const item = state.menuWizard.confirmedItems.find((i) => i.id === id);
        if (!item) return;
        const pass = state.menuWizard.taggingPass;
        if (item.status === pass) item.status = 'regular';
        else item.status = pass;
        renderMenuWizard();
      });
    });
    refs.wizardBody.querySelector('#wizardFinishBestPass')?.addEventListener('click', () => {
      state.menuWizard.taggingPass = 'slow_mover';
      renderMenuWizard();
    });
  }

  function bindWizardStep5() {
    refs.wizardBody.querySelector('#wizardPeakStart')?.addEventListener('change', (e) => { state.menuWizard.peakHoursStart = asString(e.target.value); });
    refs.wizardBody.querySelector('#wizardPeakEnd')?.addEventListener('change', (e) => { state.menuWizard.peakHoursEnd = asString(e.target.value); });
    refs.wizardBody.querySelector('#wizardSlowStart')?.addEventListener('change', (e) => { state.menuWizard.slowHoursStart = asString(e.target.value); });
    refs.wizardBody.querySelector('#wizardSlowEnd')?.addEventListener('change', (e) => { state.menuWizard.slowHoursEnd = asString(e.target.value); });
    refs.wizardBody.querySelectorAll('[data-wizard-day]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const day = btn.dataset.wizardDay;
        const exists = state.menuWizard.busiestDays.includes(day);
        if (exists) state.menuWizard.busiestDays = state.menuWizard.busiestDays.filter((d) => d !== day);
        else state.menuWizard.busiestDays.push(day);
        renderMenuWizard();
      });
    });
    refs.wizardBody.querySelectorAll('[data-wizard-goal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.menuWizard.primaryGoal = btn.dataset.wizardGoal;
        renderMenuWizard();
      });
    });
  }

  async function wizardSaveToProfile() {
    const wiz = state.menuWizard;
    const menuItems = normalizeMenuItems(wiz.confirmedItems);
    const goalMapping = WIZARD_GOALS.find((g) => g.id === wiz.primaryGoal);
    const payload = {
      storeId: state.storeId,
      restaurantName: state.profile?.restaurantName || '',
      restaurantLocation: state.profile?.restaurantLocation || '',
      logoAsset: state.profile?.logoAsset || '',
      category: state.profile?.category || '',
      businessType: state.profile?.businessType || '',
      cuisineType: state.profile?.cuisineType || '',
      businessHours: state.profile?.businessHours || '',
      brandTone: state.profile?.brandTone || '',
      menuItems,
      peakHours: [{ start: wiz.peakHoursStart, end: wiz.peakHoursEnd }],
      slowHours: [{ start: wiz.slowHoursStart, end: wiz.slowHoursEnd }],
      busiestDays: wiz.busiestDays,
      primaryGoal: wiz.primaryGoal,
    };
    try {
      wiz.saveStatus = 'Saving your setup...';
      renderMenuWizard();
      state.profile = await dataAdapter.saveRestaurantProfile(payload);
      state.settings = null;
      renderProfile();
      wiz.saveStatus = 'Menu intelligence is live. Your next campaign just got smarter.';
      renderMenuWizard();
    } catch (_error) {
      wiz.saveStatus = 'Save failed. You can try again or close and save from Settings.';
      renderMenuWizard();
    }
  }

  function handleWizardNext() {
    const step = state.menuWizard.step;
    if (step === 1) {
      state.menuWizard.step = 2;
    } else if (step === 2) {
      if (!state.menuWizard.extractedItems.length) return;
      state.menuWizard.step = 3;
    } else if (step === 3) {
      state.menuWizard.confirmedItems = state.menuWizard.extractedItems
        .filter((i) => i.confirmed !== false && asString(i.name))
        .map((i) => ({ ...i }));
      state.menuWizard.taggingPass = 'best_seller';
      state.menuWizard.step = 4;
    } else if (step === 4) {
      state.menuWizard.step = 5;
    } else if (step === 5) {
      state.menuWizard.step = 6;
      wizardSaveToProfile();
    } else if (step === 6) {
      closeMenuWizard();
      navigate('home');
      return;
    }
    renderMenuWizard();
  }

  function handleWizardBack() {
    if (state.menuWizard.step <= 1) return;
    if (state.menuWizard.step === 4 && state.menuWizard.taggingPass === 'slow_mover') {
      state.menuWizard.taggingPass = 'best_seller';
      renderMenuWizard();
      return;
    }
    state.menuWizard.step -= 1;
    renderMenuWizard();
  }

  if (refs.wizardNext) refs.wizardNext.addEventListener('click', handleWizardNext);
  if (refs.wizardBack) refs.wizardBack.addEventListener('click', handleWizardBack);
  if (refs.wizardClose) refs.wizardClose.addEventListener('click', closeMenuWizard);
  if (refs.wizardModal) {
    refs.wizardModal.addEventListener('click', (event) => {
      if (event.target === refs.wizardModal) closeMenuWizard();
    });
  }

  // ── End Menu Onboarding Wizard ──────────────────────────────────────

  // ── Menu Import Flow ────────────────────────────────────────────────

  const MI_STEPS = ['Get Started', 'Upload', 'Processing', 'Summary', 'Review', 'Save'];
  const MI_REVIEW_STEPS = ['Restaurant Info', 'Sections', 'Menu Items', 'Fix Issues', 'Final Preview'];
  const MI_TEMPLATES = [
    { id: 'modern', label: 'Modern', desc: 'Clean lines, generous spacing' },
    { id: 'classic', label: 'Classic', desc: 'Traditional, warm feel' },
    { id: 'bold', label: 'Bold', desc: 'Strong colors, big type' },
    { id: 'minimal', label: 'Minimal', desc: 'Less is more' },
  ];

  function resetMenuImport() {
    state.menuImport = {
      step: 0,
      reviewStep: 0,
      uploadStatus: '',
      processingPhase: '',
      parseConfidence: 0,
      parseWarnings: [],
      importSource: '',
      fileName: '',
      fileType: '',
      fileDataUrl: '',
      restaurantInfo: {
        name: state.profile?.restaurantName || '',
        tagline: '',
        contact: '',
        address: state.profile?.restaurantLocation || '',
        logo: state.profile?.logoAsset || '',
      },
      sections: [],
      style: { template: 'modern', layout: 'one-column' },
      saveStatus: '',
      errorMessage: '',
    };
  }

  function miProgressBar() {
    const step = state.menuImport.step;
    if (step <= 0) return '';
    const labels = step === 4
      ? MI_REVIEW_STEPS
      : MI_STEPS.filter((_, i) => i > 0);
    const current = step === 4 ? state.menuImport.reviewStep : step - 1;
    return `<div class="pp-mi-progress">${labels.map((label, i) => `<span class="pp-mi-progress-pill${i === current ? ' active' : ''}${i < current ? ' done' : ''}">${escapeHtml(label)}</span>`).join('')}</div>`;
  }

  function miSectionId(index) {
    return `mi_section_${index}`;
  }

  function getMenuAge() {
    const imported = state.profile?.menuImportedAt;
    if (!imported) return null;
    const diffMs = Date.now() - new Date(imported).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  function hasExistingMenu() {
    return Array.isArray(state.profile?.menuItems) && state.profile.menuItems.length > 0;
  }

  function loadExistingMenuIntoImport() {
    const mi = state.menuImport;
    const items = state.profile?.menuItems || [];
    const grouped = {};
    items.forEach((item) => {
      const catLabel = { starter: 'Starters', main: 'Main Course', drink: 'Drinks', dessert: 'Desserts' }[item.category] || 'Other';
      if (!grouped[catLabel]) grouped[catLabel] = [];
      let itemName = item.name || '';
      let itemPrice = '';
      const dashMatch = itemName.match(/^(.+?)\s*—\s*(.+)$/);
      if (dashMatch) { itemName = dashMatch[1].trim(); itemPrice = dashMatch[2].trim(); }
      let desc = item.note || '';
      const priceInNote = desc.match(/^(.*?)\s*·\s*Price:\s*(.+)$/);
      if (priceInNote) { desc = priceInNote[1].trim(); if (!itemPrice) itemPrice = priceInNote[2].trim(); }
      grouped[catLabel].push({
        id: item.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: itemName,
        price: itemPrice,
        description: desc,
        warnings: [],
      });
    });
    mi.sections = Object.entries(grouped).map(([name, sectionItems]) => ({
      id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      items: sectionItems,
    }));
    mi.restaurantInfo.name = state.profile?.restaurantName || '';
    mi.restaurantInfo.address = state.profile?.restaurantLocation || '';
    mi.restaurantInfo.logo = state.profile?.logoAsset || '';
    mi.parseConfidence = 1;
  }

  function renderMiStep0() {
    const existing = hasExistingMenu();
    const ageDays = getMenuAge();
    const isStale = ageDays !== null && ageDays >= 90;
    const itemCount = state.profile?.menuItems?.length || 0;

    if (existing) {
      const ageLine = ageDays !== null
        ? (isStale
            ? `<span class="pp-mi-age stale">Last updated ${ageDays} days ago — time to refresh</span>`
            : `<span class="pp-mi-age fresh">Last updated ${ageDays} day${ageDays !== 1 ? 's' : ''} ago</span>`)
        : '';

      return `
        <section class="pp-mi-entry">
          <div class="pp-mi-entry-hero">
            <h1>Your menu</h1>
            <p>You have <strong>${itemCount} item${itemCount !== 1 ? 's' : ''}</strong> saved. ${isStale ? 'Consider refreshing your menu for better campaign results.' : 'Edit anytime or re-scan to update.'}</p>
            ${ageLine}
          </div>
          ${isStale ? `
            <div class="pp-mi-stale-banner">
              <strong>Time for a refresh?</strong> Your menu hasn't been updated in 90+ days. Re-scan or add new items to keep campaigns accurate.
            </div>
          ` : ''}
          <div class="pp-mi-entry-actions">
            <button type="button" class="pp-mi-primary-cta" data-mi-action="edit-existing">
              <span class="pp-mi-cta-icon">✎</span>
              <strong>Edit Menu</strong>
              <span>Add, remove, or update items</span>
            </button>
            <button type="button" class="pp-mi-secondary-cta" data-mi-action="start-upload">
              <span class="pp-mi-cta-icon">⬆</span>
              <strong>Re-scan Menu</strong>
              <span>Upload a new photo or file</span>
            </button>
          </div>
          <button type="button" class="pp-mi-text-link" data-mi-action="start-scratch">+ Add items manually</button>
        </section>
      `;
    }

    return `
      <section class="pp-mi-entry">
        <div class="pp-mi-entry-hero">
          <h1>Your menu, ready in minutes</h1>
          <p>Upload your existing menu and we'll organize it for you. No manual retyping needed.</p>
        </div>
        <div class="pp-mi-entry-actions">
          <button type="button" class="pp-mi-primary-cta" data-mi-action="start-upload">
            <span class="pp-mi-cta-icon">⬆</span>
            <strong>Upload & Optimize Menu</strong>
            <span>PDF, photo, spreadsheet, or document</span>
          </button>
          <button type="button" class="pp-mi-secondary-cta" data-mi-action="start-scratch">
            <span class="pp-mi-cta-icon">✎</span>
            <strong>Start from scratch</strong>
            <span>Build your menu section by section</span>
          </button>
        </div>
        <p class="pp-mi-trust-line">Trusted by restaurant owners to save hours of menu work.</p>
      </section>
    `;
  }

  function renderMiStep1() {
    const err = state.menuImport.errorMessage;
    return `
      <section class="pp-mi-upload">
        <h2>How would you like to upload?</h2>
        <p class="pp-mi-subtitle">We accept photos, PDFs, spreadsheets, and documents. Pick the easiest option for you.</p>
        ${err ? `<div class="pp-mi-error-banner">${escapeHtml(err)}</div>` : ''}
        <div class="pp-mi-drop-zone" id="miDropZone">
          <div class="pp-mi-drop-content">
            <span class="pp-mi-drop-icon">📄</span>
            <p><strong>Drag and drop your menu file here</strong></p>
            <p class="pp-mi-subtle">or choose an option below</p>
          </div>
        </div>
        <div class="pp-mi-upload-options">
          <label class="pp-mi-upload-btn" for="miFileInput">
            <span class="pp-mi-btn-icon">📱</span>
            <strong>Upload from device</strong>
            <span>Photo, PDF, CSV, or document</span>
          </label>
          <input id="miFileInput" type="file" accept="image/*,.pdf,.csv,.xlsx,.xls,.doc,.docx" class="hidden" />
          <button type="button" class="pp-mi-upload-btn" disabled>
            <span class="pp-mi-btn-icon">📸</span>
            <strong>Take a photo</strong>
            <span>Snap your physical menu</span>
          </button>
          <button type="button" class="pp-mi-upload-btn" disabled title="Coming soon">
            <span class="pp-mi-btn-icon">☁</span>
            <strong>Google Drive</strong>
            <span class="pp-mi-coming-soon">Coming soon</span>
          </button>
          <button type="button" class="pp-mi-upload-btn" disabled title="Coming soon">
            <span class="pp-mi-btn-icon">📦</span>
            <strong>Dropbox</strong>
            <span class="pp-mi-coming-soon">Coming soon</span>
          </button>
        </div>
        <p class="pp-mi-format-note">Supported: JPG, PNG, PDF, CSV, Excel, Word · Max 10 MB</p>
      </section>
    `;
  }

  function renderMiStep2() {
    const phase = state.menuImport.processingPhase;
    const phases = ['Reading your menu…', 'Finding sections and categories…', 'Organizing items and prices…', 'Preparing your menu for review…'];
    return `
      <section class="pp-mi-processing">
        <div class="pp-mi-processing-visual">
          <div class="pp-mi-spinner"></div>
        </div>
        <h2>${escapeHtml(phase || phases[0])}</h2>
        <p class="pp-mi-subtitle">This usually takes a few seconds. We're scanning your menu and organizing everything.</p>
        <div class="pp-mi-processing-steps">
          ${phases.map((p, i) => {
            const currentIdx = phases.indexOf(phase);
            const isDone = i < currentIdx;
            const isActive = p === phase;
            return `<div class="pp-mi-processing-step${isDone ? ' done' : ''}${isActive ? ' active' : ''}"><span>${isDone ? '✓' : (isActive ? '◉' : '○')}</span> ${escapeHtml(p)}</div>`;
          }).join('')}
        </div>
        ${state.menuImport.fileName ? `<p class="pp-mi-file-info">File: ${escapeHtml(state.menuImport.fileName)}</p>` : ''}
      </section>
    `;
  }

  function renderMiStep3() {
    const mi = state.menuImport;
    const totalItems = mi.sections.reduce((sum, s) => sum + s.items.length, 0);
    const warnings = mi.parseWarnings;
    const confidence = Math.round(mi.parseConfidence * 100);
    const hasPrices = mi.sections.some((s) => s.items.some((item) => item.price));
    const isDemo = mi.parseConfidence === 0;
    return `
      <section class="pp-mi-summary">
        ${isDemo ? `
          <div class="pp-mi-demo-banner">
            <strong>Heads up:</strong> We couldn't scan your menu automatically yet. The sections below are empty templates — replace the placeholder names with your real items in the next step.
          </div>
        ` : ''}
        <div class="pp-mi-summary-hero">
          <span class="pp-mi-success-icon">${isDemo ? '☰' : '✓'}</span>
          <h2>${isDemo ? 'Menu template ready for your items' : 'We imported your menu successfully'}</h2>
          ${mi.restaurantInfo.name ? `<p class="pp-mi-detected-name">${escapeHtml(mi.restaurantInfo.name)}</p>` : ''}
        </div>
        <div class="pp-mi-summary-stats">
          <div class="pp-mi-stat">
            <strong>${mi.sections.length}</strong>
            <span>Section${mi.sections.length !== 1 ? 's' : ''} found</span>
          </div>
          <div class="pp-mi-stat">
            <strong>${totalItems}</strong>
            <span>Item${totalItems !== 1 ? 's' : ''} detected</span>
          </div>
          <div class="pp-mi-stat">
            <strong>${confidence}%</strong>
            <span>Confidence</span>
          </div>
        </div>
        <div class="pp-mi-strengths">
          <p class="pp-mi-strength-label">What we found:</p>
          <div class="pp-mi-strength-chips">
            <span class="pp-mi-chip positive">${mi.sections.length} section${mi.sections.length !== 1 ? 's' : ''}</span>
            <span class="pp-mi-chip positive">${totalItems} item${totalItems !== 1 ? 's' : ''}</span>
            ${hasPrices ? '<span class="pp-mi-chip positive">Prices detected</span>' : ''}
          </div>
        </div>
        ${warnings.length ? `
          <div class="pp-mi-warnings">
            <p class="pp-mi-warning-label">Needs a quick look:</p>
            ${warnings.map((w) => `<div class="pp-mi-warning-row"><span>⚠</span> ${escapeHtml(w)}</div>`).join('')}
          </div>
        ` : ''}
        <div class="pp-mi-summary-actions">
          <button type="button" class="pp-primary-btn" data-mi-action="start-review">Review Menu</button>
          <button type="button" class="pp-secondary-btn" data-mi-action="re-upload">Re-upload file</button>
        </div>
      </section>
    `;
  }

  function renderMiReview41() {
    const info = state.menuImport.restaurantInfo;
    return `
      <section class="pp-mi-review-step">
        <h2>Restaurant details</h2>
        <p class="pp-mi-subtitle">Confirm or update your restaurant information. We pre-filled what we could.</p>
        <div class="pp-mi-form">
          <label class="pp-mi-field">
            <span>Restaurant name</span>
            <input type="text" id="miRestName" value="${escapeHtml(info.name)}" placeholder="e.g. The Spice Kitchen" />
          </label>
          <label class="pp-mi-field">
            <span>Tagline <small>(optional)</small></span>
            <input type="text" id="miRestTagline" value="${escapeHtml(info.tagline)}" placeholder="e.g. Authentic flavors, modern soul" />
          </label>
          <label class="pp-mi-field">
            <span>Contact <small>(phone or email)</small></span>
            <input type="text" id="miRestContact" value="${escapeHtml(info.contact)}" placeholder="e.g. (555) 123-4567" />
          </label>
          <label class="pp-mi-field">
            <span>Address</span>
            <input type="text" id="miRestAddress" value="${escapeHtml(info.address)}" placeholder="e.g. 123 Main St, City" />
          </label>
        </div>
      </section>
    `;
  }

  function renderMiReview42() {
    const sections = state.menuImport.sections;
    return `
      <section class="pp-mi-review-step">
        <h2>Menu sections</h2>
        <p class="pp-mi-subtitle">We organized your menu into these sections. Rename, reorder, or add new ones.</p>
        <div class="pp-mi-sections-list" id="miSectionsList">
          ${sections.map((section, index) => `
            <div class="pp-mi-section-row" data-mi-section="${index}">
              <span class="pp-mi-drag-handle">⠿</span>
              <input type="text" class="pp-mi-section-name" data-mi-section-name="${index}" value="${escapeHtml(section.name)}" />
              <span class="pp-mi-section-count">${section.items.length} item${section.items.length !== 1 ? 's' : ''}</span>
              <button type="button" class="pp-mi-icon-btn danger" data-mi-remove-section="${index}" title="Remove section">×</button>
            </div>
          `).join('')}
        </div>
        <button type="button" class="pp-mi-add-btn" data-mi-action="add-section">+ Add section</button>
      </section>
    `;
  }

  function renderMiReview43() {
    const sections = state.menuImport.sections;
    return `
      <section class="pp-mi-review-step">
        <h2>Review your items</h2>
        <p class="pp-mi-subtitle">Check names, prices, and descriptions. We've pre-filled what we could read.</p>
        ${sections.map((section, sIdx) => `
          <div class="pp-mi-items-section">
            <h3 class="pp-mi-items-section-title">${escapeHtml(section.name)} <small>(${section.items.length})</small></h3>
            <div class="pp-mi-items-list">
              ${section.items.map((item, iIdx) => `
                <div class="pp-mi-item-card${item.warnings?.length ? ' has-warning' : ''}" data-mi-item-section="${sIdx}" data-mi-item-index="${iIdx}">
                  <div class="pp-mi-item-main">
                    <input type="text" class="pp-mi-item-name" data-mi-field="name" value="${escapeHtml(item.name)}" placeholder="Item name" />
                    <input type="text" class="pp-mi-item-price" data-mi-field="price" value="${escapeHtml(item.price || '')}" placeholder="Price" />
                  </div>
                  <textarea class="pp-mi-item-desc" data-mi-field="description" rows="1" placeholder="Short description (optional)">${escapeHtml(item.description || '')}</textarea>
                  ${item.warnings?.length ? `<p class="pp-mi-item-warning">${escapeHtml(item.warnings[0])}</p>` : ''}
                  <div class="pp-mi-item-actions">
                    <button type="button" class="pp-mi-text-btn" data-mi-ai-action="improve" data-mi-ai-section="${sIdx}" data-mi-ai-item="${iIdx}">Improve description</button>
                    <button type="button" class="pp-mi-icon-btn danger" data-mi-remove-item="${sIdx}:${iIdx}" title="Remove">×</button>
                  </div>
                </div>
              `).join('')}
              <button type="button" class="pp-mi-add-btn" data-mi-add-item="${sIdx}">+ Add item</button>
            </div>
          </div>
        `).join('')}
      </section>
    `;
  }

  function renderMiReview44() {
    const allWarnings = [];
    state.menuImport.sections.forEach((section, sIdx) => {
      section.items.forEach((item, iIdx) => {
        if (item.warnings?.length) {
          item.warnings.forEach((w) => {
            allWarnings.push({ sectionName: section.name, itemName: item.name, warning: w, sIdx, iIdx });
          });
        }
      });
    });
    if (!allWarnings.length) {
      return `
        <section class="pp-mi-review-step">
          <div class="pp-mi-all-clear">
            <span class="pp-mi-success-icon">✓</span>
            <h2>Everything looks good</h2>
            <p class="pp-mi-subtitle">No issues found. Your menu is ready for final review.</p>
          </div>
        </section>
      `;
    }
    return `
      <section class="pp-mi-review-step">
        <h2>Items that need attention</h2>
        <p class="pp-mi-subtitle">These ${allWarnings.length} item${allWarnings.length !== 1 ? 's' : ''} had something unclear. Fix them here to save time.</p>
        <div class="pp-mi-fix-list">
          ${allWarnings.map((w) => `
            <div class="pp-mi-fix-card">
              <p class="pp-mi-fix-context">${escapeHtml(w.sectionName)}</p>
              <div class="pp-mi-fix-row">
                <input type="text" class="pp-mi-fix-name" data-mi-fix-section="${w.sIdx}" data-mi-fix-item="${w.iIdx}" data-mi-fix-field="name" value="${escapeHtml(w.itemName)}" />
                <span class="pp-mi-fix-warning">${escapeHtml(w.warning)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderMiReview45() {
    const mi = state.menuImport;
    const totalItems = mi.sections.reduce((sum, s) => sum + s.items.length, 0);
    return `
      <section class="pp-mi-review-step">
        <h2>Your menu is ready</h2>
        <p class="pp-mi-subtitle">Here's a quick preview before you save. You can always come back and edit later.</p>
        <div class="pp-mi-final-preview">
          ${mi.restaurantInfo.name ? `<div class="pp-mi-preview-header"><h3>${escapeHtml(mi.restaurantInfo.name)}</h3>${mi.restaurantInfo.tagline ? `<p>${escapeHtml(mi.restaurantInfo.tagline)}</p>` : ''}</div>` : ''}
          ${mi.sections.map((section) => `
            <div class="pp-mi-preview-section">
              <h4>${escapeHtml(section.name)}</h4>
              ${section.items.map((item) => `
                <div class="pp-mi-preview-item">
                  <div class="pp-mi-preview-item-main">
                    <strong>${escapeHtml(item.name)}</strong>
                    ${item.price ? `<span class="pp-mi-preview-price">${escapeHtml(item.price)}</span>` : ''}
                  </div>
                  ${item.description ? `<p class="pp-mi-preview-desc">${escapeHtml(item.description)}</p>` : ''}
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
        <div class="pp-mi-final-stats">
          <span>${mi.sections.length} section${mi.sections.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>${totalItems} item${totalItems !== 1 ? 's' : ''}</span>
        </div>
      </section>
    `;
  }

  function renderMiStep5() {
    const status = state.menuImport.saveStatus;
    if (status === 'saved') {
      return `
        <section class="pp-mi-saved">
          <span class="pp-mi-success-icon large">✓</span>
          <h2>Menu saved successfully</h2>
          <p class="pp-mi-subtitle">Your menu is now part of your restaurant profile. It powers smarter campaign suggestions, better poster designs, and targeted promotions.</p>
          <div class="pp-mi-next-steps">
            <p class="pp-mi-strength-label">What happens next:</p>
            <div class="pp-mi-next-list">
              <div class="pp-mi-next-item"><strong>Smarter campaigns</strong><span>AI suggestions now use your real menu data</span></div>
              <div class="pp-mi-next-item"><strong>Better posters</strong><span>Offer designs reference your actual items</span></div>
              <div class="pp-mi-next-item"><strong>Edit anytime</strong><span>Update your menu from Settings whenever you need</span></div>
            </div>
          </div>
          <div class="pp-mi-saved-actions">
            <button type="button" class="pp-primary-btn" data-mi-action="go-home">Go to Dashboard</button>
            <button type="button" class="pp-secondary-btn" data-mi-action="create-campaign">New campaign</button>
          </div>
        </section>
      `;
    }
    return `
      <section class="pp-mi-save">
        <h2>Save your menu</h2>
        <p class="pp-mi-subtitle">Choose a style preference (you can change this later) and save your menu.</p>
        <div class="pp-mi-style-picker">
          <p class="pp-mi-strength-label">Menu style</p>
          <div class="pp-mi-style-options">
            ${MI_TEMPLATES.map((t) => `
              <button type="button" class="pp-mi-style-card${state.menuImport.style.template === t.id ? ' active' : ''}" data-mi-style="${t.id}">
                <strong>${escapeHtml(t.label)}</strong>
                <span>${escapeHtml(t.desc)}</span>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="pp-mi-layout-picker">
          <p class="pp-mi-strength-label">Layout</p>
          <div class="pp-mi-layout-options">
            <button type="button" class="pp-mi-layout-btn${state.menuImport.style.layout === 'one-column' ? ' active' : ''}" data-mi-layout="one-column">One column</button>
            <button type="button" class="pp-mi-layout-btn${state.menuImport.style.layout === 'two-column' ? ' active' : ''}" data-mi-layout="two-column">Two columns</button>
          </div>
        </div>
        ${status && status !== 'saved' ? `<p class="pp-mi-status">${escapeHtml(status)}</p>` : ''}
        <div class="pp-mi-save-actions">
          <button type="button" class="pp-primary-btn" data-mi-action="save-publish">Save Menu</button>
          <button type="button" class="pp-secondary-btn" data-mi-action="save-draft">Save as Draft</button>
        </div>
      </section>
    `;
  }

  function renderMenuImportRoute() {
    const mi = state.menuImport;
    let stepHtml = '';
    if (mi.step === 0) stepHtml = renderMiStep0();
    else if (mi.step === 1) stepHtml = renderMiStep1();
    else if (mi.step === 2) stepHtml = renderMiStep2();
    else if (mi.step === 3) stepHtml = renderMiStep3();
    else if (mi.step === 4) {
      if (mi.reviewStep === 0) stepHtml = renderMiReview41();
      else if (mi.reviewStep === 1) stepHtml = renderMiReview42();
      else if (mi.reviewStep === 2) stepHtml = renderMiReview43();
      else if (mi.reviewStep === 3) stepHtml = renderMiReview44();
      else stepHtml = renderMiReview45();
    }
    else if (mi.step === 5) stepHtml = renderMiStep5();

    const showBack = mi.step > 0 && !(mi.step === 5 && mi.saveStatus === 'saved');
    const showNext = mi.step === 4;

    refs.routeMount.innerHTML = `
      <div class="pp-mi-shell">
        ${mi.step > 0 ? `<div class="pp-mi-topbar">
          ${showBack ? '<button type="button" class="pp-mi-back-btn" data-mi-action="back">← Back</button>' : '<span></span>'}
          ${miProgressBar()}
          <span></span>
        </div>` : ''}
        <div class="pp-mi-content">
          ${stepHtml}
        </div>
        ${showNext ? `<div class="pp-mi-footer">
          <button type="button" class="pp-secondary-btn" data-mi-action="back">Back</button>
          <button type="button" class="pp-primary-btn" data-mi-action="next">${mi.reviewStep === 4 ? 'Continue to Save' : 'Next'}</button>
        </div>` : ''}
      </div>
    `;

    bindMenuImportEvents();
  }

  function bindMenuImportEvents() {
    const mi = state.menuImport;

    refs.routeMount.querySelectorAll('[data-mi-action]').forEach((btn) => {
      btn.addEventListener('click', () => handleMiAction(btn.dataset.miAction));
    });

    if (mi.step === 1) {
      const fileInput = refs.routeMount.querySelector('#miFileInput');
      if (fileInput) fileInput.addEventListener('change', (e) => handleMiFileSelect(e.target.files?.[0]));
      const dropZone = refs.routeMount.querySelector('#miDropZone');
      if (dropZone) {
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragging'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
        dropZone.addEventListener('drop', (e) => {
          e.preventDefault();
          dropZone.classList.remove('dragging');
          handleMiFileSelect(e.dataTransfer?.files?.[0]);
        });
      }
    }

    if (mi.step === 4 && mi.reviewStep === 0) {
      ['miRestName', 'miRestTagline', 'miRestContact', 'miRestAddress'].forEach((id) => {
        const input = refs.routeMount.querySelector(`#${id}`);
        if (input) input.addEventListener('input', () => {
          const map = { miRestName: 'name', miRestTagline: 'tagline', miRestContact: 'contact', miRestAddress: 'address' };
          mi.restaurantInfo[map[id]] = asString(input.value);
        });
      });
    }

    if (mi.step === 4 && mi.reviewStep === 1) {
      refs.routeMount.querySelectorAll('[data-mi-section-name]').forEach((input) => {
        input.addEventListener('input', () => {
          const idx = Number(input.dataset.miSectionName);
          if (mi.sections[idx]) mi.sections[idx].name = asString(input.value);
        });
      });
      refs.routeMount.querySelectorAll('[data-mi-remove-section]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.miRemoveSection);
          mi.sections.splice(idx, 1);
          renderMenuImportRoute();
        });
      });
    }

    if (mi.step === 4 && mi.reviewStep === 2) {
      refs.routeMount.querySelectorAll('[data-mi-item-section]').forEach((card) => {
        const sIdx = Number(card.dataset.miItemSection);
        const iIdx = Number(card.dataset.miItemIndex);
        card.querySelectorAll('[data-mi-field]').forEach((input) => {
          input.addEventListener('input', () => {
            const field = input.dataset.miField;
            if (mi.sections[sIdx]?.items[iIdx]) {
              mi.sections[sIdx].items[iIdx][field] = input.value;
            }
          });
        });
      });
      refs.routeMount.querySelectorAll('[data-mi-remove-item]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const [sIdx, iIdx] = btn.dataset.miRemoveItem.split(':').map(Number);
          if (mi.sections[sIdx]?.items) {
            mi.sections[sIdx].items.splice(iIdx, 1);
            renderMenuImportRoute();
          }
        });
      });
      refs.routeMount.querySelectorAll('[data-mi-add-item]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const sIdx = Number(btn.dataset.miAddItem);
          if (mi.sections[sIdx]) {
            mi.sections[sIdx].items.push({ id: `item_${Date.now()}`, name: '', price: '', description: '', warnings: [] });
            renderMenuImportRoute();
          }
        });
      });
      refs.routeMount.querySelectorAll('[data-mi-ai-action="improve"]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const sIdx = Number(btn.dataset.miAiSection);
          const iIdx = Number(btn.dataset.miAiItem);
          const item = mi.sections[sIdx]?.items[iIdx];
          if (!item || !item.name.trim()) return;
          btn.textContent = 'Improving…';
          btn.disabled = true;
          const result = await dataAdapter.improveMenuItemDescription({
            itemName: item.name,
            currentDescription: item.description || '',
            sectionName: mi.sections[sIdx]?.name || '',
            restaurantName: mi.restaurantInfo.name || state.profile?.restaurantName || '',
          });
          if (result.description) {
            item.description = result.description;
            renderMenuImportRoute();
          } else {
            btn.textContent = 'Improve description';
            btn.disabled = false;
          }
        });
      });
    }

    if (mi.step === 4 && mi.reviewStep === 3) {
      refs.routeMount.querySelectorAll('[data-mi-fix-section]').forEach((input) => {
        input.addEventListener('input', () => {
          const sIdx = Number(input.dataset.miFixSection);
          const iIdx = Number(input.dataset.miFixItem);
          const field = input.dataset.miFixField;
          if (mi.sections[sIdx]?.items[iIdx]) mi.sections[sIdx].items[iIdx][field] = input.value;
        });
      });
    }

    if (mi.step === 5) {
      refs.routeMount.querySelectorAll('[data-mi-style]').forEach((btn) => {
        btn.addEventListener('click', () => {
          mi.style.template = btn.dataset.miStyle;
          renderMenuImportRoute();
        });
      });
      refs.routeMount.querySelectorAll('[data-mi-layout]').forEach((btn) => {
        btn.addEventListener('click', () => {
          mi.style.layout = btn.dataset.miLayout;
          renderMenuImportRoute();
        });
      });
    }
  }

  function handleMiAction(action) {
    const mi = state.menuImport;
    if (action === 'start-upload') { mi.step = 1; renderMenuImportRoute(); }
    else if (action === 'edit-existing') {
      loadExistingMenuIntoImport();
      mi.step = 4;
      mi.reviewStep = 2;
      renderMenuImportRoute();
    }
    else if (action === 'start-scratch') {
      mi.step = 4;
      mi.reviewStep = 0;
      if (!hasExistingMenu()) {
        mi.sections = [
          { id: 'sec_1', name: 'Appetizers', items: [] },
          { id: 'sec_2', name: 'Main Course', items: [] },
          { id: 'sec_3', name: 'Drinks', items: [] },
          { id: 'sec_4', name: 'Desserts', items: [] },
        ];
      } else {
        loadExistingMenuIntoImport();
      }
      mi.parseConfidence = 1;
      renderMenuImportRoute();
    }
    else if (action === 'back') {
      if (mi.step === 4 && mi.reviewStep > 0) { mi.reviewStep -= 1; }
      else if (mi.step === 5) { mi.step = 4; mi.reviewStep = 4; }
      else if (mi.step > 0) { mi.step -= 1; }
      renderMenuImportRoute();
    }
    else if (action === 'next') {
      if (mi.step === 4 && mi.reviewStep < 4) { mi.reviewStep += 1; }
      else if (mi.step === 4 && mi.reviewStep === 4) { mi.step = 5; }
      renderMenuImportRoute();
    }
    else if (action === 'start-review') { mi.step = 4; mi.reviewStep = 0; renderMenuImportRoute(); }
    else if (action === 're-upload') { mi.step = 1; mi.errorMessage = ''; renderMenuImportRoute(); }
    else if (action === 'add-section') {
      mi.sections.push({ id: `sec_${Date.now()}`, name: 'New Section', items: [] });
      renderMenuImportRoute();
    }
    else if (action === 'save-publish' || action === 'save-draft') { handleMiSave(); }
    else if (action === 'go-home') { navigate('home'); }
    else if (action === 'create-campaign') { resetCampaignBuilder(); navigate('create-campaign'); }
  }

  async function handleMiFileSelect(file) {
    if (!file) return;
    const mi = state.menuImport;
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      mi.errorMessage = 'File is too large. Please use a file under 10 MB.';
      renderMenuImportRoute();
      return;
    }
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const ext = file.name.split('.').pop().toLowerCase();
    const validExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'csv', 'xlsx', 'xls', 'doc', 'docx'];
    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      mi.errorMessage = 'This file type is not supported. Please upload a photo, PDF, spreadsheet, or document.';
      renderMenuImportRoute();
      return;
    }
    mi.fileName = file.name;
    mi.fileType = ext;
    mi.errorMessage = '';
    mi.step = 2;
    mi.processingPhase = 'Reading your menu…';
    renderMenuImportRoute();

    const toDataUrl = (blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result || '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    try {
      const dataUrl = await toDataUrl(file);
      mi.fileDataUrl = dataUrl;
      mi.processingPhase = 'Finding sections and categories…';
      renderMenuImportRoute();

      const result = await dataAdapter.importMenuFile({ fileDataUrl: dataUrl, fileName: file.name, fileType: ext });

      mi.processingPhase = 'Organizing items and prices…';
      renderMenuImportRoute();

      await new Promise((r) => setTimeout(r, 600));

      mi.processingPhase = 'Preparing your menu for review…';
      renderMenuImportRoute();

      await new Promise((r) => setTimeout(r, 400));

      mi.sections = Array.isArray(result.sections) ? result.sections : [];
      mi.parseConfidence = Number(result.confidence) || 0.7;
      mi.parseWarnings = Array.isArray(result.warnings) ? result.warnings : [];
      if (result.restaurantName) mi.restaurantInfo.name = result.restaurantName;
      mi.step = 3;
      renderMenuImportRoute();
    } catch (_error) {
      mi.step = 1;
      mi.errorMessage = 'We could not read this file. Please try a different file or a clearer photo.';
      renderMenuImportRoute();
    }
  }

  async function handleMiSave() {
    const mi = state.menuImport;
    mi.saveStatus = 'Saving your menu…';
    renderMenuImportRoute();

    const flatItems = [];
    const categoryMap = { appetizers: 'starter', starters: 'starter', 'main course': 'main', mains: 'main', entrees: 'main', drinks: 'drink', beverages: 'drink', desserts: 'dessert', sweets: 'dessert' };
    mi.sections.forEach((section) => {
      const rawCat = asString(section.name).toLowerCase();
      const category = categoryMap[rawCat] || 'main';
      section.items.forEach((item, index) => {
        if (!asString(item.name)) return;
        flatItems.push({
          id: item.id || `menu_item_${Date.now()}_${index}`,
          name: item.price ? `${asString(item.name)} — ${item.price}` : asString(item.name),
          category,
          status: 'regular',
          marginBand: '',
          note: asString(item.description),
          imageAssetId: '',
          imageUrl: '',
        });
      });
    });

    try {
      const payload = {
        storeId: state.storeId,
        restaurantName: mi.restaurantInfo.name || state.profile?.restaurantName || '',
        restaurantLocation: mi.restaurantInfo.address || state.profile?.restaurantLocation || '',
        logoAsset: mi.restaurantInfo.logo || state.profile?.logoAsset || '',
        category: state.profile?.category || '',
        businessType: state.profile?.businessType || '',
        cuisineType: state.profile?.cuisineType || '',
        businessHours: state.profile?.businessHours || '',
        brandTone: state.profile?.brandTone || '',
        menuItems: flatItems.slice(0, 50),
        menuImportedAt: new Date().toISOString(),
        peakHours: state.profile?.peakHours || [],
        slowHours: state.profile?.slowHours || [],
        busiestDays: state.profile?.busiestDays || [],
        primaryGoal: state.profile?.primaryGoal || '',
      };
      state.profile = await dataAdapter.saveRestaurantProfile(payload);
      state.settings = null;
      renderProfile();
      mi.saveStatus = 'saved';
      renderMenuImportRoute();
    } catch (_error) {
      mi.saveStatus = 'Save failed. Please try again.';
      renderMenuImportRoute();
    }
  }

  // ── End Menu Import Flow ──────────────────────────────────────────

  // ── Campaign Builder Flow ──────────────────────────────────────────

  const CB_INTENTS = [
    { id: 'dish', icon: '🍽', title: 'A dish from my menu', desc: 'Feature a specific item' },
    { id: 'deal', icon: '🏷', title: 'A deal or discount', desc: 'Run a promotion to drive traffic' },
    { id: 'new_launch', icon: '✨', title: 'Something new', desc: 'Launch a new item or special' },
    { id: 'surprise', icon: '🚀', title: 'Surprise me', desc: 'Let AI pick the best move' },
  ];

  const CB_OFFER_TYPES = [
    { id: 'discount', icon: '%', title: 'Give a discount' },
    { id: 'bogo', icon: '🎁', title: 'Buy 1, Get 1 Free' },
    { id: 'combo', icon: '📦', title: 'Combo / Bundle deal' },
    { id: 'no_discount', icon: '📣', title: 'Just promote it' },
  ];

  const CB_TONES = [
    { id: 'friendly', title: 'Friendly & Warm', preview: '"Come try our amazing..."', desc: 'Casual, inviting, personal' },
    { id: 'bold', title: 'Bold & Urgent', preview: '"LIMITED TIME: Don\'t miss..."', desc: 'Action-oriented, FOMO' },
    { id: 'premium', title: 'Premium & Elegant', preview: '"An exclusive experience..."', desc: 'Refined, sophisticated' },
  ];

  const CB_AUDIENCE_CHIPS = [
    { id: 'general', label: 'Everyone nearby' },
    { id: 'families', label: 'Families' },
    { id: 'young_professionals', label: 'Young professionals' },
    { id: 'students', label: 'Students' },
    { id: 'tourists', label: 'Tourists & visitors' },
    { id: 'regulars', label: 'Regulars' },
    { id: 'new_nearby', label: 'New in the area' },
  ];

  const CB_CAMPAIGN_GOALS = [
    { id: 'traffic', label: 'More walk-ins' },
    { id: 'aov', label: 'Bigger orders' },
    { id: 'redemption', label: 'Move a dish' },
    { id: 'repeat_visits', label: 'Bring people back' },
  ];

  const CB_CHANNELS = ['Instagram Post', 'Instagram Story', 'In-store QR', 'WhatsApp', 'Flyer'];
  const CB_DURATIONS = [3, 7, 14, 30];

  const CB_FONTS = [
    { id: 'modern',  label: 'Modern',  family: "'Inter', 'Helvetica Neue', sans-serif" },
    { id: 'classic', label: 'Classic',  family: "'Georgia', 'Times New Roman', serif" },
    { id: 'bold',    label: 'Bold',     family: "'Impact', 'Arial Black', sans-serif" },
    { id: 'elegant', label: 'Elegant',  family: "'Playfair Display', 'Garamond', serif" },
    { id: 'playful', label: 'Playful',  family: "'Pacifico', 'Comic Sans MS', cursive" },
  ];

  const CB_HEADLINE_SIZES = [
    { id: 'sm', label: 'S', px: 20 },
    { id: 'md', label: 'M', px: 26 },
    { id: 'lg', label: 'L', px: 34 },
  ];

  const CB_OVERLAY_PRESETS = [
    { id: 'light',  label: 'Light',  opacity: 0.30 },
    { id: 'medium', label: 'Medium', opacity: 0.55 },
    { id: 'dark',   label: 'Dark',   opacity: 0.75 },
  ];

  function profilePrimaryGoalToCampaignGoal(profile) {
    const id = asString(profile?.primaryGoal, '');
    const row = WIZARD_GOALS.find((g) => g.id === id);
    return row ? row.campaignGoal : 'traffic';
  }

  function normalizeBuilderAudience(slug) {
    return CB_AUDIENCE_CHIPS.some((c) => c.id === slug) ? slug : 'general';
  }

  function resetCampaignBuilder() {
    const profile = state.profile || state.growthHub?.profile || {};
    const defaultAudience = normalizeBuilderAudience(asString(profile.audiencePrimary, 'general'));
    const defaultGoal = asString(profilePrimaryGoalToCampaignGoal(profile), 'traffic');
    state.campaignBuilder = {
      step: 1, intent: '', selectedItem: '', selectedItemId: '', offerType: '', discountValue: '',
      comboDescription: '', tone: '', generatedPoster: '', headline: '', offerLine: '', cta: '',
      channels: ['Instagram Post', 'In-store QR'], duration: 7, qrDataUrl: '',
      processingPhase: '', generating: false, publishStatus: '', errorMessage: '',
      imageKeywords: '', showPosterPreview: false,
      posterFont: 'modern', headlineColor: '#ffffff', offerColor: '#ffffff',
      ctaBgColor: '#ffffff', ctaTextColor: '#111111', overlayIntensity: 'medium',
      headlineSize: 'md',
      smartPresetId: '',
      duplicateSourceCampaignId: '',
      audiencePrimary: defaultAudience,
      campaignGoal: CB_CAMPAIGN_GOALS.some((g) => g.id === defaultGoal) ? defaultGoal : 'traffic',
      flashNotice: '',
      flashTone: 'success',
      dragPositions: {
        badge:  { x: 5,  y: 4  },
        text:   { x: 5,  y: 60 },
        action: { x: 5,  y: 82 },
      },
    };
  }

  function mapApiOfferTypeToCbOffer(offer) {
    const t = asString(offer.type, '').toLowerCase();
    const reward = asString(offer.reward, '').toLowerCase();
    if (t.includes('bogo') || reward.includes('buy 1') || reward.includes('bogo')) return 'bogo';
    if (t.includes('combo') || t.includes('bundle')) return 'combo';
    if (t.includes('percentage') || t.includes('%') || offer.discountValue != null || reward.includes('%')) return 'discount';
    return 'no_discount';
  }

  function applyDuplicatedOfferToCampaignBuilder(offer) {
    if (!offer || typeof offer !== 'object') return;
    const cb = state.campaignBuilder;
    cb.intent = 'deal';
    cb.offerType = mapApiOfferTypeToCbOffer(offer);
    const rawName = asString(offer.name, 'Campaign');
    const name = rawName.replace(/\s+Copy\s*$/i, '').trim() || rawName;
    cb.selectedItem = name;
    cb.selectedItemId = asString(offer.eligibleItem, '') || '';
    cb.headline = rawName;
    cb.offerLine = asString(offer.reward, '');
    if (cb.offerType === 'discount') {
      const dv = offer.discountValue;
      cb.discountValue = dv != null && dv !== ''
        ? (String(dv).includes('%') ? String(dv) : `${dv}% Off`)
        : (cb.offerLine || '10% Off');
    } else {
      cb.discountValue = '';
    }
    if (cb.offerType === 'combo' || cb.offerType === 'bogo') {
      cb.comboDescription = cb.offerLine || name;
    } else {
      cb.comboDescription = '';
    }
    const ch = offer.selectedChannels;
    cb.channels = Array.isArray(ch) && ch.length ? [...ch] : ['Instagram Post', 'In-store QR'];
    const cg = asString(offer.campaignGoal, 'traffic');
    cb.campaignGoal = CB_CAMPAIGN_GOALS.some((g) => g.id === cg) ? cg : 'traffic';
    cb.audiencePrimary = normalizeBuilderAudience(asString(offer.audiencePrimary, 'general'));
    cb.duplicateSourceCampaignId = asString(offer.clonedFromOfferId, asString(offer.id, ''));
    cb.tone = 'friendly';
    cb.step = 2;
    cb.flashNotice = 'Draft saved—review details and publish when ready.';
    cb.flashTone = 'success';
  }

  function renderCbStep1() {
    const cb = state.campaignBuilder;
    const ownerName = state.profile?.restaurantName || 'there';
    const menuItems = state.profile?.menuItems || [];
    const grouped = {};
    menuItems.forEach((item) => {
      const cat = { starter: 'Starters', main: 'Main Course', drink: 'Drinks', dessert: 'Desserts' }[item.category] || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    return `
      <section class="pp-cb-step pp-cb-step1">
        <h1 class="pp-cb-greeting">Hey ${escapeHtml(ownerName)}, let's create something great.</h1>
        <p class="pp-cb-subtitle">What would you like to promote today?</p>
        <div class="pp-cb-intent-grid">
          ${CB_INTENTS.map((intent) => `
            <button type="button" class="pp-cb-intent-card${cb.intent === intent.id ? ' active' : ''}" data-cb-intent="${intent.id}">
              <span class="pp-cb-intent-icon">${intent.icon}</span>
              <strong>${intent.title}</strong>
              <span class="pp-cb-intent-desc">${intent.desc}</span>
            </button>
          `).join('')}
        </div>
        ${cb.intent && cb.intent !== 'surprise' ? `
          <div class="pp-cb-item-picker pp-cb-reveal">
            <h2 class="pp-cb-section-title">Pick the star of your campaign</h2>
            ${menuItems.length ? Object.entries(grouped).map(([cat, items]) => `
              <div class="pp-cb-item-group">
                <p class="pp-cb-item-group-label">${escapeHtml(cat)}</p>
                <div class="pp-cb-item-chips">
                  ${items.map((item) => `
                    <button type="button" class="pp-cb-item-chip${cb.selectedItem === item.name ? ' active' : ''}" data-cb-item="${escapeHtml(item.name)}" data-cb-item-id="${escapeHtml(item.id || '')}">${escapeHtml(item.name)}</button>
                  `).join('')}
                </div>
              </div>
            `).join('') : '<p class="pp-cb-empty-hint">No menu items saved yet. Type your item below.</p>'}
            <div class="pp-cb-custom-input">
              <input type="text" id="cbCustomItem" class="pp-cb-input" placeholder="Or type your own item name…" value="${escapeHtml(cb.selectedItemId ? '' : cb.selectedItem)}" />
            </div>
          </div>
        ` : ''}
        ${cb.intent === 'surprise' ? `
          <div class="pp-cb-surprise-note pp-cb-reveal">
            <p>We'll pick the best item and offer based on your menu and past performance.</p>
          </div>
        ` : ''}
      </section>
    `;
  }

  function renderCbStep2() {
    const cb = state.campaignBuilder;
    return `
      <section class="pp-cb-step pp-cb-step2">
        <h1 class="pp-cb-greeting">How should we frame this?</h1>
        <p class="pp-cb-subtitle">Who you are talking to and what you want this week shape the poster and words — then pick your offer and tone.</p>

        <h2 class="pp-cb-section-title">Who should this speak to?</h2>
        <p class="pp-cb-hint">One tap. We use this for copy and photo mood only — no fake stats.</p>
        <div class="pp-cb-context-chips">
          ${CB_AUDIENCE_CHIPS.map((a) => `
            <button type="button" class="pp-cb-context-chip${cb.audiencePrimary === a.id ? ' active' : ''}" data-cb-audience="${a.id}">${escapeHtml(a.label)}</button>
          `).join('')}
        </div>

        <h2 class="pp-cb-section-title" style="margin-top:24px">What do you want this campaign to do?</h2>
        <div class="pp-cb-context-chips">
          ${CB_CAMPAIGN_GOALS.map((g) => `
            <button type="button" class="pp-cb-context-chip${cb.campaignGoal === g.id ? ' active' : ''}" data-cb-campaign-goal="${g.id}">${escapeHtml(g.label)}</button>
          `).join('')}
        </div>

        <h2 class="pp-cb-section-title" style="margin-top:28px">What kind of offer?</h2>
        <div class="pp-cb-offer-grid">
          ${CB_OFFER_TYPES.map((o) => `
            <button type="button" class="pp-cb-offer-card${cb.offerType === o.id ? ' active' : ''}" data-cb-offer="${o.id}">
              <span class="pp-cb-offer-icon">${o.icon}</span>
              <strong>${o.title}</strong>
            </button>
          `).join('')}
        </div>

        ${cb.offerType === 'discount' ? `
          <div class="pp-cb-discount-pills pp-cb-reveal">
            <p class="pp-cb-pill-label">How much off?</p>
            <div class="pp-cb-pills">
              ${['10%', '15%', '20%', '25%'].map((v) => `
                <button type="button" class="pp-cb-pill${cb.discountValue === v ? ' active' : ''}" data-cb-discount="${v}">${v}</button>
              `).join('')}
              <input type="text" class="pp-cb-pill-input" id="cbCustomDiscount" placeholder="Custom" value="${!['10%', '15%', '20%', '25%'].includes(cb.discountValue) ? escapeHtml(cb.discountValue) : ''}" />
            </div>
          </div>
        ` : ''}

        ${cb.offerType === 'combo' ? `
          <div class="pp-cb-combo-input pp-cb-reveal">
            <input type="text" class="pp-cb-input" id="cbComboDesc" placeholder="Describe the combo (e.g. 2 tacos + drink for $9.99)" value="${escapeHtml(cb.comboDescription)}" />
          </div>
        ` : ''}

        <h2 class="pp-cb-section-title" style="margin-top:32px">What tone fits your brand?</h2>
        <div class="pp-cb-tone-grid">
          ${CB_TONES.map((t) => `
            <button type="button" class="pp-cb-tone-card${cb.tone === t.id ? ' active' : ''}" data-cb-tone="${t.id}">
              <strong>${t.title}</strong>
              <span class="pp-cb-tone-preview">${t.preview}</span>
              <span class="pp-cb-tone-desc">${t.desc}</span>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderCbStep3() {
    const phase = state.campaignBuilder.processingPhase;
    const phases = ['Understanding your restaurant…', 'Designing your poster…', 'Writing campaign copy…', 'Generating your QR code…'];
    return `
      <section class="pp-cb-step pp-cb-step3">
        <div class="pp-cb-processing-visual">
          <div class="pp-cb-spinner"></div>
        </div>
        <h2 class="pp-cb-processing-title">${escapeHtml(phase || phases[0])}</h2>
        <p class="pp-cb-subtitle">This usually takes a few seconds. AI is creating everything for you.</p>
        <div class="pp-cb-processing-steps">
          ${phases.map((p, i) => {
            const currentIdx = phases.indexOf(phase);
            const isDone = i < currentIdx;
            const isActive = p === phase;
            return `<div class="pp-cb-processing-step${isDone ? ' done' : ''}${isActive ? ' active' : ''}"><span>${isDone ? '✓' : (isActive ? '◉' : '○')}</span> ${escapeHtml(p)}</div>`;
          }).join('')}
        </div>
      </section>
    `;
  }

  function getCbPosterStyles(cb) {
    const font = CB_FONTS.find((f) => f.id === cb.posterFont) || CB_FONTS[0];
    const overlay = CB_OVERLAY_PRESETS.find((o) => o.id === cb.overlayIntensity) || CB_OVERLAY_PRESETS[1];
    const hSize = CB_HEADLINE_SIZES.find((s) => s.id === cb.headlineSize) || CB_HEADLINE_SIZES[1];
    return {
      fontFamily: font.family,
      headlineColor: cb.headlineColor || '#ffffff',
      offerColor: cb.offerColor || '#ffffff',
      ctaBgColor: cb.ctaBgColor || '#ffffff',
      ctaTextColor: cb.ctaTextColor || '#111111',
      headlinePx: hSize.px,
      overlayGradient: `linear-gradient(180deg, rgba(0,0,0,${overlay.opacity}) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,${overlay.opacity + 0.15}) 100%)`,
    };
  }

  function buildComposedPosterHtml(cb, { sizeClass, headlinePxOverride, draggable } = {}) {
    const restName = state.profile?.restaurantName || '';
    const restAddress = state.profile?.restaurantLocation || '';
    const logoAsset = state.profile?.logoAsset || '';
    const initials = restName ? restName.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() : 'PP';
    const s = getCbPosterStyles(cb);
    const hPx = headlinePxOverride || s.headlinePx;
    const dp = cb.dragPositions || { badge: { x: 5, y: 4 }, text: { x: 5, y: 60 }, action: { x: 5, y: 82 } };
    const dragAttr = draggable ? 'data-drag' : 'data-drag-static';
    const dragClass = draggable ? ' pp-cb-draggable' : '';

    return `
      <div class="pp-cb-composed-poster${sizeClass ? ' ' + sizeClass : ''}">
        ${cb.generatedPoster ? `<img src="${cb.generatedPoster}" alt="" class="pp-cb-composed-bg" />` : `<div class="pp-cb-composed-bg-fallback"></div>`}
        <div class="pp-cb-composed-overlay pp-cb-drag-canvas" style="background:${s.overlayGradient}; font-family:${s.fontFamily}">

          <div class="pp-cb-drag-group${dragClass}" ${dragAttr}="badge" style="left:${dp.badge.x}%; top:${dp.badge.y}%">
            <div class="pp-cb-composed-badge">
              ${logoAsset ? `<img src="${logoAsset}" alt="" class="pp-cb-composed-logo" />` : `<span class="pp-cb-composed-initials">${initials}</span>`}
              <span class="pp-cb-composed-rest-name">${escapeHtml(restName)}</span>
            </div>
          </div>

          <div class="pp-cb-drag-group${dragClass}" ${dragAttr}="text" style="left:${dp.text.x}%; top:${dp.text.y}%">
            <h2 class="pp-cb-composed-headline" style="color:${s.headlineColor}; font-size:${hPx}px; font-family:${s.fontFamily}">${escapeHtml(cb.headline)}</h2>
            <p class="pp-cb-composed-offer" style="color:${s.offerColor}; font-family:${s.fontFamily}">${escapeHtml(cb.offerLine)}</p>
            ${restAddress ? `<p class="pp-cb-composed-address">${escapeHtml(restAddress)}</p>` : ''}
          </div>

          <div class="pp-cb-drag-group${dragClass}" ${dragAttr}="action" style="left:${dp.action.x}%; top:${dp.action.y}%">
            <div class="pp-cb-composed-footer">
              <div class="pp-cb-composed-cta" style="background:${s.ctaBgColor}; color:${s.ctaTextColor}">${escapeHtml(cb.cta)}</div>
              ${cb.qrDataUrl ? `<img src="${cb.qrDataUrl}" alt="QR" class="pp-cb-composed-qr" />` : ''}
            </div>
          </div>

        </div>
      </div>
    `;
  }

  function renderCbStep4() {
    const cb = state.campaignBuilder;

    return `
      <section class="pp-cb-step pp-cb-step4">
        <h1 class="pp-cb-greeting">Your campaign is ready</h1>
        <p class="pp-cb-subtitle">Edit the text and style — the poster updates live.</p>

        <div class="pp-cb-poster-hero">
          ${buildComposedPosterHtml(cb, { draggable: true })}
          <p class="pp-cb-drag-hint">Drag the text, badge, or button to reposition them on the poster</p>
          <div class="pp-cb-poster-actions">
            <button type="button" class="pp-cb-regen-poster" data-cb-action="regen-poster">↻ Try a different photo</button>
            <button type="button" class="pp-cb-preview-btn" data-cb-action="preview-poster">⛶ Full preview</button>
            <button type="button" class="pp-cb-download-btn" data-cb-action="download-poster">⬇ Download poster</button>
          </div>
        </div>

        <div class="pp-cb-image-keywords">
          <label class="pp-cb-label">Refine the photo</label>
          <p class="pp-cb-hint">Describe what you want to see — the AI will regenerate the food photo based on your words.</p>
          <div class="pp-cb-keywords-row">
            <input type="text" class="pp-cb-input" id="cbImageKeywords" placeholder="e.g. Indian Chai, steaming hot, rustic background" value="${escapeHtml(cb.imageKeywords)}" />
            <button type="button" class="pp-primary-btn pp-cb-keywords-go" data-cb-action="regen-keywords" ${cb.generating ? 'disabled' : ''}>Generate</button>
          </div>
        </div>

        <div class="pp-cb-style-panel">
          <label class="pp-cb-label">Poster style</label>
          <div class="pp-cb-style-grid">

            <div class="pp-cb-style-row">
              <span class="pp-cb-style-label">Font</span>
              <div class="pp-cb-font-swatches">
                ${CB_FONTS.map((f) => `
                  <button type="button" class="pp-cb-font-swatch${cb.posterFont === f.id ? ' active' : ''}" data-cb-font="${f.id}" style="font-family:${f.family}">${f.label}</button>
                `).join('')}
              </div>
            </div>

            <div class="pp-cb-style-row">
              <span class="pp-cb-style-label">Headline size</span>
              <div class="pp-cb-pills pp-cb-size-pills">
                ${CB_HEADLINE_SIZES.map((sz) => `
                  <button type="button" class="pp-cb-pill${cb.headlineSize === sz.id ? ' active' : ''}" data-cb-hsize="${sz.id}">${sz.label}</button>
                `).join('')}
              </div>
            </div>

            <div class="pp-cb-style-row">
              <span class="pp-cb-style-label">Headline color</span>
              <div class="pp-cb-color-group">
                <input type="color" class="pp-cb-color-pick" id="cbHeadlineColor" value="${cb.headlineColor}" />
                <span class="pp-cb-color-hex">${cb.headlineColor}</span>
              </div>
            </div>

            <div class="pp-cb-style-row">
              <span class="pp-cb-style-label">Offer text color</span>
              <div class="pp-cb-color-group">
                <input type="color" class="pp-cb-color-pick" id="cbOfferColor" value="${cb.offerColor}" />
                <span class="pp-cb-color-hex">${cb.offerColor}</span>
              </div>
            </div>

            <div class="pp-cb-style-row">
              <span class="pp-cb-style-label">Button color</span>
              <div class="pp-cb-color-group">
                <input type="color" class="pp-cb-color-pick" id="cbCtaBgColor" value="${cb.ctaBgColor}" />
                <span class="pp-cb-color-hex">${cb.ctaBgColor}</span>
              </div>
            </div>

            <div class="pp-cb-style-row">
              <span class="pp-cb-style-label">Button text</span>
              <div class="pp-cb-color-group">
                <input type="color" class="pp-cb-color-pick" id="cbCtaTextColor" value="${cb.ctaTextColor}" />
                <span class="pp-cb-color-hex">${cb.ctaTextColor}</span>
              </div>
            </div>

            <div class="pp-cb-style-row">
              <span class="pp-cb-style-label">Overlay</span>
              <div class="pp-cb-pills">
                ${CB_OVERLAY_PRESETS.map((o) => `
                  <button type="button" class="pp-cb-pill${cb.overlayIntensity === o.id ? ' active' : ''}" data-cb-overlay="${o.id}">${o.label}</button>
                `).join('')}
              </div>
            </div>

          </div>
        </div>

        <div class="pp-cb-edit-section">
          <div class="pp-cb-edit-field">
            <label class="pp-cb-label">Headline</label>
            <input type="text" class="pp-cb-input" id="cbHeadline" value="${escapeHtml(cb.headline)}" />
          </div>
          <div class="pp-cb-edit-field">
            <label class="pp-cb-label">Offer line</label>
            <input type="text" class="pp-cb-input" id="cbOfferLine" value="${escapeHtml(cb.offerLine)}" />
          </div>
          <div class="pp-cb-edit-field">
            <label class="pp-cb-label">Call to action</label>
            <input type="text" class="pp-cb-input" id="cbCta" value="${escapeHtml(cb.cta)}" />
          </div>
        </div>

        <div class="pp-cb-tone-switch">
          <label class="pp-cb-label">Tone</label>
          <div class="pp-cb-pills">
            ${CB_TONES.map((t) => `
              <button type="button" class="pp-cb-pill${cb.tone === t.id ? ' active' : ''}" data-cb-tone-switch="${t.id}">${t.title.split(' &')[0]}</button>
            `).join('')}
          </div>
        </div>

        <div class="pp-cb-channels-section">
          <label class="pp-cb-label">Channels</label>
          <div class="pp-cb-channel-chips">
            ${CB_CHANNELS.map((ch) => `
              <button type="button" class="pp-cb-channel-chip${cb.channels.includes(ch) ? ' active' : ''}" data-cb-channel="${escapeHtml(ch)}">${escapeHtml(ch)}</button>
            `).join('')}
          </div>
        </div>

        <div class="pp-cb-duration-section">
          <label class="pp-cb-label">Duration</label>
          <div class="pp-cb-pills">
            ${CB_DURATIONS.map((d) => `
              <button type="button" class="pp-cb-pill${cb.duration === d ? ' active' : ''}" data-cb-duration="${d}">${d} days</button>
            `).join('')}
          </div>
        </div>

        <div class="pp-cb-poster-modal${cb.showPosterPreview ? ' visible' : ''}" id="cbPosterModal">
          <div class="pp-cb-poster-modal-backdrop" data-cb-action="close-preview"></div>
          <div class="pp-cb-poster-modal-body">
            <button type="button" class="pp-cb-poster-modal-close" data-cb-action="close-preview">✕</button>
            ${buildComposedPosterHtml(cb, { sizeClass: 'pp-cb-composed-full', draggable: true })}
          </div>
        </div>
      </section>
    `;
  }

  function buildComposedPosterMini(cb) {
    return buildComposedPosterHtml(cb, { sizeClass: 'pp-cb-composed-mini', headlinePxOverride: 18 });
  }

  function renderCbStep5() {
    const cb = state.campaignBuilder;
    if (cb.publishStatus === 'published') {
      return `
        <section class="pp-cb-step pp-cb-step5 pp-cb-success">
          <div class="pp-cb-success-icon">✓</div>
          <h1>Campaign launched!</h1>
          <p class="pp-cb-subtitle">Your campaign is now live and ready to drive traffic.</p>
          <div class="pp-cb-success-summary">
            ${buildComposedPosterMini(cb)}
            <div class="pp-cb-success-details">
              <p><strong>${escapeHtml(cb.headline)}</strong></p>
              <p>${escapeHtml(cb.offerLine)}</p>
              <p class="pp-cb-subtle">${cb.channels.join(', ')} · ${cb.duration} days</p>
            </div>
          </div>
          <div class="pp-cb-success-actions">
            <button type="button" class="pp-primary-btn" data-cb-action="download-poster">⬇ Download Poster</button>
            <button type="button" class="pp-secondary-btn" data-cb-action="go-home">Go to Dashboard</button>
            <button type="button" class="pp-secondary-btn" data-cb-action="create-another">Create Another</button>
          </div>
          <p class="pp-cb-future-hint">Coming soon: Post directly to Instagram, Facebook & WhatsApp</p>
        </section>
      `;
    }

    return `
      <section class="pp-cb-step pp-cb-step5">
        <h1 class="pp-cb-greeting">Ready to launch?</h1>
        <p class="pp-cb-subtitle">Review your campaign one last time.</p>
        <div class="pp-cb-final-summary">
          ${buildComposedPosterMini(cb)}
          <div class="pp-cb-summary-details">
            <div class="pp-cb-summary-row"><span class="pp-cb-label">Headline</span><span>${escapeHtml(cb.headline)}</span></div>
            <div class="pp-cb-summary-row"><span class="pp-cb-label">Offer</span><span>${escapeHtml(cb.offerLine)}</span></div>
            <div class="pp-cb-summary-row"><span class="pp-cb-label">CTA</span><span>${escapeHtml(cb.cta)}</span></div>
            <div class="pp-cb-summary-row"><span class="pp-cb-label">Channels</span><span>${cb.channels.join(', ')}</span></div>
            <div class="pp-cb-summary-row"><span class="pp-cb-label">Duration</span><span>${cb.duration} days</span></div>
          </div>
        </div>
        ${cb.publishStatus === 'error' ? '<p class="pp-cb-error">Something went wrong. Please try again.</p>' : ''}
        ${cb.publishStatus === 'publishing' ? '<p class="pp-cb-status">Launching your campaign…</p>' : ''}
        <div class="pp-cb-publish-actions">
          <button type="button" class="pp-primary-btn pp-cb-launch-btn" data-cb-action="publish" ${cb.publishStatus === 'publishing' ? 'disabled' : ''}>Launch Campaign</button>
          <button type="button" class="pp-secondary-btn" data-cb-action="download-poster">⬇ Download Poster</button>
          <button type="button" class="pp-secondary-btn" data-cb-action="save-draft" ${cb.publishStatus === 'publishing' ? 'disabled' : ''}>Save as Draft</button>
        </div>
      </section>
    `;
  }

  function renderCampaignBuilderRoute() {
    const cb = state.campaignBuilder;
    const flash = asString(cb.flashNotice);
    const flashTone = asString(cb.flashTone, 'success');
    cb.flashNotice = '';
    cb.flashTone = 'success';
    let stepHtml = '';
    if (cb.step === 1) stepHtml = renderCbStep1();
    else if (cb.step === 2) stepHtml = renderCbStep2();
    else if (cb.step === 3) stepHtml = renderCbStep3();
    else if (cb.step === 4) stepHtml = renderCbStep4();
    else if (cb.step === 5) stepHtml = renderCbStep5();

    const showBack = cb.step > 1 && cb.step !== 3 && cb.publishStatus !== 'published';
    const showNext = cb.step === 1 || cb.step === 2 || cb.step === 4;
    const nextLabel = cb.step === 2 ? 'Create My Campaign' : (cb.step === 4 ? 'Preview & Continue →' : 'Next');
    const stepLabels = ['Goal', 'Offer & Tone', 'Creating…', 'Review', 'Launch'];
    const flashHtml = flash
      ? `<div class="pp-cb-flash pp-cb-flash-${escapeHtml(flashTone)}" role="status">${escapeHtml(flash)}</div>`
      : '';

    refs.routeMount.innerHTML = `
      <div class="pp-cb-shell">
        <div class="pp-cb-topbar">
          ${showBack ? '<button type="button" class="pp-cb-back-btn" data-cb-action="back">← Back</button>' : '<span></span>'}
          <div class="pp-cb-progress">
            ${stepLabels.map((label, i) => {
              const stepNum = i + 1;
              const isCurrent = stepNum === cb.step;
              const isDone = stepNum < cb.step;
              return `<span class="pp-cb-progress-pill${isCurrent ? ' active' : ''}${isDone ? ' done' : ''}">${escapeHtml(label)}</span>`;
            }).join('')}
          </div>
          <span></span>
        </div>
        <div class="pp-cb-content">
          ${flashHtml}
          ${stepHtml}
        </div>
        ${showNext ? `
          <div class="pp-cb-footer">
            ${cb.step > 1 ? '<button type="button" class="pp-secondary-btn" data-cb-action="back">Back</button>' : '<span></span>'}
            <button type="button" class="pp-primary-btn" data-cb-action="next">${nextLabel}</button>
          </div>
        ` : ''}
      </div>
    `;

    bindCampaignBuilderEvents();
  }

  function bindCampaignBuilderEvents() {
    const cb = state.campaignBuilder;

    refs.routeMount.querySelectorAll('[data-cb-action]').forEach((btn) => {
      btn.addEventListener('click', () => handleCbAction(btn.dataset.cbAction));
    });

    refs.routeMount.querySelectorAll('[data-cb-intent]').forEach((btn) => {
      btn.addEventListener('click', () => {
        cb.intent = btn.dataset.cbIntent;
        if (cb.intent === 'surprise') {
          const items = state.profile?.menuItems || [];
          const bestSeller = items.find((i) => i.status === 'best_seller') || items[0];
          cb.selectedItem = bestSeller?.name || 'Chef\'s Special';
          cb.selectedItemId = bestSeller?.id || '';
        } else {
          cb.selectedItem = '';
          cb.selectedItemId = '';
        }
        renderCampaignBuilderRoute();
      });
    });

    refs.routeMount.querySelectorAll('[data-cb-item]').forEach((btn) => {
      btn.addEventListener('click', () => {
        cb.selectedItem = btn.dataset.cbItem;
        cb.selectedItemId = btn.dataset.cbItemId || '';
        const customInput = refs.routeMount.querySelector('#cbCustomItem');
        if (customInput) customInput.value = '';
        renderCampaignBuilderRoute();
      });
    });

    const customItemInput = refs.routeMount.querySelector('#cbCustomItem');
    if (customItemInput) {
      customItemInput.addEventListener('input', () => {
        cb.selectedItem = customItemInput.value.trim();
        cb.selectedItemId = '';
      });
    }

    refs.routeMount.querySelectorAll('[data-cb-offer]').forEach((btn) => {
      btn.addEventListener('click', () => {
        cb.offerType = btn.dataset.cbOffer;
        if (cb.offerType !== 'discount') cb.discountValue = '';
        if (cb.offerType !== 'combo') cb.comboDescription = '';
        renderCampaignBuilderRoute();
      });
    });

    refs.routeMount.querySelectorAll('[data-cb-discount]').forEach((btn) => {
      btn.addEventListener('click', () => {
        cb.discountValue = btn.dataset.cbDiscount;
        renderCampaignBuilderRoute();
      });
    });

    const customDiscount = refs.routeMount.querySelector('#cbCustomDiscount');
    if (customDiscount) {
      customDiscount.addEventListener('input', () => { cb.discountValue = customDiscount.value.trim(); });
    }

    const comboInput = refs.routeMount.querySelector('#cbComboDesc');
    if (comboInput) {
      comboInput.addEventListener('input', () => { cb.comboDescription = comboInput.value.trim(); });
    }

    refs.routeMount.querySelectorAll('[data-cb-tone]').forEach((btn) => {
      btn.addEventListener('click', () => {
        cb.tone = btn.dataset.cbTone;
        renderCampaignBuilderRoute();
      });
    });

    refs.routeMount.querySelectorAll('[data-cb-audience]').forEach((btn) => {
      btn.addEventListener('click', () => {
        cb.audiencePrimary = normalizeBuilderAudience(btn.dataset.cbAudience);
        renderCampaignBuilderRoute();
      });
    });

    refs.routeMount.querySelectorAll('[data-cb-campaign-goal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const gid = btn.dataset.cbCampaignGoal;
        cb.campaignGoal = CB_CAMPAIGN_GOALS.some((g) => g.id === gid) ? gid : 'traffic';
        renderCampaignBuilderRoute();
      });
    });

    if (cb.step === 4) {
      const headlineInput = refs.routeMount.querySelector('#cbHeadline');
      const offerLineInput = refs.routeMount.querySelector('#cbOfferLine');
      const ctaInput = refs.routeMount.querySelector('#cbCta');
      function liveSync(input, stateKey, posterSelector) {
        if (!input) return;
        const handler = () => {
          cb[stateKey] = input.value;
          const el = refs.routeMount.querySelector(posterSelector);
          if (el) el.textContent = input.value;
        };
        input.addEventListener('input', handler);
        input.addEventListener('change', handler);
        input.addEventListener('blur', handler);
      }
      liveSync(headlineInput, 'headline', '.pp-cb-composed-headline');
      liveSync(offerLineInput, 'offerLine', '.pp-cb-composed-offer');
      liveSync(ctaInput, 'cta', '.pp-cb-composed-cta');

      const kwInput = refs.routeMount.querySelector('#cbImageKeywords');
      if (kwInput) {
        kwInput.addEventListener('input', () => { cb.imageKeywords = kwInput.value; });
        kwInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); handleCbAction('regen-keywords'); }
        });
      }

      function refreshPosterLive() {
        const poster = refs.routeMount.querySelector('.pp-cb-step4 > .pp-cb-poster-hero > .pp-cb-composed-poster');
        if (!poster) return;
        const s = getCbPosterStyles(cb);
        const overlay = poster.querySelector('.pp-cb-composed-overlay');
        if (overlay) { overlay.style.background = s.overlayGradient; overlay.style.fontFamily = s.fontFamily; }
        const hl = poster.querySelector('.pp-cb-composed-headline');
        if (hl) { hl.style.color = s.headlineColor; hl.style.fontSize = s.headlinePx + 'px'; hl.style.fontFamily = s.fontFamily; }
        const ofr = poster.querySelector('.pp-cb-composed-offer');
        if (ofr) { ofr.style.color = s.offerColor; ofr.style.fontFamily = s.fontFamily; }
        const cta = poster.querySelector('.pp-cb-composed-cta');
        if (cta) { cta.style.background = s.ctaBgColor; cta.style.color = s.ctaTextColor; }
      }

      refs.routeMount.querySelectorAll('[data-cb-font]').forEach((btn) => {
        btn.addEventListener('click', () => { cb.posterFont = btn.dataset.cbFont; refs.routeMount.querySelectorAll('[data-cb-font]').forEach((b) => b.classList.toggle('active', b.dataset.cbFont === cb.posterFont)); refreshPosterLive(); });
      });

      refs.routeMount.querySelectorAll('[data-cb-hsize]').forEach((btn) => {
        btn.addEventListener('click', () => { cb.headlineSize = btn.dataset.cbHsize; refs.routeMount.querySelectorAll('[data-cb-hsize]').forEach((b) => b.classList.toggle('active', b.dataset.cbHsize === cb.headlineSize)); refreshPosterLive(); });
      });

      refs.routeMount.querySelectorAll('[data-cb-overlay]').forEach((btn) => {
        btn.addEventListener('click', () => { cb.overlayIntensity = btn.dataset.cbOverlay; refs.routeMount.querySelectorAll('[data-cb-overlay]').forEach((b) => b.classList.toggle('active', b.dataset.cbOverlay === cb.overlayIntensity)); refreshPosterLive(); });
      });

      const headlineColorInput = refs.routeMount.querySelector('#cbHeadlineColor');
      if (headlineColorInput) headlineColorInput.addEventListener('input', () => {
        cb.headlineColor = headlineColorInput.value;
        const hex = headlineColorInput.closest('.pp-cb-color-group')?.querySelector('.pp-cb-color-hex');
        if (hex) hex.textContent = headlineColorInput.value;
        refreshPosterLive();
      });

      const offerColorInput = refs.routeMount.querySelector('#cbOfferColor');
      if (offerColorInput) offerColorInput.addEventListener('input', () => {
        cb.offerColor = offerColorInput.value;
        const hex = offerColorInput.closest('.pp-cb-color-group')?.querySelector('.pp-cb-color-hex');
        if (hex) hex.textContent = offerColorInput.value;
        refreshPosterLive();
      });

      const ctaBgInput = refs.routeMount.querySelector('#cbCtaBgColor');
      if (ctaBgInput) ctaBgInput.addEventListener('input', () => {
        cb.ctaBgColor = ctaBgInput.value;
        const hex = ctaBgInput.closest('.pp-cb-color-group')?.querySelector('.pp-cb-color-hex');
        if (hex) hex.textContent = ctaBgInput.value;
        refreshPosterLive();
      });

      const ctaTextInput = refs.routeMount.querySelector('#cbCtaTextColor');
      if (ctaTextInput) ctaTextInput.addEventListener('input', () => {
        cb.ctaTextColor = ctaTextInput.value;
        const hex = ctaTextInput.closest('.pp-cb-color-group')?.querySelector('.pp-cb-color-hex');
        if (hex) hex.textContent = ctaTextInput.value;
        refreshPosterLive();
      });

      refs.routeMount.querySelectorAll('[data-cb-tone-switch]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          syncStep4Inputs();
          cb.tone = btn.dataset.cbToneSwitch;
          renderCampaignBuilderRoute();
          const result = await dataAdapter.regenerateCampaignContent({
            regenerateTarget: 'copy', intent: cb.intent, item: cb.selectedItem, offerType: cb.offerType,
            discountValue: cb.discountValue, comboDescription: cb.comboDescription, tone: cb.tone,
            restaurantName: state.profile?.restaurantName || '', cuisineType: state.profile?.cuisineType || '',
            brandTone: state.profile?.brandTone || '', audiencePrimary: cb.audiencePrimary, campaignGoal: cb.campaignGoal,
          });
          if (result.headline) cb.headline = result.headline;
          if (result.offerLine) cb.offerLine = result.offerLine;
          if (result.cta) cb.cta = result.cta;
          renderCampaignBuilderRoute();
        });
      });

      refs.routeMount.querySelectorAll('[data-cb-channel]').forEach((btn) => {
        btn.addEventListener('click', () => {
          syncStep4Inputs();
          const ch = btn.dataset.cbChannel;
          if (cb.channels.includes(ch)) cb.channels = cb.channels.filter((c) => c !== ch);
          else cb.channels.push(ch);
          renderCampaignBuilderRoute();
        });
      });

      refs.routeMount.querySelectorAll('[data-cb-duration]').forEach((btn) => {
        btn.addEventListener('click', () => {
          syncStep4Inputs();
          cb.duration = Number(btn.dataset.cbDuration);
          renderCampaignBuilderRoute();
        });
      });

      initPosterDrag(refs.routeMount, cb);
    }
  }

  let _dragCleanup = null;
  function initPosterDrag(root, cb) {
    if (_dragCleanup) { _dragCleanup(); _dragCleanup = null; }

    let activeEl = null;
    let activeGroup = '';
    let canvas = null;
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;

    function onPointerDown(e) {
      const el = e.target.closest('[data-drag]');
      if (!el || !root.contains(el)) return;
      e.preventDefault();
      activeEl = el;
      activeGroup = el.dataset.drag;
      canvas = el.closest('.pp-cb-drag-canvas');
      if (!canvas) { activeEl = null; return; }
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startX = clientX;
      startY = clientY;
      startLeft = (parseFloat(el.style.left) / 100) * rect.width;
      startTop = (parseFloat(el.style.top) / 100) * rect.height;
      el.classList.add('pp-cb-dragging');
    }

    function onPointerMove(e) {
      if (!activeEl || !canvas) return;
      e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const rect = canvas.getBoundingClientRect();
      let newX = ((startLeft + (clientX - startX)) / rect.width) * 100;
      let newY = ((startTop + (clientY - startY)) / rect.height) * 100;
      newX = Math.max(0, Math.min(85, newX));
      newY = Math.max(0, Math.min(92, newY));
      activeEl.style.left = newX + '%';
      activeEl.style.top = newY + '%';
    }

    function onPointerUp() {
      if (!activeEl) return;
      activeEl.classList.remove('pp-cb-dragging');
      const pctX = parseFloat(activeEl.style.left) || 0;
      const pctY = parseFloat(activeEl.style.top) || 0;
      if (cb.dragPositions && cb.dragPositions[activeGroup]) {
        cb.dragPositions[activeGroup] = { x: Math.round(pctX * 10) / 10, y: Math.round(pctY * 10) / 10 };
      }
      activeEl = null;
      activeGroup = '';
      canvas = null;
    }

    root.addEventListener('mousedown', onPointerDown);
    root.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchend', onPointerUp);

    _dragCleanup = () => {
      root.removeEventListener('mousedown', onPointerDown);
      root.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchend', onPointerUp);
    };
  }

  function syncStep4Inputs() {
    const cb = state.campaignBuilder;
    const h = refs.routeMount?.querySelector('#cbHeadline');
    const o = refs.routeMount?.querySelector('#cbOfferLine');
    const c = refs.routeMount?.querySelector('#cbCta');
    const k = refs.routeMount?.querySelector('#cbImageKeywords');
    const hc = refs.routeMount?.querySelector('#cbHeadlineColor');
    const oc = refs.routeMount?.querySelector('#cbOfferColor');
    const cbg = refs.routeMount?.querySelector('#cbCtaBgColor');
    const ctc = refs.routeMount?.querySelector('#cbCtaTextColor');
    if (h) cb.headline = h.value;
    if (o) cb.offerLine = o.value;
    if (c) cb.cta = c.value;
    if (k) cb.imageKeywords = k.value;
    if (hc) cb.headlineColor = hc.value;
    if (oc) cb.offerColor = oc.value;
    if (cbg) cb.ctaBgColor = cbg.value;
    if (ctc) cb.ctaTextColor = ctc.value;
  }

  async function handleCbAction(action) {
    const cb = state.campaignBuilder;

    if (action === 'back') {
      if (cb.step === 4) syncStep4Inputs();
      if (cb.step > 1) { cb.step -= 1; renderCampaignBuilderRoute(); }
    }
    else if (action === 'next') {
      if (cb.step === 1) {
        if (!cb.intent) { cb.errorMessage = 'Pick what you want to promote.'; renderCampaignBuilderRoute(); return; }
        if (cb.intent !== 'surprise' && !cb.selectedItem) { cb.errorMessage = 'Pick an item or type one in.'; renderCampaignBuilderRoute(); return; }
        cb.errorMessage = '';
        cb.step = 2;
        if (!cb.offerType) {
          cb.offerType = cb.intent === 'deal' ? 'discount' : (cb.intent === 'dish' || cb.intent === 'new_launch' ? 'no_discount' : 'discount');
        }
        if (!cb.tone) cb.tone = 'friendly';
        renderCampaignBuilderRoute();
      }
      else if (cb.step === 2) {
        if (!cb.offerType) { cb.errorMessage = 'Pick an offer type.'; renderCampaignBuilderRoute(); return; }
        if (!cb.tone) { cb.errorMessage = 'Pick a tone.'; renderCampaignBuilderRoute(); return; }
        if (cb.offerType === 'discount' && !cb.discountValue) { cb.errorMessage = 'Pick a discount amount.'; renderCampaignBuilderRoute(); return; }
        cb.errorMessage = '';
        await runCampaignGeneration();
      }
      else if (cb.step === 4) {
        syncStep4Inputs();
        cb.step = 5;
        renderCampaignBuilderRoute();
      }
    }
    else if (action === 'regen-poster' || action === 'regen-keywords') {
      syncStep4Inputs();
      cb.step = 3;
      cb.processingPhase = 'Designing a new photo…';
      renderCampaignBuilderRoute();
      const result = await dataAdapter.regenerateCampaignContent({
        regenerateTarget: 'poster', intent: cb.intent, item: cb.selectedItem, offerType: cb.offerType,
        discountValue: cb.discountValue, comboDescription: cb.comboDescription, tone: cb.tone,
        restaurantName: state.profile?.restaurantName || '', cuisineType: state.profile?.cuisineType || '',
        brandTone: state.profile?.brandTone || '', audiencePrimary: cb.audiencePrimary, campaignGoal: cb.campaignGoal,
        imageKeywords: cb.imageKeywords,
      });
      if (result.posterImageUrl) cb.generatedPoster = result.posterImageUrl;
      cb.step = 4;
      renderCampaignBuilderRoute();
    }
    else if (action === 'preview-poster') {
      cb.showPosterPreview = true;
      const modal = refs.routeMount?.querySelector('#cbPosterModal');
      if (modal) modal.classList.add('visible');
    }
    else if (action === 'close-preview') {
      cb.showPosterPreview = false;
      const modal = refs.routeMount?.querySelector('#cbPosterModal');
      if (modal) modal.classList.remove('visible');
    }
    else if (action === 'publish') {
      cb.publishStatus = 'publishing';
      renderCampaignBuilderRoute();
      try {
        await dataAdapter.createLiveCampaign({
          storeId: state.storeId, restaurantName: state.profile?.restaurantName || '',
          item: cb.selectedItem, offerType: cb.offerType === 'discount' ? `${cb.discountValue} Off` : cb.offerType,
          headline: cb.headline, offerLine: cb.offerLine, cta: cb.cta,
          campaignGoal: cb.campaignGoal, audiencePrimary: cb.audiencePrimary, brandTone: state.profile?.brandTone || '',
          selectedChannels: cb.channels,
        });
        cb.publishStatus = 'published';
        trackFlowCompleted('campaign_publish', { smartPresetId: cb.smartPresetId || undefined });
        renderCampaignBuilderRoute();
      } catch (_error) {
        cb.publishStatus = 'error';
        renderCampaignBuilderRoute();
      }
    }
    else if (action === 'save-draft') {
      cb.publishStatus = 'publishing';
      renderCampaignBuilderRoute();
      try {
        await dataAdapter.createLiveCampaign({
          storeId: state.storeId, restaurantName: state.profile?.restaurantName || '',
          item: cb.selectedItem, offerType: cb.offerType === 'discount' ? `${cb.discountValue} Off` : cb.offerType,
          headline: cb.headline, offerLine: cb.offerLine, cta: cb.cta,
          campaignGoal: cb.campaignGoal, audiencePrimary: cb.audiencePrimary, brandTone: state.profile?.brandTone || '',
          selectedChannels: cb.channels, status: 'draft',
        });
        cb.publishStatus = 'published';
        trackFlowCompleted('campaign_save_draft', { smartPresetId: cb.smartPresetId || undefined });
        renderCampaignBuilderRoute();
      } catch (_error) {
        cb.publishStatus = 'error';
        renderCampaignBuilderRoute();
      }
    }
    else if (action === 'download-poster') {
      if (cb.step === 4) syncStep4Inputs();
      await downloadComposedPoster();
    }
    else if (action === 'go-home') { navigate('home'); }
    else if (action === 'create-another') { resetCampaignBuilder(); renderCampaignBuilderRoute(); }
  }

  async function downloadComposedPoster() {
    const cb = state.campaignBuilder;
    const s = getCbPosterStyles(cb);
    const dp = cb.dragPositions || { badge: { x: 5, y: 4 }, text: { x: 5, y: 60 }, action: { x: 5, y: 82 } };
    const SIZE = 1080;
    const S = SIZE / 420;
    const PAD = 54;
    const MAX_W = SIZE - PAD * 2;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');

    await drawCanvasBg(ctx, cb.generatedPoster, SIZE);

    const overlay = CB_OVERLAY_PRESETS.find((o) => o.id === cb.overlayIntensity) || CB_OVERLAY_PRESETS[1];
    const grad = ctx.createLinearGradient(0, 0, 0, SIZE);
    grad.addColorStop(0, `rgba(0,0,0,${overlay.opacity})`);
    grad.addColorStop(0.35, 'rgba(0,0,0,0.05)');
    grad.addColorStop(0.50, 'rgba(0,0,0,0.05)');
    grad.addColorStop(1, `rgba(0,0,0,${Math.min(overlay.opacity + 0.15, 0.9)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.textBaseline = 'top';
    const restName = state.profile?.restaurantName || '';
    const restAddress = state.profile?.restaurantLocation || '';
    const initials = restName ? restName.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() : 'PP';

    const bX = (dp.badge.x / 100) * SIZE;
    const bY = (dp.badge.y / 100) * SIZE;
    const circleR = 20 * S;
    ctx.font = `600 ${15 * S}px ${s.fontFamily}`;
    const nameW = ctx.measureText(restName).width;
    const pillW = circleR * 2 + 12 * S + nameW + 16 * S;
    const pillH = circleR * 2 + 8 * S;

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, bX, bY, pillW, pillH, pillH / 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath();
    ctx.arc(bX + 4 * S + circleR, bY + 4 * S + circleR, circleR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${14 * S}px ${s.fontFamily}`;
    const iniW = ctx.measureText(initials).width;
    ctx.fillText(initials, bX + 4 * S + circleR - iniW / 2, bY + 4 * S + circleR - 7 * S);

    ctx.fillStyle = '#ffffff';
    ctx.font = `600 ${15 * S}px ${s.fontFamily}`;
    ctx.fillText(restName, bX + circleR * 2 + 12 * S, bY + pillH / 2 - 8 * S);

    const tX = (dp.text.x / 100) * SIZE;
    const tY = (dp.text.y / 100) * SIZE;
    const headlinePx = Math.round(s.headlinePx * S);
    ctx.fillStyle = s.headlineColor;
    ctx.font = `800 ${headlinePx}px ${s.fontFamily}`;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10 * S;
    const hlHeight = wrapText(ctx, cb.headline, tX, tY, MAX_W - tX + PAD, headlinePx * 1.15);

    const offerPx = Math.round(15 * S);
    const offerY = tY + hlHeight + 10 * S;
    ctx.fillStyle = s.offerColor;
    ctx.font = `500 ${offerPx}px ${s.fontFamily}`;
    const offerHeight = wrapText(ctx, cb.offerLine, tX, offerY, MAX_W - tX + PAD, offerPx * 1.3);

    if (restAddress) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = `400 ${Math.round(11 * S)}px ${s.fontFamily}`;
      ctx.fillText(restAddress, tX, offerY + offerHeight + 8 * S);
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    const aX = (dp.action.x / 100) * SIZE;
    const aY = (dp.action.y / 100) * SIZE;
    const ctaPx = Math.round(14 * S);
    ctx.font = `700 ${ctaPx}px ${s.fontFamily}`;
    const ctaPadX = 24 * S;
    const ctaPadY = 12 * S;
    const ctaW = ctx.measureText(cb.cta).width + ctaPadX * 2;
    const ctaH = ctaPx + ctaPadY * 2;

    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 8 * S;
    ctx.fillStyle = s.ctaBgColor;
    roundRect(ctx, aX, aY, ctaW, ctaH, 10 * S);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    ctx.fillStyle = s.ctaTextColor;
    ctx.fillText(cb.cta, aX + ctaPadX, aY + ctaPadY);

    if (cb.qrDataUrl) {
      const qrSize = Math.round(60 * S);
      const qrPad = 4 * S;
      const qrX = aX + ctaW + 18 * S;
      const qrY = aY + (ctaH - qrSize - qrPad * 2) / 2;
      await drawCanvasImage(ctx, cb.qrDataUrl, qrX, qrY, qrSize + qrPad * 2, qrSize + qrPad * 2, 8 * S, '#ffffff');
    }

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${(restName || 'poster').replace(/\s+/g, '-').toLowerCase()}-campaign.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function drawCanvasBg(ctx, src, size) {
    if (!src) {
      const g = ctx.createLinearGradient(0, 0, size, size);
      g.addColorStop(0, '#1a1a2e'); g.addColorStop(0.5, '#16213e'); g.addColorStop(1, '#0f3460');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { ctx.drawImage(img, 0, 0, size, size); resolve(); };
      img.onerror = () => { ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, size, size); resolve(); };
      img.src = src;
    });
  }

  function drawCanvasImage(ctx, src, x, y, w, h, r, bgColor) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (bgColor) {
          ctx.fillStyle = bgColor;
          roundRect(ctx, x, y, w, h, r);
          ctx.fill();
        }
        const pad = (w - h) === 0 ? 4 : 0;
        ctx.drawImage(img, x + pad, y + pad, w - pad * 2, h - pad * 2);
        resolve();
      };
      img.onerror = resolve;
      img.src = src;
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    let curY = y;
    let lineCount = 0;
    for (const word of words) {
      const test = line + (line ? ' ' : '') + word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, curY);
        line = word;
        curY += lineH;
        lineCount++;
      } else {
        line = test;
      }
    }
    if (line) { ctx.fillText(line, x, curY); lineCount++; }
    return lineCount * lineH;
  }

  async function runCampaignGeneration() {
    const cb = state.campaignBuilder;
    cb.step = 3;
    cb.generating = true;

    const phases = ['Understanding your restaurant…', 'Designing your poster…', 'Writing campaign copy…', 'Generating your QR code…'];

    cb.processingPhase = phases[0];
    renderCampaignBuilderRoute();
    await new Promise((r) => setTimeout(r, 800));

    cb.processingPhase = phases[1];
    renderCampaignBuilderRoute();

    const genPromise = dataAdapter.generateCampaignContent({
      intent: cb.intent, item: cb.selectedItem, offerType: cb.offerType,
      discountValue: cb.discountValue, comboDescription: cb.comboDescription, tone: cb.tone,
      restaurantName: state.profile?.restaurantName || '', cuisineType: state.profile?.cuisineType || '',
      brandTone: state.profile?.brandTone || '', storeId: state.storeId,
      audiencePrimary: cb.audiencePrimary, campaignGoal: cb.campaignGoal,
      imageKeywords: cb.imageKeywords,
    });

    await new Promise((r) => setTimeout(r, 2000));
    cb.processingPhase = phases[2];
    renderCampaignBuilderRoute();

    const result = await genPromise;

    await new Promise((r) => setTimeout(r, 600));
    cb.processingPhase = phases[3];
    renderCampaignBuilderRoute();
    await new Promise((r) => setTimeout(r, 400));

    cb.headline = result.headline || cb.selectedItem.toUpperCase();
    cb.offerLine = result.offerLine || `Try our ${cb.selectedItem} today`;
    cb.cta = result.cta || 'Show this code to redeem';
    cb.generatedPoster = result.posterImageUrl || '';
    cb.qrDataUrl = result.qrDataUrl || '';
    if (Array.isArray(result.suggestedChannels) && result.suggestedChannels.length) cb.channels = result.suggestedChannels;
    if (result.suggestedDuration) cb.duration = result.suggestedDuration;
    cb.generating = false;
    cb.step = 4;
    renderCampaignBuilderRoute();
  }

  // ── End Campaign Builder Flow ──────────────────────────────────────

  const SETTINGS_SUB_TABS = new Set(['brand', 'channels', 'notifications']);

  function normalizeSettingsTab(raw) {
    const t = asString(raw, '').toLowerCase();
    return SETTINGS_SUB_TABS.has(t) ? t : '';
  }

  function renderSettingsSubView(subTab) {
    const profile = state.profile || {};
    const backAction =
      '<button type="button" class="pp-secondary-btn pp-inline-btn" data-settings-back>← All settings</button>';
    const brandToneHint = asString(profile.brandTone, '') || '—';

    const brandBody = `
      <p class="pp-muted-copy">Deeper brand controls are on the roadmap. You will be able to save typography, color, and tone presets that align with New campaign.</p>
      <ul class="pp-settings-sub-list">
        <li>Typography presets (headline fonts and weights)</li>
        <li>Brand color palette for posters and social</li>
        <li>Tone alignment with campaign defaults</li>
      </ul>
      <p class="pp-settings-sub-meta"><strong>Brand tone in profile:</strong> ${escapeHtml(brandToneHint)}</p>
    `;

    const channelsBody = `
      <p class="pp-muted-copy">Connect the accounts you publish from. Account health and re-auth prompts will appear here.</p>
      <ul class="pp-settings-sub-list">
        <li>Instagram (posts &amp; stories)</li>
        <li>Other destinations (coming soon)</li>
      </ul>
      <p class="pp-muted-copy">OAuth and token storage are not wired in this build—this page is a structured placeholder.</p>
    `;

    const notificationsBody = `
      <p class="pp-muted-copy">Choose how you hear about reminders, campaign milestones, and growth nudges. Full channel toggles are coming next.</p>
      <p class="pp-muted-copy">Guest reminder emails are available today—open the reminders flow to nudge people who have not redeemed yet.</p>
      <div class="pp-inline-actions">
        <button type="button" class="pp-primary-btn pp-inline-btn" data-settings-open-reminders>Open guest reminders</button>
      </div>
    `;

    let title = '';
    let subtitle = '';
    let body = '';
    if (subTab === 'brand') {
      title = 'Brand preferences';
      subtitle = 'Typography, color, and tone presets (expansion-ready).';
      body = brandBody;
    } else if (subTab === 'channels') {
      title = 'Connected channels';
      subtitle = 'Social publishing destinations and account health.';
      body = channelsBody;
    } else {
      title = 'Notification preferences';
      subtitle = 'Control reminders and growth alerts by channel.';
      body = notificationsBody;
    }

    refs.routeMount.innerHTML = `
      ${createSectionHeader('Settings', title, subtitle, backAction)}
      <section class="pp-settings-sub-shell">
        <article class="pp-card pp-settings-sub-card">
          <div class="pp-settings-sub-body">${body}</div>
        </article>
      </section>
    `;

    refs.routeMount.querySelector('[data-settings-back]')?.addEventListener('click', () => navigate('settings'));
    refs.routeMount.querySelector('[data-settings-open-reminders]')?.addEventListener('click', () => navigate('smart-reminders'));
  }

  async function renderSettingsRoute() {
    const profile = state.profile || {};
    const subTab = normalizeSettingsTab(state.routeParams?.tab);
    if (subTab) {
      renderSettingsSubView(subTab);
      return;
    }

    if (!state.settings || !Array.isArray(state.settings.menuItemsDraft)) {
      state.settings = {
        menuItemsDraft: normalizeMenuItems(profile.menuItems),
        menuExpandedIndex: null,
      };
    } else if (state.settings.menuExpandedIndex === undefined) {
      state.settings.menuExpandedIndex = null;
    }
    const menuItemsDraft = state.settings.menuItemsDraft;
    const expRaw = state.settings.menuExpandedIndex;
    if (expRaw != null && (!Number.isFinite(expRaw) || expRaw < 0 || expRaw >= menuItemsDraft.length)) {
      state.settings.menuExpandedIndex = null;
    }
    const menuExpandedIndex = state.settings.menuExpandedIndex;
    const menuGroups =
      FEATURE_FLAGS.menu_intelligence_v1 && menuItemsDraft.length
        ? groupMenuItemsForSettings(menuItemsDraft)
        : [];
    const settingsMenuJumpToolbar =
      menuGroups.length > 1
        ? `<div class="pp-menu-settings-toolbar">
        <label class="pp-menu-settings-jump-label">Jump to section
          <select id="settingsMenuSectionJump" class="pp-select" aria-label="Jump to menu section">
            <option value="">Select section…</option>
            ${menuGroups
              .map(
                (g) =>
                  `<option value="${escapeHtml(g.key)}">${escapeHtml(g.label)} (${g.rows.length})</option>`
              )
              .join('')}
          </select>
        </label>
      </div>`
        : '';
    refs.routeMount.innerHTML = `
      ${createSectionHeader('Settings', 'Settings', 'Manage profile, brand, channels, and notification preferences.')}
      <section class="pp-grid pp-grid-2 pp-settings-layout-grid">
        <article class="pp-card pp-settings-profile-card">
          <div class="pp-card-head"><h3>Restaurant Profile</h3></div>
          <form id="settingsProfileForm" class="pp-form-grid pp-settings-form-grid" novalidate>
            <label>Restaurant Name<input id="settingsRestaurantName" type="text" value="${escapeHtml(profile.restaurantName || '')}" /></label>
            <label>Location<input id="settingsRestaurantLocation" type="text" value="${escapeHtml(profile.restaurantLocation || '')}" /></label>
            <label>Logo URL<input id="settingsLogoAsset" type="url" placeholder="https://..." value="${escapeHtml(profile.logoAsset || '')}" /></label>
            <label>Upload Logo<input id="settingsLogoUpload" type="file" accept="image/*" /></label>
            <label>Category<input id="settingsCategory" type="text" value="${escapeHtml(profile.category || '')}" /></label>
            <label>Business Type<input id="settingsBusinessType" type="text" value="${escapeHtml(profile.businessType || '')}" /></label>
            <label>Cuisine Type<input id="settingsCuisineType" type="text" value="${escapeHtml(profile.cuisineType || '')}" /></label>
            <label>Business Hours<input id="settingsBusinessHours" type="text" value="${escapeHtml(profile.businessHours || '')}" /></label>
            <div class="pp-form-field-stack">
              <label>Brand Tone<input id="settingsBrandTone" type="text" value="${escapeHtml(profile.brandTone || '')}" placeholder="e.g. fun, premium, neighborhood" /></label>
              <p class="pp-muted-copy pp-form-hint">How we describe your vibe in generated copy and visuals.</p>
            </div>
            <label class="pp-form-field-full">Default audience for new campaigns
              <select id="settingsAudiencePrimary" class="pp-select">
                ${CB_AUDIENCE_CHIPS.map((a) => `
                  <option value="${escapeHtml(a.id)}" ${asString(profile.audiencePrimary, 'general') === a.id ? 'selected' : ''}>${escapeHtml(a.label)}</option>
                `).join('')}
              </select>
            </label>
            <p class="pp-muted-copy pp-form-field-full pp-form-hint">Used as the starting audience for new campaigns. You can change it per campaign anytime in New campaign. We also use it to tune poster copy and photo mood.</p>
            <div class="pp-inline-actions pp-form-field-full">
              <button id="settingsSaveButton" type="submit" class="pp-primary-btn pp-inline-btn">Save Profile</button>
              <span id="settingsSaveStatus" class="pp-muted-copy"></span>
            </div>
          </form>
          ${FEATURE_FLAGS.menu_intelligence_v1 ? `
            <div class="pp-menu-editor-wrap pp-menu-editor-settings pp-settings-menu-outside-form" aria-label="Menu items editor">
              <div class="pp-card-head compact">
                <h3>Menu items (${menuItemsDraft.length})</h3>
                <button id="settingsAddMenuItem" type="button" class="pp-secondary-btn pp-inline-btn">+ Add item</button>
              </div>
              <div class="pp-muted-copy">Items are grouped by category—use each section header to expand or collapse. With multiple groups, use <strong>Jump to section</strong>. Click <strong>Edit</strong> on a row to change details or upload a photo. Bulk import: <button type="button" class="pp-link-btn" data-open-menu-wizard>Menu Setup Wizard</button></div>
              ${settingsMenuJumpToolbar}
              <div id="settingsMenuItemsMount" class="pp-card-stack pp-menu-items-scroll-region">
                ${renderMenuItemsEditor(menuItemsDraft, {
                  context: 'settings',
                  variant: 'compact',
                  expandedIndex: menuExpandedIndex,
                  menuGroups,
                })}
              </div>
            </div>
          ` : ''}
        </article>

        <article class="pp-card pp-settings-secondary-card">
          <div class="pp-card-head"><h3>Other Settings</h3></div>
          <div class="pp-card-stack pp-settings-nav-stack">
            <button type="button" class="pp-settings-nav-card" data-settings-tab="brand"><strong>Brand Preferences</strong><p>Typography, color, and tone presets (expansion-ready).</p></button>
            <button type="button" class="pp-settings-nav-card" data-settings-tab="channels"><strong>Connected Channels</strong><p>Social publishing destinations and account health.</p></button>
            <button type="button" class="pp-settings-nav-card" data-settings-tab="notifications"><strong>Notification Preferences</strong><p>Control reminders and growth alerts by channel.</p></button>
          </div>
        </article>
      </section>
    `;

    refs.routeMount.querySelectorAll('[data-settings-tab]').forEach((btn) => {
      btn.addEventListener('click', () => navigate('settings', { tab: asString(btn.dataset.settingsTab, '') }));
    });

    refs.routeMount.querySelector('#settingsProfileForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const saveButton = document.getElementById('settingsSaveButton');
      const saveStatus = document.getElementById('settingsSaveStatus');
      const payload = {
        storeId: state.storeId,
        restaurantName: asString(document.getElementById('settingsRestaurantName')?.value),
        restaurantLocation: asString(document.getElementById('settingsRestaurantLocation')?.value),
        logoAsset: asString(document.getElementById('settingsLogoAsset')?.value),
        category: asString(document.getElementById('settingsCategory')?.value),
        businessType: asString(document.getElementById('settingsBusinessType')?.value),
        cuisineType: asString(document.getElementById('settingsCuisineType')?.value),
        businessHours: asString(document.getElementById('settingsBusinessHours')?.value),
        brandTone: asString(document.getElementById('settingsBrandTone')?.value),
        audiencePrimary: asString(document.getElementById('settingsAudiencePrimary')?.value, 'general'),
        menuItems: normalizeMenuItems(menuItemsDraft),
      };

      saveButton.disabled = true;
      saveStatus.textContent = 'Saving...';
      try {
        // Integration point: this already maps to backend profile endpoint.
        state.profile = await dataAdapter.saveRestaurantProfile(payload);
        state.settings = null;
        renderProfile();
        dataAdapter.trackMenuIntelligenceEvent?.({
          event: 'menu_profile_saved',
          storeId: state.storeId,
          menuItemCount: payload.menuItems.length,
          bestSellerCount: payload.menuItems.filter((item) => item.status === 'best_seller').length,
          slowMoverCount: payload.menuItems.filter((item) => item.status === 'slow_mover').length,
          withImageCount: payload.menuItems.filter((item) => item.imageAssetId).length,
        });
        saveStatus.textContent = 'Saved successfully.';
      } catch (_error) {
        saveStatus.textContent = 'Save failed. Please try again.';
      } finally {
        saveButton.disabled = false;
      }
    });

    refs.routeMount.querySelector('#settingsLogoUpload')?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const toDataUrl = (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result || '');
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      try {
        const dataUrl = await toDataUrl(file);
        const logoInput = document.getElementById('settingsLogoAsset');
        if (logoInput) logoInput.value = asString(dataUrl);
      } catch (_error) {
        const saveStatus = document.getElementById('settingsSaveStatus');
        if (saveStatus) saveStatus.textContent = 'Logo upload failed. Try another image.';
      }
    });

    refs.routeMount.querySelector('#settingsAddMenuItem')?.addEventListener('click', () => {
      menuItemsDraft.push({
        id: `menu_item_${Date.now()}_${menuItemsDraft.length}`,
        name: '',
        status: 'regular',
        category: 'main',
        marginBand: '',
        note: '',
        imageAssetId: '',
        imageUrl: '',
      });
      state.settings.menuExpandedIndex = menuItemsDraft.length - 1;
      renderSettingsRoute();
    });

    refs.routeMount.querySelectorAll('[data-open-menu-wizard]').forEach((btn) => {
      btn.addEventListener('click', () => openMenuWizard());
    });

    refs.routeMount.querySelectorAll('[data-menu-field]').forEach((input) => {
      input.addEventListener('input', (event) => {
        const idx = Number(event.target.dataset.menuIndex);
        const field = asString(event.target.dataset.menuField);
        if (!Number.isFinite(idx) || !menuItemsDraft[idx]) return;
        menuItemsDraft[idx][field] = asString(event.target.value);
      });
      input.addEventListener('change', (event) => {
        const idx = Number(event.target.dataset.menuIndex);
        const field = asString(event.target.dataset.menuField);
        if (!Number.isFinite(idx) || !menuItemsDraft[idx]) return;
        menuItemsDraft[idx][field] = asString(event.target.value);
        if (field === 'category') renderSettingsRoute();
      });
    });

    refs.routeMount.querySelector('#settingsMenuSectionJump')?.addEventListener('change', (event) => {
      const sel = event.target;
      const v = asString(sel?.value, '');
      if (!v) return;
      document.getElementById(`settings-menu-section-${v}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      sel.value = '';
    });

    refs.routeMount.querySelectorAll('[data-menu-remove]').forEach((button) => {
      button.addEventListener('click', () => {
        const idx = Number(button.dataset.menuRemove);
        if (!Number.isFinite(idx)) return;
        const exp = state.settings.menuExpandedIndex;
        if (exp === idx) state.settings.menuExpandedIndex = null;
        else if (Number.isFinite(exp) && exp > idx) state.settings.menuExpandedIndex = exp - 1;
        menuItemsDraft.splice(idx, 1);
        renderSettingsRoute();
      });
    });

    refs.routeMount.querySelectorAll('[data-menu-toggle-expand]').forEach((button) => {
      button.addEventListener('click', () => {
        const idx = Number(button.dataset.menuToggleExpand);
        if (!Number.isFinite(idx)) return;
        state.settings.menuExpandedIndex = state.settings.menuExpandedIndex === idx ? null : idx;
        renderSettingsRoute();
      });
    });

    refs.routeMount.querySelectorAll('[data-menu-image-index]').forEach((input) => {
      input.addEventListener('change', async (event) => {
        const idx = Number(event.target.dataset.menuImageIndex);
        const file = event.target.files?.[0];
        if (!Number.isFinite(idx) || !file || !menuItemsDraft[idx]) return;
        const toDataUrl = (blob) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result || '');
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const saveStatus = document.getElementById('settingsSaveStatus');
        try {
          if (saveStatus) saveStatus.textContent = 'Uploading menu image...';
          const sourceUrl = asString(await toDataUrl(file));
          const asset = await dataAdapter.uploadMenuItemAsset({ sourceUrl, mimeType: file.type || 'image/jpeg' });
          menuItemsDraft[idx].imageAssetId = asString(asset?.id);
          menuItemsDraft[idx].imageUrl = asString(asset?.optimizedUrl || asset?.sourceUrl);
          dataAdapter.trackMenuIntelligenceEvent?.({
            event: 'menu_image_uploaded',
            storeId: state.storeId,
            menuItemCount: menuItemsDraft.length,
            withImageCount: menuItemsDraft.filter((item) => item.imageAssetId).length,
          });
          if (saveStatus) saveStatus.textContent = 'Menu image uploaded. Save profile to keep changes.';
          renderSettingsRoute();
        } catch (_error) {
          if (saveStatus) saveStatus.textContent = 'Menu image upload failed. Try another image.';
        }
      });
    });
  }

  function bindActionButtons() {
    refs.routeMount.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = parseActionPayload(button.dataset.action);
        const actionId = asString(button.getAttribute('data-smart-action-id'), '');
        handleAction(action, actionId);
      });
    });
  }

  function bindCampaignCardButtons() {
    refs.routeMount.querySelectorAll('[data-view-campaign]').forEach((button) => {
      button.addEventListener('click', () => navigate('campaign-detail', { campaignId: button.dataset.viewCampaign }));
    });

    refs.routeMount.querySelectorAll('[data-pause-campaign]').forEach((button) => {
      button.addEventListener('click', async () => {
        const card = button.closest('.pp-campaign-card') || button.closest('.pp-live-execution-card');
        if (!card) return;
        const campaignId = asString(card.dataset.campaignId);
        const badge = card.querySelector('.pp-status-badge');
        const currentStatus = asString(badge?.textContent).toLowerCase();
        button.disabled = true;
        try {
          if (currentStatus === 'active') {
            await dataAdapter.pauseCampaign(campaignId);
            if (badge) {
              badge.className = 'pp-status-badge pending';
              badge.textContent = 'paused';
            }
            button.textContent = 'Resume';
            setCreateNotice('Campaign paused.', 'success');
          } else {
            await dataAdapter.relaunchCampaign(campaignId);
            if (badge) {
              badge.className = 'pp-status-badge ready';
              badge.textContent = 'active';
            }
            button.textContent = 'Pause';
            setCreateNotice('Campaign resumed and live.', 'success');
          }
        } catch (_error) {
          setCreateNotice('Could not update campaign status right now.', 'error');
        } finally {
          button.disabled = false;
        }
      });
    });

    refs.routeMount.querySelectorAll('[data-duplicate-campaign]').forEach((button) => {
      button.addEventListener('click', async () => {
        const campaignId = asString(button.dataset.duplicateCampaign);
        button.disabled = true;
        try {
          const duplicated = await dataAdapter.duplicateCampaign(campaignId);
          resetCampaignBuilder();
          applyDuplicatedOfferToCampaignBuilder(duplicated);
          navigate('create-campaign');
        } catch (_error) {
          setCreateNotice('Could not duplicate campaign right now.', 'error');
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  function createProgressBar() {
    refs.createProgress.innerHTML = CREATE_STEPS.map((label, index) => {
      const step = index + 1;
      const done = state.createFlow.step > step;
      const active = state.createFlow.step === step;
      return `<span class="pp-create3-step${done ? ' done' : ''}${active ? ' active' : ''}">${step}. ${escapeHtml(label)}</span>`;
    }).join('');
  }

  function setCreateNotice(message = '', tone = 'info') {
    if (!message) {
      refs.createNotice.className = 'pp-create-offer-notice hidden';
      refs.createNotice.textContent = '';
      return;
    }
    refs.createNotice.className = `pp-create-offer-notice ${tone}`;
    refs.createNotice.textContent = message;
  }

  function deriveIntentFromPrimaryGoal() {
    const goal = asString(state.profile?.primaryGoal);
    if (goal === 'move_slow_items') return 'promote_item';
    if (goal === 'get_more_people') return 'increase_sales';
    return '';
  }

  function deriveCampaignGoalFromProfile() {
    const goal = asString(state.profile?.primaryGoal);
    const mapping = { get_more_people: 'traffic', sell_more: 'aov', move_slow_items: 'redemption', build_repeat: 'repeat_visits' };
    return mapping[goal] || 'traffic';
  }

  function deriveOfferTypeFromProfile() {
    const slowHours = state.profile?.slowHours;
    const goal = asString(state.profile?.primaryGoal);
    if (goal === 'get_more_people' && Array.isArray(slowHours) && slowHours.length > 0) return 'Time-Window Special';
    return 'Percentage Off';
  }

  function resetCreateFlow(partial = {}) {
    state.createFlow = {
      ...state.createFlow,
      open: true,
      step: 1,
      entryMode: partial.entryMode || 'guided',
      mode: partial.mode || 'offer',
      intent: partial.intent || deriveIntentFromPrimaryGoal(),
      item: '',
      offerType: deriveOfferTypeFromProfile(),
      campaignGoal: deriveCampaignGoalFromProfile(),
      customOfferEnabled: false,
      customOffer: {
        customLabel: '',
        eligibilityRule: '',
        rewardRule: '',
        exclusions: '',
        legalTerms: '',
        redemptionLimit: '',
      },
      duration: '7 days',
      platform: partial.mode === 'reel' ? 'Instagram Reel' : 'Instagram Post',
      selectedChannels: ['Instagram Post', 'In-store QR'],
      soundtrackMood: 'upbeat',
      styleKeywords: ['Bold', 'Premium'],
      userIntentInput: '',
      userIntentTags: [],
      parsedIntentHints: {},
      aiDecide: true,
      selectedAssetNames: [],
      generationStatus: '',
      suggestions: [],
      soundtrackSuggestions: [],
      selectedSuggestionId: '',
      selectedSoundtrackId: '',
      headline: '',
      offerLine: '',
      cta: '',
      footer: '',
      reelHook: '',
      reviewPayload: null,
      reviewConfirmed: false,
      qrDataUrl: '',
      regenLoadingByAction: {
        headline: false,
        image: false,
        all: false,
      },
      lastSuggestionSignature: '',
      orchestratorSummary: null,
      recommendationRoutes: [],
      analyticsTags: {},
      editState: {
        layoutPreset: 'food-focus',
        alignment: 'left',
        colorPreset: 'deep-navy',
        safeZonePositions: {
          text: { x: 0, y: 0 },
          logo: { x: 0, y: 0 },
          image: { x: 0, y: 0 },
        },
      },
    };
  }

  function openCreateFlow(partial = {}) {
    resetCreateFlow(partial);
    refs.createModal.classList.remove('hidden');
    refs.createModal.setAttribute('aria-hidden', 'false');
    renderCreateFlow();
  }

  function closeCreateFlow() {
    state.createFlow.open = false;
    refs.createModal.classList.add('hidden');
    refs.createModal.setAttribute('aria-hidden', 'true');
    setCreateNotice('');
    closeImageLightbox();
  }

  function styleKeywordChip(keyword) {
    const active = state.createFlow.styleKeywords.includes(keyword);
    return `<button type="button" class="pp-choice-chip${active ? ' active' : ''}" data-style-keyword="${escapeHtml(keyword)}">${escapeHtml(keyword)}</button>`;
  }

  function parseIntentHints(rawText = '', tags = []) {
    const source = `${asString(rawText).toLowerCase()} ${(Array.isArray(tags) ? tags.join(' ') : '').toLowerCase()}`;
    const has = (needle) => source.includes(needle);
    const parsed = {
      style: [],
      elements: [],
      layout: [],
      tone: [],
      focus: [],
    };

    if (has('dark')) parsed.style.push('dark_background');
    if (has('bold')) parsed.style.push('bold_text');
    if (has('minimal')) parsed.style.push('minimal');
    if (has('premium')) parsed.tone.push('premium');
    if (has('festive')) parsed.tone.push('festive');
    if (has('qr')) parsed.elements.push('qr_code');
    if (has('logo')) parsed.elements.push('logo');
    if (has('food')) parsed.focus.push('food');
    if (has('text') || has('more text')) parsed.layout.push('text_heavy');
    if (has('image') || has('hero')) parsed.layout.push('image_focus');

    return {
      style: Array.from(new Set(parsed.style)),
      elements: Array.from(new Set(parsed.elements)),
      layout: Array.from(new Set(parsed.layout)),
      tone: Array.from(new Set(parsed.tone)),
      focus: Array.from(new Set(parsed.focus)),
    };
  }

  function computedIntentTags(input = '') {
    const normalized = asString(input).toLowerCase();
    if (!normalized) return [];
    const tags = INTENT_SUGGESTION_CHIPS
      .filter((chip) => normalized.includes(chip.toLowerCase()))
      .map((chip) => chip.toLowerCase().replaceAll(' ', '_'));
    return Array.from(new Set(tags));
  }

  function summarizeIntentHints(parsed = {}) {
    const bullets = [];
    if (parsed.style?.includes('dark_background')) bullets.push('Dark background');
    if (parsed.style?.includes('bold_text')) bullets.push('Bold text');
    if (parsed.style?.includes('minimal')) bullets.push('Minimal style');
    if (parsed.focus?.includes('food')) bullets.push('Food-focused image');
    if (parsed.elements?.includes('qr_code')) bullets.push('QR included');
    if (parsed.layout?.includes('text_heavy')) bullets.push('Text-forward composition');
    if (parsed.layout?.includes('image_focus')) bullets.push('Image-forward composition');
    if (parsed.tone?.includes('premium')) bullets.push('Premium tone');
    if (parsed.tone?.includes('festive')) bullets.push('Festive tone');
    return bullets.slice(0, 4);
  }

  function IntentInputField() {
    return `
      <div class="pp-intent-input-field">
        <label for="createUserIntentInput">What’s on your mind? <span>(Optional)</span></label>
        <textarea id="createUserIntentInput" rows="2" placeholder="e.g. dark background, premium look, highlight food, bold text, add QR">${escapeHtml(state.createFlow.userIntentInput)}</textarea>
      </div>
    `;
  }

  function IntentChipsRow() {
    return `
      <div class="pp-intent-chips-row" role="list" aria-label="Intent suggestions">
        ${INTENT_SUGGESTION_CHIPS.map((chip) => {
          const active = state.createFlow.userIntentInput.toLowerCase().includes(chip.toLowerCase());
          return `<button type="button" class="pp-choice-chip${active ? ' active' : ''}" data-intent-chip="${escapeHtml(chip)}">${escapeHtml(chip)}</button>`;
        }).join('')}
      </div>
    `;
  }

  function IntentPreviewSummary() {
    const bullets = summarizeIntentHints(state.createFlow.parsedIntentHints);
    if (!state.createFlow.userIntentInput.trim() || !bullets.length) return '';
    return `
      <div class="pp-intent-preview-summary" aria-live="polite">
        <p>We’ll make it:</p>
        <ul>
          ${bullets.map((row) => `<li>${escapeHtml(row)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  function refreshIntentPreviewInline() {
    const mount = refs.createBody.querySelector('#createIntentPreviewMount');
    if (!mount) return;
    mount.innerHTML = IntentPreviewSummary();
  }

  function renderCreateStep1() {
    const guidedActive = state.createFlow.entryMode === 'guided';
    return `
      <section class="pp-create3-step-body">
        <h4>What do you want to achieve today?</h4>
        <div class="pp-card pp-menu-editor-wrap">
          <p class="pp-card-kicker">Guided Campaign Entry</p>
          <p class="pp-muted-copy">Choose your flow style. Guided auto-highlights best options. Manual keeps your edits in control.</p>
          <div class="pp-inline-actions">
            <button type="button" class="${guidedActive ? 'pp-primary-btn' : 'pp-secondary-btn'} pp-inline-btn" data-guided-entry="guided">Guided (Recommended)</button>
            <button type="button" class="${guidedActive ? 'pp-secondary-btn' : 'pp-primary-btn'} pp-inline-btn" data-guided-entry="manual">Manual Controls First</button>
          </div>
        </div>
        <div class="pp-grid pp-grid-2">
          ${CREATE_INTENTS.map((intent) => `
            <button type="button" class="pp-create-offer-intent-card${state.createFlow.intent === intent.id ? ' active' : ''}" data-create-intent="${intent.id}" data-create-mode="${intent.mode}">
              <strong>${escapeHtml(intent.title)}</strong>
              <p>${escapeHtml(intent.desc)}</p>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderCreateStep2() {
    const mode = state.createFlow.mode;
    const menuItems = FEATURE_FLAGS.menu_intelligence_v1 ? profileMenuItems() : [];
    state.createFlow.userIntentTags = computedIntentTags(state.createFlow.userIntentInput);
    state.createFlow.parsedIntentHints = parseIntentHints(state.createFlow.userIntentInput, state.createFlow.userIntentTags);
    return `
      <section class="pp-create3-step-body">
        <h4>Offer Basics + Schedule</h4>
        ${menuItems.length ? `
          <div class="pp-card pp-menu-editor-wrap">
            <p class="pp-card-kicker">Saved Menu Items</p>
            <p class="pp-muted-copy">Tap or search an item to auto-fill Menu Item and apply best-seller/slow-mover context.</p>
            <div class="pp-create-offer-moods">
              ${menuItems.map((item) => {
                const active = asString(state.createFlow.item).toLowerCase() === asString(item.name).toLowerCase();
                return `<button type="button" class="pp-choice-chip${active ? ' active' : ''}" data-menu-pick="${escapeHtml(item.name)}">${escapeHtml(item.name)} · ${escapeHtml(item.status.replaceAll('_', ' '))}</button>`;
              }).join('')}
            </div>
          </div>
        ` : ''}
        <div class="pp-create3-form-grid">
          <label>Menu Item
            <div class="pp-menu-search" data-menu-search>
              <input id="createItemInput" type="text" value="${escapeHtml(state.createFlow.item)}" placeholder="Search and select saved item, or type new" autocomplete="off" aria-autocomplete="list" aria-expanded="false" aria-controls="createItemSearchList" />
              ${menuItems.length ? '<button type="button" class="pp-menu-search-toggle" data-menu-search-toggle aria-label="Show saved menu items">Show</button>' : ''}
            </div>
            ${menuItems.length ? `
              <div id="createItemSearchList" class="pp-menu-search-list" role="listbox" aria-label="Saved menu items">
                ${menuItems.map((item) => `<button type="button" class="pp-menu-search-item" data-menu-search-item="${escapeHtml(item.name)}" data-menu-search-status="${escapeHtml(item.status)}" role="option"><span>${escapeHtml(item.name)}</span><small>${escapeHtml(item.status.replaceAll('_', ' '))}</small></button>`).join('')}
                <p class="pp-menu-search-empty hidden" data-menu-search-empty>No matching menu items. Keep typing to add a new item.</p>
              </div>
              <span class="pp-muted-copy">Start typing to filter saved items, then click to select.</span>
            ` : '<span class="pp-muted-copy">Add menu items in Settings to enable quick select.</span>'}
          </label>
          <label>Offer Type
            <select id="createOfferTypeInput" class="pp-select">
              ${[
                'Percentage Off',
                'Flat Amount Off',
                'Buy X Get Y',
                'Combo Bundle',
                'Time-Window Special',
                'Custom Rule',
              ].map((value) => `<option ${state.createFlow.offerType === value ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}
            </select>
          </label>
          <label>Campaign Goal
            <select id="createCampaignGoalInput" class="pp-select">
              ${[
                ['traffic', 'Increase Footfall'],
                ['redemption', 'Maximize Redemptions'],
                ['repeat_visits', 'Increase Repeat Visits'],
                ['aov', 'Increase Average Order Value'],
              ].map(([value, label]) => `<option value="${value}" ${state.createFlow.campaignGoal === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
            </select>
          </label>
          <label>Run For
            <select id="createDurationInput" class="pp-select">
              ${['3 days', '7 days', '14 days', '30 days'].map((value) => `<option ${state.createFlow.duration === value ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}
            </select>
          </label>
          <label>Format
            <select id="createPlatformInput" class="pp-select">
              ${['Instagram Post', 'Instagram Story', 'Instagram Reel', 'Flyer'].map((value) => `<option ${state.createFlow.platform === value ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}
            </select>
          </label>
        </div>
        ${state.createFlow.offerType === 'Custom Rule' ? `
          <div class="pp-card pp-menu-editor-wrap">
            <p class="pp-card-kicker">Custom Offer Rules</p>
            <div class="pp-create3-form-grid">
              <label>Custom Label<input id="createCustomLabelInput" type="text" value="${escapeHtml(state.createFlow.customOffer.customLabel)}" placeholder="Example: Office Lunch Booster" /></label>
              <label>Eligibility Rule<input id="createEligibilityRuleInput" type="text" value="${escapeHtml(state.createFlow.customOffer.eligibilityRule)}" placeholder="Example: Weekdays 12-3 PM only" /></label>
              <label>Reward Rule<input id="createRewardRuleInput" type="text" value="${escapeHtml(state.createFlow.customOffer.rewardRule)}" placeholder="Example: Free drink with any bowl" /></label>
              <label>Exclusions<input id="createExclusionsInput" type="text" value="${escapeHtml(state.createFlow.customOffer.exclusions)}" placeholder="Example: Not valid with other offers" /></label>
              <label>Legal Terms<input id="createLegalTermsInput" type="text" value="${escapeHtml(state.createFlow.customOffer.legalTerms)}" placeholder="Example: While supplies last" /></label>
              <label>Redemption Limit<input id="createRedemptionLimitInput" type="text" value="${escapeHtml(state.createFlow.customOffer.redemptionLimit)}" placeholder="Example: 1 per customer/day" /></label>
            </div>
          </div>
        ` : ''}
        <div class="pp-card pp-menu-editor-wrap">
          <p class="pp-card-kicker">Channel Plan</p>
          <div class="pp-create-offer-moods">
            ${['Instagram Post', 'Instagram Story', 'Instagram Reel', 'In-store QR', 'WhatsApp'].map((channel) => {
              const active = state.createFlow.selectedChannels.includes(channel);
              return `<button type="button" class="pp-choice-chip${active ? ' active' : ''}" data-channel-pick="${escapeHtml(channel)}">${escapeHtml(channel)}</button>`;
            }).join('')}
          </div>
          <label>Reel Music Mood
            <select id="createSoundtrackMoodInput" class="pp-select">
              ${['upbeat', 'chill', 'premium', 'energetic'].map((mood) => `<option ${state.createFlow.soundtrackMood === mood ? 'selected' : ''}>${escapeHtml(mood)}</option>`).join('')}
            </select>
          </label>
        </div>

        <p class="pp-create-offer-field-label">Style keywords</p>
        <div class="pp-create-offer-moods">
          ${['Bold', 'Premium', 'Fun', 'Minimal', 'Image Focused', 'Text Focused'].map(styleKeywordChip).join('')}
        </div>

        <div class="pp-create-offer-upload-panel">
          <p class="pp-create-offer-field-label">Optional Photo</p>
          <p class="pp-muted-copy">Add a food photo for better previews, or keep defaults and continue.</p>
          <div class="pp-inline-actions">
            <label class="pp-secondary-btn pp-inline-btn" for="createAssetInput">Upload Image</label>
            <input id="createAssetInput" type="file" accept="image/*" class="hidden" />
            <label class="pp-check-inline">
              <input id="createAiDecideInput" type="checkbox" ${state.createFlow.aiDecide ? 'checked' : ''} />
              Use smart default image
            </label>
          </div>
          <div class="pp-create-offer-uploaded-list">
            ${state.createFlow.selectedAssetNames.length
              ? state.createFlow.selectedAssetNames.map((name) => `<span class="pp-upload-chip source-uploaded">${escapeHtml(name)}</span>`).join('')
              : '<span class="pp-muted-copy">No image selected yet.</span>'}
          </div>
        </div>

        <div class="pp-create-intent-panel">
          ${IntentInputField()}
          ${IntentChipsRow()}
          <div id="createIntentPreviewMount">${IntentPreviewSummary()}</div>
        </div>

        ${mode === 'reel' ? `
          <div class="pp-card pp-reel-builder-card">
            <p class="pp-card-kicker">Reel Experience</p>
            <h3>6-7 Second Reel Plan</h3>
            <p class="pp-muted-copy">We will auto-structure Hook → Scenes → CTA with soundtrack recommendations.</p>
          </div>
        ` : ''}
      </section>
    `;
  }

  function selectedSuggestion() {
    return state.createFlow.suggestions.find((row) => row.id === state.createFlow.selectedSuggestionId) || state.createFlow.suggestions[0] || null;
  }

  function selectedSoundtrack() {
    return state.createFlow.soundtrackSuggestions.find((row) => row.id === state.createFlow.selectedSoundtrackId)
      || state.createFlow.soundtrackSuggestions[0]
      || null;
  }

  function deriveIntentDrivenStep3Config() {
    const parsed = state.createFlow.parsedIntentHints || {};
    let preferredPreset = '';
    let preferredColor = '';
    let preferredAlignment = '';
    const bullets = [];

    if (parsed.focus?.includes('food')) {
      preferredPreset = 'food-focus';
      bullets.push('Food focus applied');
    }
    if (parsed.layout?.includes('text_heavy')) {
      preferredPreset = 'text-forward';
      bullets.push('Text-forward layout applied');
    }
    if (parsed.style?.includes('minimal')) {
      preferredPreset = 'minimal-clean';
      bullets.push('Minimal style applied');
    }
    if (parsed.tone?.includes('premium')) {
      preferredPreset = 'premium';
      preferredColor = preferredColor || 'clean-light';
      bullets.push('Premium visual tone applied');
    }
    if (parsed.style?.includes('bold_text')) {
      preferredPreset = 'bold-promo';
      bullets.push('Bold promo emphasis applied');
    }
    if (parsed.style?.includes('dark_background')) {
      preferredColor = 'warm-dark';
      bullets.push('Dark background applied');
    }
    if (state.createFlow.userIntentInput.toLowerCase().includes('center')) {
      preferredAlignment = 'center';
      bullets.push('Centered alignment applied');
    }
    if (state.createFlow.userIntentInput.toLowerCase().includes('split')) {
      preferredAlignment = 'split';
      bullets.push('Split alignment applied');
    }
    if (parsed.elements?.includes('qr_code')) bullets.push('QR included in campaign output');

    return {
      preferredPreset,
      preferredColor,
      preferredAlignment,
      appliedBullets: Array.from(new Set(bullets)).slice(0, 5),
    };
  }

  function maybeApplyIntentDrivenConfig() {
    const plan = deriveIntentDrivenStep3Config();
    if (plan.preferredPreset) state.createFlow.editState.layoutPreset = plan.preferredPreset;
    if (plan.preferredColor) state.createFlow.editState.colorPreset = plan.preferredColor;
    if (plan.preferredAlignment) state.createFlow.editState.alignment = plan.preferredAlignment;
  }

  function applyQuickImprove(action = '') {
    const key = asString(action).toLowerCase();
    if (key === 'bolder') {
      state.createFlow.editState.layoutPreset = 'bold-promo';
      state.createFlow.editState.colorPreset = 'warm-dark';
      state.createFlow.editState.alignment = 'left';
      state.createFlow.headline = asString(state.createFlow.headline).toUpperCase() || state.createFlow.headline;
      setCreateNotice('Applied: bolder poster direction.', 'success');
      return;
    }
    if (key === 'cleaner') {
      state.createFlow.editState.layoutPreset = 'minimal-clean';
      state.createFlow.editState.colorPreset = 'clean-light';
      state.createFlow.editState.alignment = 'center';
      setCreateNotice('Applied: cleaner, minimal direction.', 'success');
      return;
    }
    if (key === 'highlight_food') {
      state.createFlow.editState.layoutPreset = 'food-focus';
      state.createFlow.editState.alignment = 'split';
      setCreateNotice('Applied: food-focused composition.', 'success');
      return;
    }
    if (key === 'premium') {
      state.createFlow.editState.layoutPreset = 'premium';
      state.createFlow.editState.colorPreset = 'clean-light';
      state.createFlow.editState.alignment = 'center';
      setCreateNotice('Applied: premium visual style.', 'success');
      return;
    }
    if (key === 'fun') {
      state.createFlow.editState.layoutPreset = 'bold-promo';
      state.createFlow.editState.colorPreset = 'deep-navy';
      state.createFlow.editState.alignment = 'center';
      setCreateNotice('Applied: fun, energetic direction.', 'success');
    }
  }

  function renderCreateStep3() {
    const suggestion = selectedSuggestion();
    const menuItems = FEATURE_FLAGS.menu_intelligence_v1 ? profileMenuItems() : [];
    const focusedMenuItem = menuItems.find((item) => asString(item.name).toLowerCase() === asString(state.createFlow.item).toLowerCase());
    const soundtrack = selectedSoundtrack();
    const mode = state.createFlow.mode;
    const previewImageUrl = suggestion?.previewImage?.url || '';
    const previewSource = asString(suggestion?.previewImage?.source).toLowerCase();
    const imageMeta = suggestion?.imageResolutionMeta || {};
    const { layoutPreset, alignment, colorPreset, safeZonePositions } = state.createFlow.editState;
    const textPos = safeZonePositions.text || { x: 0, y: 0 };
    const logoPos = safeZonePositions.logo || { x: 0, y: 0 };
    const imagePos = safeZonePositions.image || { x: 0, y: 0 };
    const loadingHeadline = state.createFlow.regenLoadingByAction.headline;
    const loadingImage = state.createFlow.regenLoadingByAction.image;
    const loadingAll = state.createFlow.regenLoadingByAction.all;
    const regenDisabled = loadingHeadline || loadingImage || loadingAll;
    const intentPlan = deriveIntentDrivenStep3Config();
    const suggestionCards = state.createFlow.suggestions.length
      ? state.createFlow.suggestions.map((row) => `
          <button type="button" class="pp-card pp-create3-suggestion${row.id === state.createFlow.selectedSuggestionId ? ' active' : ''}" data-select-suggestion="${escapeHtml(row.id)}">
            <div class="pp-create3-suggestion-media">
              ${row.previewImage?.url
                ? `<img src="${escapeHtml(row.previewImage.url)}" alt="${escapeHtml(row.title)} preview" data-enlarge-image="${escapeHtml(row.previewImage.url)}" data-enlarge-label="${escapeHtml(`${row.title} full preview`)}" loading="lazy" />`
                : '<span>Preview</span>'}
            </div>
            <strong>${escapeHtml(row.title)}</strong>
            <p>${escapeHtml(row.offerLine || row.supportLine || 'Limited offer')}</p>
          </button>
        `).join('')
      : '<div class="pp-empty-inline">No suggestions available yet.</div>';

    const headline = state.createFlow.headline || suggestion?.headline || 'HEADLINE';
    const offerLine = state.createFlow.offerLine || suggestion?.offerLine || 'Offer details';
    const cta = state.createFlow.cta || suggestion?.cta || 'Scan to redeem';
    const footer = state.createFlow.footer || `${state.profile?.restaurantName || 'Your Restaurant'} · ${state.profile?.restaurantLocation || 'Primary location'}`;
    const reelHook = state.createFlow.reelHook || suggestion?.reelHook || `Try ${state.createFlow.item || 'our special'} today`;
    const headlineOptions = Array.isArray(suggestion?.headlineOptions) ? suggestion.headlineOptions.slice(0, 6) : [];
    const apiRankedRoutes = Array.isArray(state.createFlow.recommendationRoutes) ? state.createFlow.recommendationRoutes : [];
    const fallbackRankedRoutes = (state.createFlow.suggestions || []).slice(0, 3).map((row, index) => ({
      route: ['safe', 'balanced', 'aggressive'][index] || `option_${index + 1}`,
      score: Number(row.score || 0.65),
      title: row.title || 'Campaign option',
      why: row.supportLine || row.subtitle || 'Fallback recommendation from available suggestions.',
      suggestionId: row.id,
    }));
    const rankedRoutes = apiRankedRoutes.length ? apiRankedRoutes : fallbackRankedRoutes;
    const bestRoute = state.createFlow.orchestratorSummary?.bestNextMove || rankedRoutes[0] || {
      title: 'Recommended Option',
      why: 'Using fallback recommendation while orchestrator details load.',
      score: 0.65,
    };

    return `
      <section class="pp-create3-step-body">
        <h4>Poster Design</h4>
        <div class="pp-card pp-menu-editor-wrap">
          <p class="pp-card-kicker">AI Orchestrator Recommendation</p>
          <h3>Best Next Move: ${escapeHtml(bestRoute.title || 'Recommended Option')}</h3>
          <p class="pp-muted-copy">${escapeHtml(bestRoute.why || state.createFlow.orchestratorSummary?.rationale || '')}</p>
          <p class="pp-muted-copy">Confidence: ${escapeHtml(String(Math.round(Number((bestRoute.score || state.createFlow.orchestratorSummary?.confidence || 0) * 100)) || 0))}%</p>
          ${rankedRoutes.length ? `
            <div class="pp-grid pp-grid-3">
              ${rankedRoutes.map((route) => `
                <article class="pp-card">
                  <p class="pp-card-kicker">${escapeHtml(route.route || 'option')}</p>
                  <strong>${escapeHtml(route.title || 'Campaign option')}</strong>
                  <p class="pp-muted-copy">${escapeHtml(route.why || '')}</p>
                  <span class="pp-card-chip">${escapeHtml(String(Math.round(Number(route.score || 0) * 100)))}%</span>
                </article>
              `).join('')}
            </div>
          ` : ''}
        </div>
        <div class="pp-card pp-menu-editor-wrap">
          <p class="pp-card-kicker">Menu Intelligence Used</p>
          <p class="pp-muted-copy">${focusedMenuItem
            ? `Focused item: ${escapeHtml(focusedMenuItem.name)} (${escapeHtml(focusedMenuItem.status.replaceAll('_', ' '))})`
            : (menuItems.length
              ? 'Pick one saved menu item in Offer Basics to target best-seller/slow-mover strategy.'
              : 'No menu items added yet. Add 3+ items in Settings to unlock item-level recommendation guidance.')}</p>
          <div class="pp-agent-profile-meta">
            ${menuItems.length
              ? menuItems.slice(0, 6).map((item) => `<span class="pp-card-chip${focusedMenuItem?.id === item.id ? ' accent' : ''}">${escapeHtml(item.name)} · ${escapeHtml(item.status.replaceAll('_', ' '))}</span>`).join('')
              : '<span class="pp-card-chip">No menu intelligence data</span>'}
          </div>
        </div>
        ${intentPlan.appliedBullets.length ? `
          <div class="pp-card pp-create3-intent-summary">
            <p class="pp-card-kicker">Your Inputs Applied</p>
            <div class="pp-create3-intent-meta">
              <span class="pp-card-chip">${escapeHtml(state.createFlow.item || 'Item')}</span>
              <span class="pp-card-chip">${escapeHtml(state.createFlow.offerType || 'Offer')}</span>
              ${(state.createFlow.userIntentTags || []).slice(0, 4).map((tag) => `<span class="pp-card-chip accent">${escapeHtml(tag.replaceAll('_', ' '))}</span>`).join('')}
            </div>
            <ul>
              ${intentPlan.appliedBullets.map((row) => `<li>${escapeHtml(row)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
          <div class="pp-card pp-create3-quick-suggestions">
          <p class="pp-card-kicker">Quick Style Options</p>
          <div class="pp-create-offer-moods">
              <button type="button" class="pp-choice-chip" data-quick-improve="bolder">More Bold</button>
              <button type="button" class="pp-choice-chip" data-quick-improve="cleaner">More Clean</button>
            <button type="button" class="pp-choice-chip" data-quick-improve="highlight_food">Highlight food</button>
              <button type="button" class="pp-choice-chip" data-quick-improve="premium">Premium look</button>
              <button type="button" class="pp-choice-chip" data-quick-improve="fun">Fun look</button>
          </div>
        </div>
        <div class="pp-create3-suggestion-list">${suggestionCards}</div>
        <div class="pp-create3-resolution-rules">
          <span class="pp-card-kicker">Image Rules</span>
          <p>Source: <strong>${escapeHtml(imageMeta.source || previewSource || 'generated')}</strong>${imageMeta.provider ? ` · Provider: ${escapeHtml(imageMeta.provider)}` : ''}</p>
          <p class="pp-muted-copy">Generation order: uploaded image → AI generation → item-aware fallback.</p>
          ${imageMeta.reason ? `<p class="pp-muted-copy">Fallback reason: ${escapeHtml(imageMeta.reason)}</p>` : ''}
        </div>
        ${previewSource.includes('fallback') ? '<p class="pp-create3-fallback-note">Using a cuisine-matched fallback preview while we improve generation quality for this item.</p>' : ''}
        <details class="pp-card pp-create3-advanced-controls">
          <summary>Advanced controls (optional)</summary>
          <div class="pp-create3-controls">
            <p class="pp-card-kicker">Template Direction</p>
            <div class="pp-create-offer-moods">
              ${[
                ['food-focus', 'Food Focus'],
                ['bold-promo', 'Bold Promo'],
                ['minimal-clean', 'Minimal Clean'],
                ['premium', 'Premium'],
                ['text-forward', 'Text-forward'],
              ].map(([id, label]) => `<button type="button" class="pp-choice-chip${layoutPreset === id ? ' active' : ''}${intentPlan.preferredPreset === id ? ' applied-hint' : ''}" data-layout-preset="${id}">${label}${intentPlan.preferredPreset === id ? ' • Applied' : ''}</button>`).join('')}
            </div>
            <p class="pp-card-kicker">Alignment</p>
            <div class="pp-create-offer-moods">
              ${['left', 'center', 'split'].map((value) => `<button type="button" class="pp-choice-chip${alignment === value ? ' active' : ''}${intentPlan.preferredAlignment === value ? ' applied-hint' : ''}" data-alignment="${value}">${value}${intentPlan.preferredAlignment === value ? ' • Applied' : ''}</button>`).join('')}
            </div>
            <p class="pp-card-kicker">Color Preset</p>
            <div class="pp-create-offer-moods">
              ${[
                ['deep-navy', 'Deep Navy'],
                ['warm-dark', 'Warm Dark'],
                ['clean-light', 'Clean Light'],
              ].map(([id, label]) => `<button type="button" class="pp-choice-chip${colorPreset === id ? ' active' : ''}${intentPlan.preferredColor === id ? ' applied-hint' : ''}" data-color-preset="${id}">${label}${intentPlan.preferredColor === id ? ' • Applied' : ''}</button>`).join('')}
            </div>
            <div class="pp-safezone-controls">
              <p class="pp-card-kicker">Safe-zone Nudge</p>
              ${[
                ['text', 'Text Block'],
                ['logo', 'Restaurant/Logo'],
                ['image', 'Image Frame'],
              ].map(([blockId, label]) => `
                <div class="pp-safezone-row">
                  <strong>${label}</strong>
                  <div class="pp-inline-actions">
                    <button type="button" class="pp-secondary-btn pp-inline-btn" data-nudge="${blockId}:x:-4">←</button>
                    <button type="button" class="pp-secondary-btn pp-inline-btn" data-nudge="${blockId}:x:4">→</button>
                    <button type="button" class="pp-secondary-btn pp-inline-btn" data-nudge="${blockId}:y:-4">↑</button>
                    <button type="button" class="pp-secondary-btn pp-inline-btn" data-nudge="${blockId}:y:4">↓</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </details>
        <div class="pp-create3-split">
          <aside class="pp-create3-preview-panel">
            <div class="pp-preview-canvas ${escapeHtml(`preset-${layoutPreset}`)} ${escapeHtml(`align-${alignment}`)} ${escapeHtml(`tone-${colorPreset}`)}" id="step3PreviewCanvas">
              ${previewImageUrl
                ? `<img class="pp-preview-bg" data-draggable="image" data-enlarge-image="${escapeHtml(previewImageUrl)}" data-enlarge-label="Step 3 poster preview" style="transform: translate(${imagePos.x}px, ${imagePos.y}px);" src="${escapeHtml(previewImageUrl)}" alt="Suggestion preview image" loading="lazy" />`
                : ''}
              <div class="pp-preview-overlay"></div>
              <div class="pp-preview-brand" data-draggable="logo" style="transform: translate(${logoPos.x}px, ${logoPos.y}px);">
                <span class="pp-card-chip accent">${escapeHtml(mode.toUpperCase())}</span>
              </div>
              <div class="pp-preview-copy" data-draggable="text" style="transform: translate(${textPos.x}px, ${textPos.y}px);">
                <h5>${escapeHtml(headline)}</h5>
                <p>${escapeHtml(offerLine)}</p>
                <p class="pp-preview-cta">${escapeHtml(cta)}</p>
                <small>${escapeHtml(footer)}</small>
              </div>
            </div>
            ${mode === 'reel' ? `
              <div class="pp-card pp-reel-scenes">
                <p class="pp-card-kicker">Reel Plan (6-7 sec)</p>
                <div class="pp-reel-scene-card">Hook: ${escapeHtml(reelHook)}</div>
                <div class="pp-reel-scene-card">Scene 1: Item close-up</div>
                <div class="pp-reel-scene-card">Scene 2: Offer reveal</div>
                <div class="pp-reel-scene-card">Scene 3: CTA + location</div>
              </div>
            ` : ''}
          </aside>

          <section class="pp-create3-edit-panel">
            <label>Headline<input id="createHeadlineInput" type="text" value="${escapeHtml(headline)}" /></label>
            ${headlineOptions.length ? `
              <div class="pp-headline-suggestions">
                <p class="pp-card-kicker">Attractive headline suggestions</p>
                <div class="pp-create-offer-moods">
                  ${headlineOptions.map((option) => `<button type="button" class="pp-choice-chip" data-headline-option="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join('')}
                </div>
              </div>
            ` : ''}
            <label>Offer<input id="createOfferLineInput" type="text" value="${escapeHtml(offerLine)}" /></label>
            <label>CTA<input id="createCtaInput" type="text" value="${escapeHtml(cta)}" /></label>
            <label>Footer<input id="createFooterInput" type="text" value="${escapeHtml(footer)}" /></label>
            ${mode === 'reel' ? `<label>Reel Hook<input id="createReelHookInput" type="text" value="${escapeHtml(reelHook)}" /></label>` : ''}

            ${mode === 'reel' && soundtrack ? `
              <div class="pp-card pp-soundtrack-picker">
                <p class="pp-card-kicker">Soundtrack Selector</p>
                <h3>${escapeHtml(soundtrack.label)}</h3>
                <p>${escapeHtml(soundtrack.category)} · ${escapeHtml(soundtrack.mood)}</p>
                <p class="pp-muted-copy">${escapeHtml(soundtrack.usage)} · ${escapeHtml(soundtrack.safe)}</p>
                <div class="pp-inline-actions">
                  ${state.createFlow.soundtrackSuggestions.map((sound) => `<button type="button" class="pp-secondary-btn pp-inline-btn${state.createFlow.selectedSoundtrackId === sound.id ? ' active' : ''}" data-select-soundtrack="${escapeHtml(sound.id)}">${escapeHtml(sound.category)}</button>`).join('')}
                </div>
              </div>
            ` : ''}

            <div class="pp-inline-actions">
              <button type="button" class="pp-secondary-btn pp-inline-btn" data-regenerate="headline" ${regenDisabled ? 'disabled' : ''}>${loadingHeadline ? 'Regenerating...' : 'Regenerate Headline'}</button>
              <button type="button" class="pp-secondary-btn pp-inline-btn" data-regenerate="image" ${regenDisabled ? 'disabled' : ''}>${loadingImage ? 'Regenerating...' : 'Regenerate Image'}</button>
              <button type="button" class="pp-secondary-btn pp-inline-btn" data-regenerate="all" ${regenDisabled ? 'disabled' : ''}>${loadingAll ? 'Regenerating...' : 'Regenerate All'}</button>
            </div>
            <div class="pp-inline-actions">
              <button type="button" class="pp-primary-btn pp-inline-btn" data-next-review>Continue to Review</button>
              <button type="button" class="pp-secondary-btn pp-inline-btn" data-save-draft>Keep In Session</button>
            </div>
          </section>
        </div>
      </section>
    `;
  }

  function renderCreateStep4() {
    const review = state.createFlow.reviewPayload || {};
    const poster = review.posterPreview || {};
    const summary = review.campaignSummary || {};
    const qrDataUrl = state.createFlow.qrDataUrl || '';

    return `
      <section class="pp-create3-step-body">
        <h4>Final Review & Go Live</h4>
        <p class="pp-muted-copy">Confirm poster, campaign details, and QR before publishing live.</p>
        <div class="pp-create4-review-grid">
          <article class="pp-card pp-create4-large-preview">
            <div class="pp-create4-preview-canvas">
              ${poster.imageUrl
                ? `<img src="${escapeHtml(poster.imageUrl)}" data-enlarge-image="${escapeHtml(poster.imageUrl)}" data-enlarge-label="Final poster full preview" alt="Final poster large preview" loading="lazy" />`
                : ''}
              <div class="pp-preview-overlay"></div>
              <div class="pp-create4-copy">
                <h3>${escapeHtml(poster.headline || 'Offer Preview')}</h3>
                <p>${escapeHtml(poster.offerLine || 'Limited Offer')}</p>
                <p class="pp-preview-cta">${escapeHtml(poster.cta || 'Scan to redeem')}</p>
                <small>${escapeHtml(poster.footer || `${state.profile?.restaurantName || 'Your Restaurant'} · ${state.profile?.restaurantLocation || 'Primary location'}`)}</small>
              </div>
            </div>
          </article>
          <article class="pp-card pp-create4-summary">
            <h3>Campaign Details</h3>
            <p><strong>Title:</strong> ${escapeHtml(summary.title || selectedSuggestion()?.title || 'Campaign')}</p>
            <p><strong>Status:</strong> ${escapeHtml(summary.status || 'Ready to Go Live')}</p>
            <p><strong>Platform:</strong> ${escapeHtml(summary.platform || state.createFlow.platform)}</p>
            <p><strong>Duration:</strong> ${escapeHtml(summary.duration || state.createFlow.duration)}</p>
            <p><strong>Offer Type:</strong> ${escapeHtml(summary.offerType || state.createFlow.offerType)}</p>
            <p><strong>Channels:</strong> ${escapeHtml(Array.isArray(summary.channels) ? summary.channels.join(', ') : 'Instagram, In-store QR')}</p>
            <div class="pp-create4-qr-block">
                <h4>QR Code Ready</h4>
              ${qrDataUrl
                ? `<img src="${escapeHtml(qrDataUrl)}" alt="Campaign QR code" /><p class="pp-muted-copy">Scan to redeem confirmation ready.</p>`
                : '<p class="pp-muted-copy">QR generation unavailable. Click retry below.</p><button type="button" class="pp-secondary-btn pp-inline-btn" data-retry-qr>Retry QR</button>'}
            </div>
            <label class="pp-check-inline pp-review-confirm">
              <input type="checkbox" id="createReviewConfirmInput" ${state.createFlow.reviewConfirmed ? 'checked' : ''} />
              I confirm this full poster preview is correct.
            </label>
            <div class="pp-inline-actions">
              <button type="button" class="pp-secondary-btn pp-inline-btn" data-back-to-edit>Back to Edit</button>
              <button type="button" class="pp-secondary-btn pp-inline-btn" data-save-draft>Keep In Session</button>
              <button type="button" class="pp-primary-btn pp-inline-btn" data-go-live ${state.createFlow.reviewConfirmed ? '' : 'disabled'}>Publish Offer</button>
            </div>
          </article>
        </div>
      </section>
    `;
  }

  function collectDraftInput() {
    const menuItems = normalizeMenuItems(state.profile?.menuItems || []);
    const menuSummary = menuSignalsSummary(menuItems);
    const customRuleActive = state.createFlow.offerType === 'Custom Rule';
    return {
      storeId: state.storeId,
      promotionIntent: state.createFlow.intent || 'combo',
      itemDescription: state.createFlow.item,
      mood: state.createFlow.styleKeywords.includes('Premium')
        ? 'premium'
        : (state.createFlow.styleKeywords.includes('Fun') ? 'fun' : 'bold'),
      visualStyle: state.createFlow.styleKeywords.join(', '),
      layoutStyle: state.createFlow.editState.layoutPreset,
      imageSourcePreference: state.createFlow.aiDecide ? 'Generate using AI' : 'Upload image',
      uploadedAssetIds: menuItems.map((item) => asString(item.imageAssetId)).filter(Boolean),
      businessContext: {
        restaurantName: state.profile?.restaurantName || '',
        cuisineType: state.profile?.cuisineType || '',
        businessType: state.profile?.businessType || '',
        location: state.profile?.restaurantLocation || '',
        menuItems,
        menuSignalsSummary: menuSummary,
      },
      platform: state.createFlow.platform,
      duration: state.createFlow.duration,
      offerType: state.createFlow.offerType,
      offerConfig: {
        offerType: customRuleActive
          ? 'custom_rule'
          : asString(state.createFlow.offerType).toLowerCase().replaceAll(' ', '_'),
        customRule: customRuleActive ? { ...state.createFlow.customOffer } : {},
      },
      channelPlan: {
        channels: state.createFlow.selectedChannels,
        soundtrackMood: state.createFlow.soundtrackMood,
      },
      campaignGoal: state.createFlow.campaignGoal,
      userIntent: {
        rawText: state.createFlow.userIntentInput,
        tags: state.createFlow.userIntentTags,
        parsed: state.createFlow.parsedIntentHints,
      },
      performanceSignals: {
        ...menuSummary,
        campaignGoal: state.createFlow.campaignGoal,
      },
    };
  }

  async function regenerateFromBackend(action = 'all') {
    state.createFlow.regenLoadingByAction[action] = true;
    setCreateNotice(`Regenerating ${action}...`, 'info');
    renderCreateFlow();
    try {
      const result = await dataAdapter.regenerateCreateSuggestions({
        action,
        draftInput: collectDraftInput(),
        selectedSuggestionId: state.createFlow.selectedSuggestionId,
        editState: state.createFlow.editState,
      });

      state.createFlow.suggestions = result.suggestions || [];
      state.createFlow.selectedSuggestionId = result.selectedSuggestionId || state.createFlow.suggestions[0]?.id || '';
      const selected = selectedSuggestion();
      if (selected) {
        if (action === 'headline') {
          applySuggestionToEditor(selected, { skipOfferLine: true, keepLayout: true });
        } else if (action === 'image') {
          applySuggestionToEditor(selected, { skipHeadline: true, keepLayout: true });
        } else {
          applySuggestionToEditor(selected);
        }
      }
      state.createFlow.reviewPayload = null;
      state.createFlow.qrDataUrl = '';
      state.createFlow.reviewConfirmed = false;
      setCreateNotice('Suggestions refreshed from backend.', 'success');
    } catch (_error) {
      setCreateNotice('Could not regenerate right now. Try again.', 'error');
    } finally {
      state.createFlow.regenLoadingByAction[action] = false;
      renderCreateFlow();
    }
  }

  async function loadReviewPayload() {
    setCreateNotice('Preparing large review preview and QR...', 'info');
    const result = await dataAdapter.getCreateReviewPayload({
      selectedSuggestion: selectedSuggestion(),
      draftInput: collectDraftInput(),
      editState: state.createFlow.editState,
    });
    state.createFlow.reviewPayload = result;
    state.createFlow.qrDataUrl = result.qrDataUrl || '';
  }

  async function ensureCreateSuggestions(force = false) {
    const signature = buildCreateSuggestionSignature();
    if (!force && state.createFlow.suggestions.length && state.createFlow.lastSuggestionSignature === signature) return;

    state.createFlow.generationStatus = 'Generating your campaign...';
    renderCreateFlow();

    const menuItems = normalizeMenuItems(state.profile?.menuItems || []);
    const menuSummary = menuSignalsSummary(menuItems);
    const payload = {
      mode: state.createFlow.mode,
      intent: state.createFlow.intent,
      item: state.createFlow.item,
      offerType: state.createFlow.offerType,
      duration: state.createFlow.duration,
      platform: state.createFlow.platform,
      styleKeywords: state.createFlow.styleKeywords,
      userIntentInput: state.createFlow.userIntentInput,
      userIntentTags: state.createFlow.userIntentTags,
      parsedIntentHints: state.createFlow.parsedIntentHints,
      aiDecide: state.createFlow.aiDecide,
      selectedAssetNames: state.createFlow.selectedAssetNames,
      campaignGoal: state.createFlow.campaignGoal,
      channelPlan: {
        selectedChannels: state.createFlow.selectedChannels,
        soundtrackMood: state.createFlow.soundtrackMood,
      },
      businessContext: {
        restaurantName: state.profile?.restaurantName || '',
        cuisineType: state.profile?.cuisineType || '',
        businessType: state.profile?.businessType || '',
        location: state.profile?.restaurantLocation || '',
        menuItems,
        menuSignalsSummary: menuSummary,
      },
      performanceSignals: {
        ...menuSummary,
        campaignGoal: state.createFlow.campaignGoal,
      },
      operationsContext: {
        peakHours: state.profile?.peakHours || [],
        slowHours: state.profile?.slowHours || [],
        busiestDays: state.profile?.busiestDays || [],
        primaryGoal: state.profile?.primaryGoal || '',
      },
    };

    const response = await dataAdapter.getCreateSuggestions(payload);
    state.createFlow.suggestions = response.suggestions || [];
    state.createFlow.soundtrackSuggestions = (response.soundtrackSuggestions || [])
      .filter((row) => !state.createFlow.soundtrackMood || asString(row.mood).toLowerCase().includes(state.createFlow.soundtrackMood));
    if (!state.createFlow.soundtrackSuggestions.length) state.createFlow.soundtrackSuggestions = response.soundtrackSuggestions || [];
    state.createFlow.selectedSuggestionId = state.createFlow.suggestions[0]?.id || '';
    state.createFlow.selectedSoundtrackId = state.createFlow.soundtrackSuggestions[0]?.id || '';
    state.createFlow.lastSuggestionSignature = signature;
    state.createFlow.generationStatus = response.generationStatus?.message || '';
    state.createFlow.orchestratorSummary = response.recommendationSummary || null;
    state.createFlow.recommendationRoutes = response.orchestrator?.rankedCampaignOptions || [];
    state.createFlow.analyticsTags = response.analyticsTags || {};
    const first = selectedSuggestion();
    if (first && state.createFlow.entryMode === 'guided') applySuggestionToEditor(first);
    maybeApplyIntentDrivenConfig();
    state.createFlow.reviewConfirmed = false;
  }

  function bindStep3DragHandles() {
    const canvas = refs.createBody.querySelector('#step3PreviewCanvas');
    if (!canvas) return;
    const handles = canvas.querySelectorAll('[data-draggable]');
    handles.forEach((handle) => {
      handle.style.cursor = 'grab';
      handle.addEventListener('pointerdown', (event) => {
        const block = asString(handle.dataset.draggable);
        if (!block) return;
        const startX = event.clientX;
        const startY = event.clientY;
        const origin = state.createFlow.editState.safeZonePositions[block] || { x: 0, y: 0 };
        handle.style.cursor = 'grabbing';
        handle.setPointerCapture(event.pointerId);

        const onMove = (moveEvent) => {
          const dx = Math.round((moveEvent.clientX - startX) / 2) * 2;
          const dy = Math.round((moveEvent.clientY - startY) / 2) * 2;
          setSafeZonePosition(block, 'x', origin.x + dx);
          setSafeZonePosition(block, 'y', origin.y + dy);
          const next = state.createFlow.editState.safeZonePositions[block] || { x: 0, y: 0 };
          handle.style.transform = `translate(${next.x}px, ${next.y}px)`;
        };

        const onUp = () => {
          handle.style.cursor = 'grab';
          handle.removeEventListener('pointermove', onMove);
          handle.removeEventListener('pointerup', onUp);
          handle.removeEventListener('pointercancel', onUp);
          renderCreateFlow();
        };

        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('pointerup', onUp);
        handle.addEventListener('pointercancel', onUp);
      });
    });
  }

  function renderCreateFlow() {
    createProgressBar();
    refs.createBack.disabled = state.createFlow.step <= 1;
    refs.createBack.classList.toggle('hidden', state.createFlow.step <= 1);
    refs.createNext.textContent = state.createFlow.step >= 4 ? 'Done' : 'Next';
    refs.createNext.classList.toggle('hidden', state.createFlow.step === 4);

    refs.createSubtitle.textContent = state.createFlow.generationStatus
      || 'Owner-first creation flow. Smart suggestions do the heavy lifting.';

    if (state.createFlow.step === 1) {
      refs.createBody.innerHTML = renderCreateStep1();
      refs.createNext.disabled = !state.createFlow.intent;
      refs.createBody.querySelectorAll('[data-guided-entry]').forEach((button) => {
        button.addEventListener('click', () => {
          const mode = asString(button.dataset.guidedEntry);
          state.createFlow.entryMode = mode === 'manual' ? 'manual' : 'guided';
          setCreateNotice(
            state.createFlow.entryMode === 'guided'
              ? 'Guided mode selected. We will auto-highlight best next move.'
              : 'Manual mode selected. We will keep your edits as primary.',
            'info',
          );
          renderCreateFlow();
        });
      });
    } else if (state.createFlow.step === 2) {
      refs.createBody.innerHTML = renderCreateStep2();
      refs.createNext.disabled = !asString(state.createFlow.item);
      refs.createBody.querySelector('#createAssetInput')?.addEventListener('change', (event) => {
        const files = Array.from(event.target.files || []);
        state.createFlow.selectedAssetNames = files.map((file) => file.name).slice(0, 4);
        invalidateCreateOutputs('Inputs changed. Suggestions will refresh on next step.');
        renderCreateFlow();
      });
      refs.createBody.querySelector('#createAiDecideInput')?.addEventListener('change', (event) => {
        state.createFlow.aiDecide = event.target.checked;
        invalidateCreateOutputs('Image strategy updated. Suggestions will refresh.');
        renderCreateFlow();
      });
      refs.createBody.querySelectorAll('[data-style-keyword]').forEach((button) => {
        button.addEventListener('click', () => {
          const value = asString(button.dataset.styleKeyword);
          const exists = state.createFlow.styleKeywords.includes(value);
          if (exists) state.createFlow.styleKeywords = state.createFlow.styleKeywords.filter((row) => row !== value);
          else state.createFlow.styleKeywords.push(value);
          if (!state.createFlow.styleKeywords.length) state.createFlow.styleKeywords = ['Bold'];
          invalidateCreateOutputs('Style changed. We will regenerate suggestions.');
          renderCreateFlow();
        });
      });
      const createItemInput = refs.createBody.querySelector('#createItemInput');
      const menuSearchWrap = refs.createBody.querySelector('[data-menu-search]');
      const menuSearchList = refs.createBody.querySelector('#createItemSearchList');
      const menuSearchEmpty = refs.createBody.querySelector('[data-menu-search-empty]');
      const menuSearchToggle = refs.createBody.querySelector('[data-menu-search-toggle]');
      const menuSearchOptions = Array.from(refs.createBody.querySelectorAll('[data-menu-search-item]'));
      const visibleMenuOption = () => menuSearchOptions.find((option) => !option.classList.contains('hidden'));
      const setMenuSearchOpen = (open) => {
        if (!menuSearchWrap || !menuSearchList || !menuSearchOptions.length) return;
        menuSearchWrap.classList.toggle('open', open);
        menuSearchList.classList.toggle('open', open);
        createItemInput?.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      const filterMenuSearch = (query = '') => {
        if (!menuSearchOptions.length) return 0;
        const normalized = asString(query).trim().toLowerCase();
        let visibleCount = 0;
        menuSearchOptions.forEach((option) => {
          const name = asString(option.dataset.menuSearchItem).toLowerCase();
          const status = asString(option.dataset.menuSearchStatus).toLowerCase().replaceAll('_', ' ');
          const isVisible = !normalized || name.includes(normalized) || status.includes(normalized);
          option.classList.toggle('hidden', !isVisible);
          if (isVisible) visibleCount += 1;
        });
        menuSearchEmpty?.classList.toggle('hidden', visibleCount > 0);
        return visibleCount;
      };
      const applySelectedMenuItem = (name = '') => {
        state.createFlow.item = asString(name);
        if (createItemInput) createItemInput.value = state.createFlow.item;
        refs.createNext.disabled = !state.createFlow.item;
        invalidateCreateOutputs('Menu item selected. Suggestions will align to this item.');
        filterMenuSearch(state.createFlow.item);
        setMenuSearchOpen(false);
      };
      createItemInput?.addEventListener('input', (event) => {
        state.createFlow.item = asString(event.target.value);
        invalidateCreateOutputs();
        refs.createNext.disabled = !state.createFlow.item;
        filterMenuSearch(state.createFlow.item);
        setMenuSearchOpen(true);
      });
      createItemInput?.addEventListener('focus', () => {
        filterMenuSearch(state.createFlow.item);
        setMenuSearchOpen(true);
      });
      createItemInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          setMenuSearchOpen(false);
          return;
        }
        if (event.key === 'ArrowDown') {
          const firstOption = visibleMenuOption();
          if (!firstOption) return;
          event.preventDefault();
          firstOption.focus();
          setMenuSearchOpen(true);
        }
      });
      createItemInput?.addEventListener('blur', () => {
        setTimeout(() => {
          const active = document.activeElement;
          if ((menuSearchWrap && menuSearchWrap.contains(active)) || (menuSearchList && menuSearchList.contains(active))) return;
          setMenuSearchOpen(false);
        }, 80);
      });
      menuSearchToggle?.addEventListener('click', () => {
        const shouldOpen = !menuSearchList?.classList.contains('open');
        setMenuSearchOpen(shouldOpen);
        filterMenuSearch(state.createFlow.item);
        createItemInput?.focus();
      });
      menuSearchOptions.forEach((option) => {
        option.addEventListener('click', () => applySelectedMenuItem(option.dataset.menuSearchItem));
        option.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          applySelectedMenuItem(option.dataset.menuSearchItem);
        });
      });
      refs.createBody.querySelector('#createOfferTypeInput')?.addEventListener('change', (event) => {
        state.createFlow.offerType = asString(event.target.value, 'Percentage Off');
        invalidateCreateOutputs();
        renderCreateFlow();
      });
      refs.createBody.querySelector('#createCampaignGoalInput')?.addEventListener('change', (event) => {
        state.createFlow.campaignGoal = asString(event.target.value, 'traffic');
        invalidateCreateOutputs();
      });
      refs.createBody.querySelector('#createDurationInput')?.addEventListener('change', (event) => {
        state.createFlow.duration = asString(event.target.value, '7 days');
        invalidateCreateOutputs();
      });
      refs.createBody.querySelector('#createPlatformInput')?.addEventListener('change', (event) => {
        state.createFlow.platform = asString(event.target.value, 'Instagram Post');
        invalidateCreateOutputs();
      });
      refs.createBody.querySelector('#createUserIntentInput')?.addEventListener('input', (event) => {
        state.createFlow.userIntentInput = asString(event.target.value);
        state.createFlow.userIntentTags = computedIntentTags(state.createFlow.userIntentInput);
        state.createFlow.parsedIntentHints = parseIntentHints(state.createFlow.userIntentInput, state.createFlow.userIntentTags);
        invalidateCreateOutputs();
        refreshIntentPreviewInline();
      });
      refs.createBody.querySelectorAll('[data-intent-chip]').forEach((button) => {
        button.addEventListener('click', () => {
          const chip = asString(button.dataset.intentChip);
          const current = asString(state.createFlow.userIntentInput);
          if (current.toLowerCase().includes(chip.toLowerCase())) return;
          state.createFlow.userIntentInput = current ? `${current}, ${chip}` : chip;
          state.createFlow.userIntentTags = computedIntentTags(state.createFlow.userIntentInput);
          state.createFlow.parsedIntentHints = parseIntentHints(state.createFlow.userIntentInput, state.createFlow.userIntentTags);
          invalidateCreateOutputs();
          renderCreateFlow();
        });
      });
      refs.createBody.querySelectorAll('[data-menu-pick]').forEach((button) => {
        button.addEventListener('click', () => {
          state.createFlow.item = asString(button.dataset.menuPick);
          invalidateCreateOutputs('Menu item selected. Suggestions will align to this item.');
          renderCreateFlow();
        });
      });
      refs.createBody.querySelectorAll('[data-channel-pick]').forEach((button) => {
        button.addEventListener('click', () => {
          const channel = asString(button.dataset.channelPick);
          const exists = state.createFlow.selectedChannels.includes(channel);
          if (exists) state.createFlow.selectedChannels = state.createFlow.selectedChannels.filter((row) => row !== channel);
          else state.createFlow.selectedChannels.push(channel);
          if (!state.createFlow.selectedChannels.length) state.createFlow.selectedChannels = ['Instagram Post'];
          invalidateCreateOutputs('Channel plan updated.');
          renderCreateFlow();
        });
      });
      refs.createBody.querySelector('#createSoundtrackMoodInput')?.addEventListener('change', (event) => {
        state.createFlow.soundtrackMood = asString(event.target.value, 'upbeat');
        invalidateCreateOutputs('Soundtrack mood updated.');
      });
      refs.createBody.querySelector('#createCustomLabelInput')?.addEventListener('input', (event) => {
        state.createFlow.customOffer.customLabel = asString(event.target.value);
      });
      refs.createBody.querySelector('#createEligibilityRuleInput')?.addEventListener('input', (event) => {
        state.createFlow.customOffer.eligibilityRule = asString(event.target.value);
      });
      refs.createBody.querySelector('#createRewardRuleInput')?.addEventListener('input', (event) => {
        state.createFlow.customOffer.rewardRule = asString(event.target.value);
      });
      refs.createBody.querySelector('#createExclusionsInput')?.addEventListener('input', (event) => {
        state.createFlow.customOffer.exclusions = asString(event.target.value);
      });
      refs.createBody.querySelector('#createLegalTermsInput')?.addEventListener('input', (event) => {
        state.createFlow.customOffer.legalTerms = asString(event.target.value);
      });
      refs.createBody.querySelector('#createRedemptionLimitInput')?.addEventListener('input', (event) => {
        state.createFlow.customOffer.redemptionLimit = asString(event.target.value);
      });
    } else if (state.createFlow.step === 3) {
      refs.createBody.innerHTML = renderCreateStep3();
      refs.createNext.disabled = false;
      bindStep3DragHandles();
      bindImageEnlargeHandlers();
      refs.createBody.querySelectorAll('[data-select-suggestion]').forEach((button) => {
        button.addEventListener('click', () => {
          state.createFlow.selectedSuggestionId = asString(button.dataset.selectSuggestion);
          const row = selectedSuggestion();
          if (row) applySuggestionToEditor(row);
          state.createFlow.reviewConfirmed = false;
          renderCreateFlow();
        });
      });
      refs.createBody.querySelectorAll('[data-headline-option]').forEach((button) => {
        button.addEventListener('click', () => {
          state.createFlow.headline = asString(button.dataset.headlineOption, state.createFlow.headline);
          state.createFlow.reviewConfirmed = false;
          renderCreateFlow();
        });
      });
      refs.createBody.querySelectorAll('[data-quick-improve]').forEach((button) => {
        button.addEventListener('click', () => {
          applyQuickImprove(button.dataset.quickImprove);
          renderCreateFlow();
        });
      });
      refs.createBody.querySelectorAll('[data-select-soundtrack]').forEach((button) => {
        button.addEventListener('click', () => {
          state.createFlow.selectedSoundtrackId = asString(button.dataset.selectSoundtrack);
          renderCreateFlow();
        });
      });
      refs.createBody.querySelectorAll('[data-layout-preset]').forEach((button) => {
        button.addEventListener('click', () => {
          state.createFlow.editState.layoutPreset = asString(button.dataset.layoutPreset, 'food-focus');
          state.createFlow.reviewConfirmed = false;
          renderCreateFlow();
        });
      });
      refs.createBody.querySelectorAll('[data-alignment]').forEach((button) => {
        button.addEventListener('click', () => {
          state.createFlow.editState.alignment = asString(button.dataset.alignment, 'left');
          state.createFlow.reviewConfirmed = false;
          renderCreateFlow();
        });
      });
      refs.createBody.querySelectorAll('[data-color-preset]').forEach((button) => {
        button.addEventListener('click', () => {
          state.createFlow.editState.colorPreset = asString(button.dataset.colorPreset, 'deep-navy');
          state.createFlow.reviewConfirmed = false;
          renderCreateFlow();
        });
      });
      refs.createBody.querySelectorAll('[data-nudge]').forEach((button) => {
        button.addEventListener('click', () => {
          const [block, axis, rawDelta] = asString(button.dataset.nudge).split(':');
          nudgeSafeZone(block, axis, Number(rawDelta || 0));
          state.createFlow.reviewConfirmed = false;
          renderCreateFlow();
        });
      });
      refs.createBody.querySelector('[data-next-review]')?.addEventListener('click', async () => {
        await onCreateNext();
      });
      refs.createBody.querySelector('[data-save-draft]')?.addEventListener('click', () => {
        setCreateNotice('Kept in this session only. Publish to save for your team.', 'info');
      });
      refs.createBody.querySelectorAll('[data-regenerate]').forEach((button) => {
        button.addEventListener('click', async () => {
          const type = asString(button.dataset.regenerate, 'all');
          await regenerateFromBackend(type);
        });
      });

      refs.createBody.querySelector('#createHeadlineInput')?.addEventListener('input', (event) => {
        state.createFlow.headline = asString(event.target.value);
        state.createFlow.reviewConfirmed = false;
      });
      refs.createBody.querySelector('#createOfferLineInput')?.addEventListener('input', (event) => {
        state.createFlow.offerLine = asString(event.target.value);
        state.createFlow.reviewConfirmed = false;
      });
      refs.createBody.querySelector('#createCtaInput')?.addEventListener('input', (event) => {
        state.createFlow.cta = asString(event.target.value);
        state.createFlow.reviewConfirmed = false;
      });
      refs.createBody.querySelector('#createFooterInput')?.addEventListener('input', (event) => {
        state.createFlow.footer = asString(event.target.value);
        state.createFlow.reviewConfirmed = false;
      });
      refs.createBody.querySelector('#createReelHookInput')?.addEventListener('input', (event) => {
        state.createFlow.reelHook = asString(event.target.value);
        state.createFlow.reviewConfirmed = false;
      });
    } else {
      refs.createBody.innerHTML = renderCreateStep4();
      refs.createNext.disabled = false;
      bindImageEnlargeHandlers();
      refs.createBody.querySelector('[data-back-to-edit]')?.addEventListener('click', () => {
        state.createFlow.step = 3;
        renderCreateFlow();
      });
      refs.createBody.querySelector('[data-go-live]')?.addEventListener('click', async () => {
        const selected = selectedSuggestion();
        const button = refs.createBody.querySelector('[data-go-live]');
        if (!button) return;
        button.disabled = true;
        try {
          await dataAdapter.createLiveCampaign({
            storeId: state.storeId,
            restaurantName: state.profile?.restaurantName || '',
            item: state.createFlow.item,
            offerType: state.createFlow.offerType,
            campaignGoal: state.createFlow.campaignGoal,
            audiencePrimary: normalizeBuilderAudience(asString(state.profile?.audiencePrimary, 'general')),
            brandTone: state.profile?.brandTone || '',
            offerConfig: {
              offerType: asString(state.createFlow.offerType).toLowerCase().replaceAll(' ', '_'),
              customRule: state.createFlow.offerType === 'Custom Rule' ? { ...state.createFlow.customOffer } : {},
            },
            customRule: state.createFlow.customOffer,
            selectedChannels: state.createFlow.selectedChannels,
            headline: state.createFlow.headline || selected?.headline || selected?.title,
            offerLine: state.createFlow.offerLine || selected?.offerLine,
            cta: state.createFlow.cta || selected?.cta,
          });
          dataAdapter.trackMenuIntelligenceEvent?.({ event: 'campaign_published', storeId: state.storeId });
          dataAdapter.trackMenuIntelligenceEvent?.({ event: 'channel_asset_published', storeId: state.storeId });
          const menuSummary = menuSignalsSummary(state.profile?.menuItems || []);
          if (menuSummary.totalItems > 0) {
            dataAdapter.trackMenuIntelligenceEvent?.({
              event: 'campaign_published_from_menu_signal',
              storeId: state.storeId,
              menuItemCount: menuSummary.totalItems,
              bestSellerCount: menuSummary.bestSellerCount,
              slowMoverCount: menuSummary.slowMoverCount,
              withImageCount: menuSummary.withImageCount,
            });
          }
          setCreateNotice('Campaign is now live with QR and final poster.', 'success');
          closeCreateFlow();
          navigate('campaigns', { status: 'active' });
        } catch (_error) {
          setCreateNotice('Go live failed. Please try again.', 'error');
        } finally {
          button.disabled = false;
        }
      });
      refs.createBody.querySelector('#createReviewConfirmInput')?.addEventListener('change', (event) => {
        state.createFlow.reviewConfirmed = Boolean(event.target.checked);
        renderCreateFlow();
      });
      refs.createBody.querySelector('[data-save-draft]')?.addEventListener('click', () => {
        setCreateNotice('Kept in this session only. Publish to save for your team.', 'info');
      });
      refs.createBody.querySelector('[data-retry-qr]')?.addEventListener('click', async () => {
        await loadReviewPayload();
        renderCreateFlow();
      });
    }

    refs.createBody.querySelectorAll('[data-create-intent]').forEach((button) => {
      button.addEventListener('click', () => {
        state.createFlow.intent = asString(button.dataset.createIntent);
        state.createFlow.mode = asString(button.dataset.createMode, state.createFlow.mode);
        renderCreateFlow();
      });
    });
  }

  async function onCreateNext() {
    if (state.createFlow.step === 1 && !state.createFlow.intent) {
      setCreateNotice('Select an intent to continue.', 'warning');
      return;
    }
    if (state.createFlow.step === 1) {
      dataAdapter.trackMenuIntelligenceEvent?.({
        event: 'intent_selected',
        storeId: state.storeId,
      });
    }

    if (state.createFlow.step === 2 && !state.createFlow.item) {
      setCreateNotice('Add an item or offer to continue.', 'warning');
      return;
    }

    if (state.createFlow.step === 2) {
      const menuSummary = menuSignalsSummary(state.profile?.menuItems || []);
      dataAdapter.trackMenuIntelligenceEvent?.({
        event: 'setup_started',
        storeId: state.storeId,
        menuItemCount: menuSummary.totalItems,
      });
      dataAdapter.trackMenuIntelligenceEvent?.({
        event: 'menu_item_selected',
        storeId: state.storeId,
        menuItemCount: menuSummary.totalItems,
      });
      dataAdapter.trackMenuIntelligenceEvent?.({
        event: 'offer_type_selected',
        storeId: state.storeId,
      });
      if (state.createFlow.offerType === 'Custom Rule') {
        dataAdapter.trackMenuIntelligenceEvent?.({
          event: 'custom_rule_added',
          storeId: state.storeId,
        });
      }
      dataAdapter.trackCreateIntentInputUsed?.({
        length: state.createFlow.userIntentInput.length,
        selectedChips: state.createFlow.userIntentTags,
        parsedTags: state.createFlow.parsedIntentHints,
      });
      setCreateNotice('Generating your campaign...', 'info');
      dataAdapter.trackMenuIntelligenceEvent?.({
        event: 'ai_orchestrator_requested',
        storeId: state.storeId,
      });
      await ensureCreateSuggestions(true);
      if (menuSummary.totalItems > 0) {
        dataAdapter.trackMenuIntelligenceEvent?.({
          event: 'suggestion_used_with_menu_signal',
          storeId: state.storeId,
          menuItemCount: menuSummary.totalItems,
          bestSellerCount: menuSummary.bestSellerCount,
          slowMoverCount: menuSummary.slowMoverCount,
          withImageCount: menuSummary.withImageCount,
        });
      }
      setCreateNotice('Edit your campaign and regenerate until satisfied.', 'success');
    }

    if (state.createFlow.step === 3) {
      dataAdapter.trackMenuIntelligenceEvent?.({
        event: 'ai_option_selected',
        storeId: state.storeId,
      });
      await loadReviewPayload();
      state.createFlow.step = 4;
      setCreateNotice('Final review is ready. Confirm and go live.', 'success');
      renderCreateFlow();
      return;
    }

    if (state.createFlow.step >= 4) {
      closeCreateFlow();
      return;
    }

    state.createFlow.step += 1;
    renderCreateFlow();
  }

  function onCreateBack() {
    if (state.createFlow.step <= 1) return;
    state.createFlow.step -= 1;
    renderCreateFlow();
  }

  function bindGlobalEvents() {
    refs.sidebarNav.querySelectorAll('[data-route]').forEach((button) => {
      button.addEventListener('click', () => navigate(button.dataset.route));
    });

    refs.primaryCreateButton.addEventListener('click', () => { resetCampaignBuilder(); navigate('create-campaign'); });
    refs.accountButton?.addEventListener('click', () => navigate('settings'));

    refs.createClose.addEventListener('click', closeCreateFlow);
    refs.createCancel.addEventListener('click', closeCreateFlow);
    refs.createBack.addEventListener('click', onCreateBack);
    refs.createNext.addEventListener('click', () => {
      onCreateNext().catch(() => setCreateNotice('Could not advance this step right now.', 'error'));
    });

    refs.createModal.addEventListener('click', (event) => {
      if (event.target === refs.createModal) closeCreateFlow();
    });

    refs.imageLightboxClose?.addEventListener('click', closeImageLightbox);
    refs.imageLightbox?.addEventListener('click', (event) => {
      if (event.target === refs.imageLightbox) closeImageLightbox();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && refs.imageLightbox?.getAttribute('aria-hidden') === 'false') {
        closeImageLightbox();
        return;
      }
      if (event.key === 'Escape' && refs.createModal.getAttribute('aria-hidden') === 'false') {
        closeCreateFlow();
      }
    });

    refs.globalSearchInput?.addEventListener('input', () => {
      const v = asString(refs.globalSearchInput?.value, '');
      if (state.route === 'campaigns') {
        state.campaignListSearch = v;
        remountCampaignCardsOnly();
      } else if (state.route === 'live') {
        state.liveListSearch = v;
        remountLiveCardsOnly();
      }
    });
  }

  function syncGlobalSearchPlaceholder() {
    if (!refs.globalSearchInput) return;
    const map = {
      campaigns: 'Search campaigns by name, offer, or channel…',
      home: 'Search actions, campaigns, assets…',
      live: 'Search live campaigns by name or offer…',
      'content-studio': 'Search posts, reels, and drafts…',
      'campaign-detail': 'Search actions, campaigns, assets…',
      'create-campaign': 'Search actions, campaigns, assets…',
      'menu-import': 'Search actions, campaigns, assets…',
      analytics: 'Search actions, campaigns, assets…',
      settings: 'Search actions, campaigns, assets…',
      'smart-reminders': 'Search actions, campaigns, assets…',
      'reel-guide': 'Search actions, campaigns, assets…',
      create: 'Search actions, campaigns, assets…',
    };
    refs.globalSearchInput.placeholder = map[state.route] || 'Search actions, campaigns, assets…';
  }

  async function refreshRoute() {
    state.loadingRoute = true;
    state.routeError = '';
    renderSidebarActive();
    renderLoadingShell();

    try {
      if (state.route === 'home') await renderHomeRoute();
      else if (state.route === 'live') await renderLiveRoute();
      else if (state.route === 'campaigns') await renderCampaignsRoute();
      else if (state.route === 'campaign-detail') await renderCampaignDetailRoute();
      else if (state.route === 'content-studio') await renderContentStudioRoute();
      else if (state.route === 'menu-import') renderMenuImportRoute();
      else if (state.route === 'create-campaign') renderCampaignBuilderRoute();
      else if (state.route === 'create') await renderCreateRoute();
      else if (state.route === 'analytics') await renderAnalyticsRoute();
      else if (state.route === 'settings') await renderSettingsRoute();
      else if (state.route === 'smart-reminders') await renderSmartRemindersRoute();
      else if (state.route === 'reel-guide') renderReelGuideRoute();
      else await renderHomeRoute();
    } catch (error) {
      setRouteError(error?.message || 'Unable to render this section.');
    } finally {
      state.loadingRoute = false;
      syncGlobalSearchPlaceholder();
    }
  }

  async function boot() {
    const parsed = parseRouteFromUrl();
    state.route = parsed.route;
    state.routeParams = parsed.routeParams;
    state.campaignDetailTab = 'overview';

    state.profile = await dataAdapter.getGrowthHubData({ storeId: state.storeId }).then((result) => result.profile);
    renderProfile();
    bindGlobalEvents();
    await refreshRoute();

    try {
      const modeRes = await fetch('/api/config/mode');
      const modeData = await modeRes.json();
      if (modeData.devMode) {
        const badge = document.createElement('div');
        badge.className = 'pp-dev-badge';
        badge.textContent = 'DEV MODE — AI calls free';
        document.body.appendChild(badge);
      }
    } catch { /* ignore */ }

    if (state.routeParams.openCreate === '1') {
      resetCampaignBuilder();
      navigate('create-campaign');
    }
  }

  boot().catch((error) => {
    setRouteError(error?.message || 'Unable to start the app.');
  });
})(window);
