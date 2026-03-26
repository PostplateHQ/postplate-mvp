(function initPostPlateGrowthOS(globalScope) {
  const dataAdapter = globalScope.PostPlateDataAdapter;
  if (!dataAdapter) return;

  const DEFAULT_STORE_ID = 'taco123';
  const ROUTES = ['home', 'campaigns', 'campaign-detail', 'content-studio', 'create', 'analytics', 'settings'];
  const CAMPAIGN_STATUSES = ['active', 'scheduled', 'drafts', 'completed'];
  const CONTENT_TABS = ['posts', 'reels', 'offers', 'drafts'];
  const CREATE_STEPS = ['Intent', 'Smart Input', 'Edit + Regenerate', 'Review + Go Live'];
  const CREATE_INTENTS = [
    { id: 'increase_sales', title: 'Increase Sales', desc: 'Drive immediate demand with a clear promotion.', mode: 'offer' },
    { id: 'promote_item', title: 'Promote Item', desc: 'Spotlight a menu item with fast social output.', mode: 'post' },
    { id: 'create_offer', title: 'Create Offer', desc: 'Launch an offer campaign with smart defaults.', mode: 'offer' },
    { id: 'design_post', title: 'Just Design Post', desc: 'Generate social-ready creative quickly.', mode: 'post' },
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

  const state = {
    storeId: DEFAULT_STORE_ID,
    route: 'home',
    routeParams: {},
    profile: null,
    growthHub: null,
    campaigns: { status: 'active', items: [], totals: {} },
    campaignDetail: null,
    campaignDetailTab: 'overview',
    contentStudio: { tab: 'posts', items: [] },
    analytics: null,
    settings: null,
    loadingRoute: false,
    routeError: '',
    createFlow: {
      open: false,
      step: 1,
      mode: 'offer',
      intent: '',
      item: '',
      offerType: '20% OFF',
      duration: '7 days',
      platform: 'Instagram Post',
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
  };

  function asString(value, fallback = '') {
    const normalized = String(value || '').trim();
    return normalized || fallback;
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
        status: asString(query.get('status')),
        tab: asString(query.get('tab')),
      },
    };
  }

  function setUrl(route, params = {}) {
    const query = new URLSearchParams(window.location.search);
    query.set('page', route);
    if (params.campaignId) query.set('campaignId', params.campaignId); else query.delete('campaignId');
    if (params.status) query.set('status', params.status); else query.delete('status');
    if (params.tab) query.set('tab', params.tab); else query.delete('tab');
    history.replaceState(null, '', `?${query.toString()}`);
  }

  function navigate(route, params = {}) {
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
      button.classList.toggle('active', button.dataset.route === state.route || (state.route === 'campaign-detail' && button.dataset.route === 'campaigns'));
    });
  }

  function renderProfile() {
    const profile = state.profile || {};
    const name = profile.restaurantName || 'Your Restaurant';
    const location = profile.restaurantLocation || 'Primary location';
    refs.businessName.textContent = name;
    refs.businessLocation.innerHTML = `<span class="pp-status-dot live"></span> ${escapeHtml(location)}`;
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

  function renderSmartActionCard(action) {
    return `
      <article class="pp-card pp-smart-action-card" tabindex="0" aria-label="${escapeHtml(action.title)}">
        <div class="pp-smart-action-top">
          <span class="pp-smart-action-icon" aria-hidden="true">${escapeHtml(action.icon)}</span>
          <span class="pp-card-chip">${escapeHtml(action.confidenceLabel)}</span>
        </div>
        <h3>${escapeHtml(action.title)}</h3>
        <p>${escapeHtml(action.reason)}</p>
        <button class="pp-primary-btn pp-inline-btn" type="button" data-action='${escapeHtml(JSON.stringify(action.action))}'>${escapeHtml(action.ctaLabel)}</button>
      </article>
    `;
  }

  function renderCampaignCard(campaign) {
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
        <div class="pp-inline-actions">
          <button type="button" class="pp-primary-btn pp-inline-btn" data-view-campaign="${escapeHtml(campaign.id)}">View</button>
          <button type="button" class="pp-secondary-btn pp-inline-btn" data-pause-campaign="${escapeHtml(campaign.id)}">Pause</button>
          <button type="button" class="pp-secondary-btn pp-inline-btn" data-duplicate-campaign="${escapeHtml(campaign.id)}">Duplicate</button>
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

  function handleAction(action) {
    if (!action) return;
    const targetRoute = asString(action.targetRoute, 'home');
    if (targetRoute === 'create') {
      openCreateFlow({ mode: action.metadata?.mode || 'offer', intent: action.intent || '' });
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

  async function renderHomeRoute() {
    state.growthHub = await dataAdapter.getGrowthHubData({ storeId: state.storeId });

    refs.routeMount.innerHTML = `
      ${createSectionHeader('Home / Growth Hub', 'Today\'s Growth Hub', 'What should you do today? Start with Smart Actions.', '<button class="pp-primary-btn" type="button" data-open-create>Start Creating</button>')}

      <section class="pp-grid pp-grid-4">
        ${state.growthHub.pulse.map((item) => `
          <article class="pp-card pp-kpi-card pp-store-pulse-card">
            <span class="pp-kpi-label">${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
            <p>${escapeHtml(item.note)}</p>
          </article>
        `).join('')}
      </section>

      <section class="pp-page-section">
        <div class="pp-card-head">
          <div>
            <p class="pp-card-kicker">Primary Driver</p>
            <h3>Smart Actions</h3>
          </div>
        </div>
        <div class="pp-grid pp-grid-3">
          ${state.growthHub.smartActions.map(renderSmartActionCard).join('')}
        </div>
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

      <section class="pp-grid pp-grid-2">
        <article class="pp-card">
          <div class="pp-card-head"><h3>Live Campaigns</h3></div>
          <div class="pp-card-stack">
            ${state.growthHub.liveCampaigns.length
              ? state.growthHub.liveCampaigns.map(renderCampaignCard).join('')
              : emptyState('No live campaigns yet', 'Create one campaign and we will keep guiding your next best actions.', 'Create Campaign', { targetRoute: 'create', intent: 'first_campaign', metadata: { mode: 'offer' } })}
          </div>
        </article>

        <article class="pp-card">
          <div class="pp-card-head"><h3>Learning Feed</h3></div>
          <div class="pp-card-stack">
            ${state.growthHub.learningFeed.map((insight) => `
              <div class="pp-insight-card">
                <strong>${escapeHtml(insight.title)}</strong>
                <p>${escapeHtml(insight.detail)}</p>
              </div>
            `).join('')}
          </div>
        </article>
      </section>
    `;

    refs.routeMount.querySelector('[data-open-create]')?.addEventListener('click', () => openCreateFlow({ mode: 'offer' }));
    bindActionButtons();
    bindCampaignCardButtons();
  }

  async function renderCampaignsRoute() {
    const status = asString(state.routeParams.status, state.campaigns.status || 'active').toLowerCase();
    state.campaigns = await dataAdapter.getCampaignList({ storeId: state.storeId, status: status === 'drafts' ? 'draft' : status });

    const totals = state.campaigns.totals;
    refs.routeMount.innerHTML = `
      ${createSectionHeader('Campaigns', 'Campaigns', 'Track all campaigns and launch faster iterations.', '<button class="pp-primary-btn" type="button" data-open-create>Create New Campaign</button>')}

      <section class="pp-tab-row">
        ${CAMPAIGN_STATUSES.map((tab) => {
          const key = tab === 'drafts' ? 'drafts' : tab;
          const total = totals[tab === 'drafts' ? 'drafts' : tab] || 0;
          const active = (tab === 'drafts' ? 'draft' : tab) === state.campaigns.status;
          return `<button class="pp-tab-btn${active ? ' active' : ''}" type="button" data-campaign-status="${tab}">${tab} <span>${total}</span></button>`;
        }).join('')}
      </section>

      <section class="pp-grid pp-grid-2">
        ${state.campaigns.items.length
          ? state.campaigns.items.map(renderCampaignCard).join('')
          : emptyState('No campaigns in this status', 'Create a campaign to start building repeat demand.', 'Create New Campaign', { targetRoute: 'create', intent: 'create_campaign', metadata: { mode: 'offer' } })}
      </section>
    `;

    refs.routeMount.querySelector('[data-open-create]')?.addEventListener('click', () => openCreateFlow({ mode: 'offer' }));
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
              <button type="button" class="pp-primary-btn pp-inline-btn" data-action='${escapeHtml(JSON.stringify({ targetRoute: 'create', intent: 'improve_campaign', metadata: { mode: 'reel' } }))}'>Improve Campaign</button>
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
                <button class="pp-secondary-btn pp-inline-btn" type="button">Regenerate</button>
                <button class="pp-secondary-btn pp-inline-btn" type="button">Edit</button>
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
      ${createSectionHeader('Campaigns / Detail', detail.title, 'Understand performance and take the next best action.', '<button class="pp-secondary-btn" type="button" data-route="campaigns">Back to Campaigns</button>')}
      <section class="pp-tab-row">${tabButtons}</section>
      ${tabBody}
      <section class="pp-inline-actions pp-route-actions-row">
        <button type="button" class="pp-primary-btn pp-inline-btn" data-action='${escapeHtml(JSON.stringify(detail.actions[0]))}'>Run Again</button>
        <button type="button" class="pp-secondary-btn pp-inline-btn" data-action='${escapeHtml(JSON.stringify(detail.actions[1]))}'>Improve Campaign</button>
        <button type="button" class="pp-secondary-btn pp-inline-btn" data-action='${escapeHtml(JSON.stringify(detail.actions[2]))}'>Create Variant</button>
      </section>
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
  }

  async function renderContentStudioRoute() {
    const tab = asString(state.routeParams.tab, state.contentStudio.tab || 'posts').toLowerCase();
    state.contentStudio = await dataAdapter.getContentStudioAssets(tab);

    refs.routeMount.innerHTML = `
      ${createSectionHeader('Content Studio', 'Content Studio', 'Reuse and optimize generated assets quickly.', '<button class="pp-primary-btn" type="button" data-open-create>Create Asset</button>')}
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
                <button class="pp-secondary-btn pp-inline-btn" type="button">View</button>
                <button class="pp-secondary-btn pp-inline-btn" type="button">Reuse</button>
                <button class="pp-secondary-btn pp-inline-btn" type="button">Edit</button>
                <button class="pp-secondary-btn pp-inline-btn" type="button">Duplicate</button>
              </div>
            </article>
          `).join('')
          : emptyState('No assets yet', 'Generate your first asset using guided creation.', 'Create Asset', { targetRoute: 'create', intent: 'create_asset', metadata: { mode: 'post' } })}
      </section>
    `;

    refs.routeMount.querySelector('[data-open-create]')?.addEventListener('click', () => openCreateFlow({ mode: 'post' }));
    refs.routeMount.querySelectorAll('[data-content-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        navigate('content-studio', { tab: button.dataset.contentTab });
      });
    });
    bindActionButtons();
  }

  async function renderCreateRoute() {
    refs.routeMount.innerHTML = `
      ${createSectionHeader('Create', 'Create', 'Use the guided flow to generate offer, post, or reel assets.', '<button class="pp-primary-btn" type="button" data-open-create>Start Guided Create</button>')}
      <section class="pp-card pp-create-route-cta">
        <h3>3-Step Guided Flow</h3>
        <p>Intent → Smart Input → Preview + Publish. The system handles recommendations and generation readiness.</p>
        <div class="pp-inline-actions">
          <button type="button" class="pp-primary-btn pp-inline-btn" data-open-create-mode="offer">Create Offer</button>
          <button type="button" class="pp-secondary-btn pp-inline-btn" data-open-create-mode="post">Create Post</button>
          <button type="button" class="pp-secondary-btn pp-inline-btn" data-open-create-mode="reel">Create Reel</button>
        </div>
      </section>
    `;

    refs.routeMount.querySelector('[data-open-create]')?.addEventListener('click', () => openCreateFlow({ mode: 'offer' }));
    refs.routeMount.querySelectorAll('[data-open-create-mode]').forEach((button) => {
      button.addEventListener('click', () => openCreateFlow({ mode: button.dataset.openCreateMode }));
    });
  }

  async function renderAnalyticsRoute() {
    state.analytics = await dataAdapter.getAnalyticsStoryData({ storeId: state.storeId });
    refs.routeMount.innerHTML = `
      ${createSectionHeader('Analytics', 'Analytics', 'Simple performance stories that lead to action.')}
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
        <div class="pp-grid pp-grid-3">${state.analytics.nextActions.map(renderSmartActionCard).join('')}</div>
      </section>
    `;

    bindActionButtons();
  }

  async function renderSettingsRoute() {
    const profile = state.profile || {};
    refs.routeMount.innerHTML = `
      ${createSectionHeader('Settings', 'Settings', 'Manage profile, brand, channels, and notification preferences.')}
      <section class="pp-grid pp-grid-2">
        <article class="pp-card">
          <div class="pp-card-head"><h3>Restaurant Profile</h3></div>
          <form id="settingsProfileForm" class="pp-form-grid" novalidate>
            <label>Restaurant Name<input id="settingsRestaurantName" type="text" value="${escapeHtml(profile.restaurantName || '')}" /></label>
            <label>Location<input id="settingsRestaurantLocation" type="text" value="${escapeHtml(profile.restaurantLocation || '')}" /></label>
            <label>Category<input id="settingsCategory" type="text" value="${escapeHtml(profile.category || '')}" /></label>
            <label>Business Type<input id="settingsBusinessType" type="text" value="${escapeHtml(profile.businessType || '')}" /></label>
            <label>Cuisine Type<input id="settingsCuisineType" type="text" value="${escapeHtml(profile.cuisineType || '')}" /></label>
            <label>Business Hours<input id="settingsBusinessHours" type="text" value="${escapeHtml(profile.businessHours || '')}" /></label>
            <label>Brand Tone<input id="settingsBrandTone" type="text" value="${escapeHtml(profile.brandTone || '')}" /></label>
            <div class="pp-inline-actions">
              <button id="settingsSaveButton" type="submit" class="pp-primary-btn pp-inline-btn">Save Profile</button>
              <span id="settingsSaveStatus" class="pp-muted-copy"></span>
            </div>
          </form>
        </article>

        <article class="pp-card">
          <div class="pp-card-head"><h3>Other Settings</h3></div>
          <div class="pp-card-stack">
            <div class="pp-insight-card"><strong>Brand Preferences</strong><p>Typography, color, and tone presets (expansion-ready).</p></div>
            <div class="pp-insight-card"><strong>Connected Channels</strong><p>Social publishing destinations and account health.</p></div>
            <div class="pp-insight-card"><strong>Notification Preferences</strong><p>Control reminders and growth alerts by channel.</p></div>
          </div>
        </article>
      </section>
    `;

    refs.routeMount.querySelector('#settingsProfileForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const saveButton = document.getElementById('settingsSaveButton');
      const saveStatus = document.getElementById('settingsSaveStatus');
      const payload = {
        storeId: state.storeId,
        restaurantName: asString(document.getElementById('settingsRestaurantName')?.value),
        restaurantLocation: asString(document.getElementById('settingsRestaurantLocation')?.value),
        category: asString(document.getElementById('settingsCategory')?.value),
        businessType: asString(document.getElementById('settingsBusinessType')?.value),
        cuisineType: asString(document.getElementById('settingsCuisineType')?.value),
        businessHours: asString(document.getElementById('settingsBusinessHours')?.value),
        brandTone: asString(document.getElementById('settingsBrandTone')?.value),
      };

      saveButton.disabled = true;
      saveStatus.textContent = 'Saving...';
      try {
        // Integration point: this already maps to backend profile endpoint.
        state.profile = await dataAdapter.saveRestaurantProfile(payload);
        renderProfile();
        saveStatus.textContent = 'Saved successfully.';
      } catch (_error) {
        saveStatus.textContent = 'Save failed. Please try again.';
      } finally {
        saveButton.disabled = false;
      }
    });
  }

  function bindActionButtons() {
    refs.routeMount.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = parseActionPayload(button.dataset.action);
        handleAction(action);
      });
    });
  }

  function bindCampaignCardButtons() {
    refs.routeMount.querySelectorAll('[data-view-campaign]').forEach((button) => {
      button.addEventListener('click', () => navigate('campaign-detail', { campaignId: button.dataset.viewCampaign }));
    });

    refs.routeMount.querySelectorAll('[data-pause-campaign]').forEach((button) => {
      button.addEventListener('click', () => {
        const card = button.closest('.pp-campaign-card');
        if (!card) return;
        const badge = card.querySelector('.pp-status-badge');
        if (badge) {
          badge.className = 'pp-status-badge pending';
          badge.textContent = 'paused';
        }
      });
    });

    refs.routeMount.querySelectorAll('[data-duplicate-campaign]').forEach((button) => {
      button.addEventListener('click', () => {
        openCreateFlow({ mode: 'offer', sourceCampaignId: button.dataset.duplicateCampaign });
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

  function resetCreateFlow(partial = {}) {
    state.createFlow = {
      ...state.createFlow,
      open: true,
      step: 1,
      mode: partial.mode || 'offer',
      intent: partial.intent || '',
      item: '',
      offerType: '20% OFF',
      duration: '7 days',
      platform: partial.mode === 'reel' ? 'Instagram Reel' : 'Instagram Post',
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
    return `
      <section class="pp-create3-step-body">
        <h4>What do you want to do today?</h4>
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
    state.createFlow.userIntentTags = computedIntentTags(state.createFlow.userIntentInput);
    state.createFlow.parsedIntentHints = parseIntentHints(state.createFlow.userIntentInput, state.createFlow.userIntentTags);
    return `
      <section class="pp-create3-step-body">
        <h4>Smart Input</h4>
        <div class="pp-create3-form-grid">
          <label>Item
            <input id="createItemInput" type="text" value="${escapeHtml(state.createFlow.item)}" placeholder="Example: Signature Bowl + Drink" />
          </label>
          <label>Offer
            <select id="createOfferTypeInput" class="pp-select">
              ${['10% OFF', '20% OFF', 'Buy 1 Get 1', 'Combo Deal', 'Limited Time'].map((value) => `<option ${state.createFlow.offerType === value ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}
            </select>
          </label>
          <label>Duration
            <select id="createDurationInput" class="pp-select">
              ${['3 days', '7 days', '14 days', '30 days'].map((value) => `<option ${state.createFlow.duration === value ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}
            </select>
          </label>
          <label>Platform
            <select id="createPlatformInput" class="pp-select">
              ${['Instagram Post', 'Instagram Story', 'Instagram Reel', 'Flyer'].map((value) => `<option ${state.createFlow.platform === value ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}
            </select>
          </label>
        </div>

        <p class="pp-create-offer-field-label">Style keywords</p>
        <div class="pp-create-offer-moods">
          ${['Bold', 'Premium', 'Fun', 'Minimal', 'Image Focused', 'Text Focused'].map(styleKeywordChip).join('')}
        </div>

        <div class="pp-create-offer-upload-panel">
          <p class="pp-create-offer-field-label">Optional image upload</p>
          <p class="pp-muted-copy">Add an image for better preview quality, or let AI decide automatically.</p>
          <div class="pp-inline-actions">
            <label class="pp-secondary-btn pp-inline-btn" for="createAssetInput">Upload Image</label>
            <input id="createAssetInput" type="file" accept="image/*" class="hidden" />
            <label class="pp-check-inline">
              <input id="createAiDecideInput" type="checkbox" ${state.createFlow.aiDecide ? 'checked' : ''} />
              Let AI decide
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

    return `
      <section class="pp-create3-step-body">
        <h4>Preview + Edit</h4>
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
          <p class="pp-card-kicker">Quick Improve Suggestions</p>
          <div class="pp-create-offer-moods">
            <button type="button" class="pp-choice-chip" data-quick-improve="bolder">Make it bolder</button>
            <button type="button" class="pp-choice-chip" data-quick-improve="cleaner">Make it cleaner</button>
            <button type="button" class="pp-choice-chip" data-quick-improve="highlight_food">Highlight food</button>
            <button type="button" class="pp-choice-chip" data-quick-improve="premium">Make it premium</button>
            <button type="button" class="pp-choice-chip" data-quick-improve="fun">Make it more fun</button>
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
              <button type="button" class="pp-secondary-btn pp-inline-btn" data-save-draft>Create Draft</button>
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
              <h4>QR Code</h4>
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
              <button type="button" class="pp-secondary-btn pp-inline-btn" data-save-draft>Save Draft</button>
              <button type="button" class="pp-primary-btn pp-inline-btn" data-go-live ${state.createFlow.reviewConfirmed ? '' : 'disabled'}>Create Live Campaign</button>
            </div>
          </article>
        </div>
      </section>
    `;
  }

  function collectDraftInput() {
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
      uploadedAssetIds: [],
      businessContext: {
        restaurantName: state.profile?.restaurantName || '',
        cuisineType: state.profile?.cuisineType || '',
        businessType: state.profile?.businessType || '',
        location: state.profile?.restaurantLocation || '',
      },
      platform: state.createFlow.platform,
      duration: state.createFlow.duration,
      offerType: state.createFlow.offerType,
      userIntent: {
        rawText: state.createFlow.userIntentInput,
        tags: state.createFlow.userIntentTags,
        parsed: state.createFlow.parsedIntentHints,
      },
      performanceSignals: {},
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
      businessContext: {
        restaurantName: state.profile?.restaurantName || '',
        cuisineType: state.profile?.cuisineType || '',
        businessType: state.profile?.businessType || '',
        location: state.profile?.restaurantLocation || '',
      },
    };

    const response = await dataAdapter.getCreateSuggestions(payload);
    state.createFlow.suggestions = response.suggestions || [];
    state.createFlow.soundtrackSuggestions = response.soundtrackSuggestions || [];
    state.createFlow.selectedSuggestionId = state.createFlow.suggestions[0]?.id || '';
    state.createFlow.selectedSoundtrackId = state.createFlow.soundtrackSuggestions[0]?.id || '';
    state.createFlow.lastSuggestionSignature = signature;
    state.createFlow.generationStatus = response.generationStatus?.message || '';
    const first = selectedSuggestion();
    if (first) applySuggestionToEditor(first);
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
      refs.createBody.querySelector('#createItemInput')?.addEventListener('input', (event) => {
        state.createFlow.item = asString(event.target.value);
        invalidateCreateOutputs();
        refs.createNext.disabled = !state.createFlow.item;
      });
      refs.createBody.querySelector('#createOfferTypeInput')?.addEventListener('change', (event) => {
        state.createFlow.offerType = asString(event.target.value, '20% OFF');
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
        setCreateNotice('Draft saved. You can continue anytime.', 'success');
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
      refs.createBody.querySelector('[data-go-live]')?.addEventListener('click', () => {
        setCreateNotice('Campaign is now live with QR and final poster.', 'success');
        closeCreateFlow();
      });
      refs.createBody.querySelector('#createReviewConfirmInput')?.addEventListener('change', (event) => {
        state.createFlow.reviewConfirmed = Boolean(event.target.checked);
        renderCreateFlow();
      });
      refs.createBody.querySelector('[data-save-draft]')?.addEventListener('click', () => {
        setCreateNotice('Draft saved from review step.', 'success');
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

    if (state.createFlow.step === 2 && !state.createFlow.item) {
      setCreateNotice('Add an item or offer to continue.', 'warning');
      return;
    }

    if (state.createFlow.step === 2) {
      dataAdapter.trackCreateIntentInputUsed?.({
        length: state.createFlow.userIntentInput.length,
        selectedChips: state.createFlow.userIntentTags,
        parsedTags: state.createFlow.parsedIntentHints,
      });
      setCreateNotice('Generating your campaign...', 'info');
      await ensureCreateSuggestions(true);
      setCreateNotice('Edit your campaign and regenerate until satisfied.', 'success');
    }

    if (state.createFlow.step === 3) {
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

    refs.primaryCreateButton.addEventListener('click', () => openCreateFlow({ mode: 'offer' }));

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
  }

  async function refreshRoute() {
    state.loadingRoute = true;
    state.routeError = '';
    renderSidebarActive();
    renderLoadingShell();

    try {
      if (state.route === 'home') await renderHomeRoute();
      else if (state.route === 'campaigns') await renderCampaignsRoute();
      else if (state.route === 'campaign-detail') await renderCampaignDetailRoute();
      else if (state.route === 'content-studio') await renderContentStudioRoute();
      else if (state.route === 'create') await renderCreateRoute();
      else if (state.route === 'analytics') await renderAnalyticsRoute();
      else if (state.route === 'settings') await renderSettingsRoute();
      else await renderHomeRoute();
    } catch (error) {
      setRouteError(error?.message || 'Unable to render this section.');
    } finally {
      state.loadingRoute = false;
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
  }

  boot().catch((error) => {
    setRouteError(error?.message || 'Unable to start the app.');
  });
})(window);
