const DEFAULT_STORE_ID = 'taco123';
const CTA_PLACEHOLDER_ROUTE = 'dashboard.html?page=content-studio&intent=create-offer&source=offers';
let createOfferFlowModal = null;

const state = {
  storeId: DEFAULT_STORE_ID,
  profile: null,
  offers: [],
  liveOffers: [],
  summary: {
    liveOffersCount: 0,
    totalRedemptions: 0,
    totalRepeatCustomers: 0,
    totalRevenueInfluenced: 0,
  },
  suggestions: [],
};

const refs = {
  businessName: document.getElementById('businessName'),
  businessLocation: document.getElementById('businessLocation'),
  sidebarLiveBadge: document.getElementById('sidebarLiveBadge'),
  offersLiveBadge: document.getElementById('offersLiveBadge'),
  statActivePromotions: document.getElementById('statActivePromotions'),
  statRedemptions: document.getElementById('statRedemptions'),
  statRepeatCustomers: document.getElementById('statRepeatCustomers'),
  statRevenue: document.getElementById('statRevenue'),
  currentOffersList: document.getElementById('currentOffersList'),
  offersSuggestions: document.getElementById('offersSuggestions'),
  activePromotionsCard: document.getElementById('activePromotionsCard'),
  createNewOfferCta: document.getElementById('createNewOfferCta'),
  activeOffersModal: document.getElementById('activeOffersModal'),
  closeActiveOffersModal: document.getElementById('closeActiveOffersModal'),
  activeOffersModalRows: document.getElementById('activeOffersModalRows'),
};

function apiUrl(pathname) {
  if (window.location.protocol === 'file:') {
    return 'http://localhost:3000' + pathname;
  }
  return pathname;
}

function getStoreId() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get('store') || DEFAULT_STORE_ID).trim() || DEFAULT_STORE_ID;
}

async function fetchJson(pathname) {
  const response = await fetch(apiUrl(pathname));
  if (!response.ok) {
    throw new Error('Request failed: ' + response.status);
  }
  return response.json();
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCount(value) {
  return asNumber(value).toLocaleString('en-US');
}

function formatCurrency(value) {
  const amount = asNumber(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatEndDate(value) {
  if (!value) return 'No end date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No end date';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatAgeDays(value) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  const diffMs = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function statusDisplay(raw) {
  const normalized = String(raw.statusDisplay || raw.status || '').toLowerCase();
  if (normalized === 'active') return 'live';
  if (normalized === 'live') return 'live';
  if (normalized === 'scheduled') return 'scheduled';
  if (normalized === 'paused') return 'paused';
  if (normalized === 'archived') return 'archived';
  if (normalized === 'expired') return 'expired';
  return 'draft';
}

function findPosterFallback(title = '') {
  const lower = String(title).toLowerCase();
  if (lower.includes('pizza')) return { label: 'Pizza', color: 'pizza' };
  if (lower.includes('taco') || lower.includes('burrito')) return { label: 'Taco', color: 'taco' };
  if (lower.includes('burger')) return { label: 'Burger', color: 'burger' };
  if (lower.includes('drink') || lower.includes('coffee') || lower.includes('tea')) return { label: 'Drink', color: 'drink' };
  if (lower.includes('dessert') || lower.includes('cake') || lower.includes('sweet')) return { label: 'Dessert', color: 'dessert' };
  return { label: 'Offer', color: 'default' };
}

function normalizeOffer(raw) {
  const display = statusDisplay(raw);
  const redemptions = asNumber(raw.redemptionCount || raw.claimCount);
  const repeatCustomers = asNumber(raw.repeatCustomerCount || raw.repeatCustomers);
  const revenueInfluenced = asNumber(raw.estimatedNetImpact ?? raw.estimatedRevenue);
  const fallback = findPosterFallback(raw.name || raw.offerType || 'Offer');

  return {
    id: raw.id || '',
    title: raw.name || 'Untitled Offer',
    status: raw.status || 'draft',
    statusDisplay: display,
    redemptions,
    repeatCustomers,
    revenueInfluenced,
    endDate: raw.endDate || raw.endAt || null,
    posterUrl: raw.posterAssetUrl || '',
    fallbackLabel: fallback.label,
    fallbackColor: fallback.color,
    conversionRate: asNumber(raw.conversionRate),
    pendingRedemptionCount: asNumber(raw.pendingRedemptionCount),
    createdAt: raw.createdAt || null,
    offerType: raw.offerType || raw.type || 'Offer',
    restaurant: raw.restaurant || '',
    storeId: raw.storeId || raw.store || state.storeId,
    analyticsSummary: {
      redeemedRate: asNumber(raw.redeemedRate),
      qrScanCount: asNumber(raw.qrScanCount),
      claimCount: asNumber(raw.claimCount),
      estimatedNetImpact: revenueInfluenced,
    },
  };
}

function buildSummary(liveOffers) {
  return liveOffers.reduce((acc, offer) => {
    acc.liveOffersCount += 1;
    acc.totalRedemptions += offer.redemptions;
    acc.totalRepeatCustomers += offer.repeatCustomers;
    acc.totalRevenueInfluenced += offer.revenueInfluenced;
    return acc;
  }, {
    liveOffersCount: 0,
    totalRedemptions: 0,
    totalRepeatCustomers: 0,
    totalRevenueInfluenced: 0,
  });
}

function clampScore(value) {
  return Math.max(0.1, Math.min(0.99, Number(value.toFixed(2))));
}

function buildSuggestions({ offers, liveOffers, summary }) {
  if (summary.liveOffersCount === 0) {
    return [
      {
        id: 'start-lunch-offer',
        type: 'start_lunch_offer',
        title: 'Start a Lunch Combo Offer',
        subtitle: 'Quick Win to Get First Redemptions',
        ctaLabel: 'Get Started',
        score: 0.96,
        isVisible: true,
        icon: '☀',
        payload: { target: 'create-offer', strategy: 'first-launch-lunch-combo' },
        sourceMetrics: { reason: 'no_live_offers' },
      },
      {
        id: 'start-weekday-discount',
        type: 'start_weekday_discount',
        title: 'Launch a Weekday Discount',
        subtitle: 'Bring in Midweek Walk-ins',
        ctaLabel: 'Get Started',
        score: 0.92,
        isVisible: true,
        icon: '✦',
        payload: { target: 'create-offer', strategy: 'first-launch-weekday-discount' },
        sourceMetrics: { reason: 'no_live_offers' },
      },
      {
        id: 'start-win-back',
        type: 'start_win_back',
        title: 'Create a Come-Back Offer',
        subtitle: 'Re-engage Past Guests This Week',
        ctaLabel: 'Get Started',
        score: 0.89,
        isVisible: true,
        icon: '↻',
        payload: { target: 'create-offer', strategy: 'first-launch-win-back' },
        sourceMetrics: { reason: 'no_live_offers' },
      },
    ];
  }

  const offerAges = liveOffers.map((offer) => formatAgeDays(offer.createdAt));
  const averageAge = offerAges.length
    ? offerAges.reduce((sum, value) => sum + value, 0) / offerAges.length
    : 0;
  const avgRedemptions = summary.liveOffersCount
    ? summary.totalRedemptions / summary.liveOffersCount
    : 0;
  const repeatRatio = summary.totalRedemptions
    ? summary.totalRepeatCustomers / summary.totalRedemptions
    : 0;
  const pendingTotal = offers.reduce((sum, offer) => sum + asNumber(offer.pendingRedemptionCount), 0);
  const lunchSignals = offers.filter((offer) => /lunch|combo|weekday/i.test(offer.title)).length;

  const boostLunchScore = clampScore(
    0.45 +
    (avgRedemptions < 55 ? 0.22 : 0.08) +
    (lunchSignals > 0 ? 0.07 : 0.15)
  );

  const bringBackScore = clampScore(
    0.4 +
    (repeatRatio < 0.3 ? 0.24 : 0.1) +
    (pendingTotal > 0 ? 0.14 : 0.05)
  );

  const launchSpecialScore = clampScore(
    0.42 +
    (averageAge > 14 ? 0.2 : 0.08) +
    (summary.liveOffersCount <= 1 ? 0.18 : 0.09)
  );

  return [
    {
      id: 'boost-lunch-deals',
      type: 'boost_lunch',
      title: 'Boost Lunch Deals',
      subtitle: 'Best Time to Promote',
      ctaLabel: 'Get Started',
      score: boostLunchScore,
      isVisible: true,
      icon: '☀',
      payload: { target: 'create-offer', strategy: 'lunch-window' },
      sourceMetrics: { avgRedemptions, lunchSignals },
    },
    {
      id: 'bring-back-past-customers',
      type: 'bring_back',
      title: 'Bring Back Past Customers',
      subtitle: 'Win Back Strategy',
      ctaLabel: 'Get Started',
      score: bringBackScore,
      isVisible: true,
      icon: '↻',
      payload: { target: 'create-offer', strategy: 'win-back' },
      sourceMetrics: { repeatRatio, pendingTotal },
    },
    {
      id: 'launch-a-new-special',
      type: 'launch_special',
      title: 'Launch a New Special',
      subtitle: 'Fresh Menu Idea',
      ctaLabel: 'Get Started',
      score: launchSpecialScore,
      isVisible: true,
      icon: '✦',
      payload: { target: 'create-offer', strategy: 'new-special' },
      sourceMetrics: { averageAge, liveOffers: summary.liveOffersCount },
    },
  ]
    .filter((item) => item.isVisible)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function createOfferThumb(offer) {
  if (offer.posterUrl) {
    return `
      <div class="pp-offers-v2-thumb">
        <img src="${offer.posterUrl}" alt="${offer.title} poster" loading="lazy" />
      </div>
    `;
  }

  return `
    <div class="pp-offers-v2-thumb pp-offers-v2-thumb-fallback ${offer.fallbackColor}">
      <span>${offer.fallbackLabel}</span>
    </div>
  `;
}

function renderHeaderStats() {
  refs.statActivePromotions.textContent = `${formatCount(state.summary.liveOffersCount)} Live`;
  refs.statRedemptions.textContent = formatCount(state.summary.totalRedemptions);
  refs.statRepeatCustomers.textContent = formatCount(state.summary.totalRepeatCustomers);
  refs.statRevenue.textContent = formatCurrency(state.summary.totalRevenueInfluenced);

  const liveLabel = `${formatCount(state.summary.liveOffersCount)} Live`;
  refs.offersLiveBadge.textContent = liveLabel;
  refs.sidebarLiveBadge.textContent = liveLabel;
}

function renderCurrentOffers() {
  if (!state.liveOffers.length) {
    refs.currentOffersList.innerHTML = `
      <div class="pp-offers-v2-empty-state">
        <h4>No live offers right now</h4>
        <p>Start your first campaign now. We will guide you with proven ideas to get redemptions quickly.</p>
        <p class="pp-offers-v2-empty-ideas">Idea: Lunch Combo · Weekday 20% OFF · Buy 1 Get 1</p>
        <button class="pp-primary-btn" type="button" data-create-offer> Create New Offer </button>
      </div>
    `;
    refs.currentOffersList.querySelector('[data-create-offer]')?.addEventListener('click', routeToCreateOffer);
    return;
  }

  refs.currentOffersList.innerHTML = state.liveOffers.map((offer) => `
    <button class="pp-offers-v2-offer-row" type="button" data-offer-id="${offer.id}">
      ${createOfferThumb(offer)}
      <div class="pp-offers-v2-offer-copy">
        <strong>${offer.title}</strong>
        <p>${formatCount(offer.redemptions)} Redemptions · Ends ${formatEndDate(offer.endDate)}</p>
      </div>
      <span class="pp-status-badge ready">Live</span>
    </button>
  `).join('');

  refs.currentOffersList.querySelectorAll('.pp-offers-v2-offer-row').forEach((row) => {
    row.addEventListener('click', () => {
      const offerId = row.dataset.offerId || '';
      window.location.href = `dashboard.html?page=analytics&offerId=${encodeURIComponent(offerId)}`;
    });
  });
}

function renderSuggestions() {
  if (!state.suggestions.length) {
    refs.offersSuggestions.innerHTML = '<div class="pp-empty-inline">No suggestions yet. We need a little more offer activity first.</div>';
    return;
  }

  refs.offersSuggestions.innerHTML = state.suggestions.map((suggestion) => `
    <article class="pp-offers-v2-suggestion-row">
      <div class="pp-offers-v2-suggestion-icon" aria-hidden="true">${suggestion.icon}</div>
      <div class="pp-offers-v2-suggestion-copy">
        <strong>${suggestion.title}</strong>
        <p>${suggestion.subtitle}</p>
      </div>
      <button class="pp-primary-btn pp-offers-v2-suggestion-btn" type="button" data-suggestion-type="${suggestion.type}">${suggestion.ctaLabel}</button>
    </article>
  `).join('');

  refs.offersSuggestions.querySelectorAll('[data-suggestion-type]').forEach((button) => {
    button.addEventListener('click', () => {
      const type = button.dataset.suggestionType || 'create';
      routeToCreateOffer(type);
    });
  });
}

function renderActiveOffersModalRows() {
  if (!state.liveOffers.length) {
    refs.activeOffersModalRows.innerHTML = '<div class="pp-empty-inline">No live promotions available right now.</div>';
    return;
  }

  refs.activeOffersModalRows.innerHTML = state.liveOffers.map((offer) => `
    <article class="pp-offers-v2-modal-row">
      ${createOfferThumb(offer)}
      <div class="pp-offers-v2-modal-main">
        <div class="pp-offers-v2-modal-title-row">
          <strong>${offer.title}</strong>
          <span class="pp-status-badge ready">Live</span>
        </div>
        <p>${formatCount(offer.redemptions)} Redemptions · ${formatCurrency(offer.revenueInfluenced)} Revenue Influenced · ${formatCount(offer.repeatCustomers)} Repeat Customers · Ends ${formatEndDate(offer.endDate)}</p>
      </div>
    </article>
  `).join('');
}

function mapSuggestionTypeToIntent(value = '') {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('win_back') || normalized.includes('bring_back')) return 'bring_back';
  if (normalized.includes('discount') || normalized.includes('timed')) return 'discount';
  if (normalized.includes('new_item') || normalized.includes('special')) return 'new_item';
  return 'combo';
}

function openActiveOffersModal() {
  renderActiveOffersModalRows();
  refs.activeOffersModal.classList.remove('hidden');
  refs.activeOffersModal.setAttribute('aria-hidden', 'false');
}

function closeActiveOffersModal() {
  refs.activeOffersModal.classList.add('hidden');
  refs.activeOffersModal.setAttribute('aria-hidden', 'true');
}

function routeToCreateOffer(suggestionType = '') {
  if (createOfferFlowModal) {
    createOfferFlowModal.open({
      promotionIntent: suggestionType ? mapSuggestionTypeToIntent(suggestionType) : '',
    });
    return;
  }

  const url = new URL(CTA_PLACEHOLDER_ROUTE, window.location.origin);
  if (suggestionType) url.searchParams.set('suggestion', suggestionType);
  window.location.href = url.pathname + url.search;
}

function renderProfile() {
  const restaurantName = state.profile?.restaurantName || state.liveOffers[0]?.restaurant || 'Spice Taco House';
  const restaurantLocation = state.profile?.restaurantLocation || 'Primary location';

  refs.businessName.textContent = restaurantName;
  refs.businessLocation.innerHTML = `<span class="pp-status-dot live"></span> ${restaurantLocation}`;
}

function bindEvents() {
  refs.createNewOfferCta.addEventListener('click', () => routeToCreateOffer());
  refs.activePromotionsCard.addEventListener('click', openActiveOffersModal);
  refs.closeActiveOffersModal.addEventListener('click', closeActiveOffersModal);
  refs.activeOffersModal.addEventListener('click', (event) => {
    if (event.target === refs.activeOffersModal) {
      closeActiveOffersModal();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && refs.activeOffersModal.getAttribute('aria-hidden') === 'false') {
      closeActiveOffersModal();
    }
  });
}

function mountCreateOfferFlow() {
  if (!window.PostPlateCreateOfferFlow || createOfferFlowModal) return;
  const CreateOfferFlowModal = window.PostPlateCreateOfferFlow.CreateOfferFlowModal;
  createOfferFlowModal = new CreateOfferFlowModal({
    apiUrl,
    getContext: () => ({
      storeId: state.storeId,
      profile: state.profile,
      summary: state.summary,
      offers: state.offers,
    }),
  });
}

async function loadProfile() {
  try {
    const response = await fetchJson(`/owner/profile?store=${encodeURIComponent(state.storeId)}`);
    if (response && response.success) {
      state.profile = response.profile || null;
    }
  } catch (_error) {
    state.profile = null;
  }
}

async function loadOffers() {
  const rawOffers = await fetchJson(`/offers/${encodeURIComponent(state.storeId)}`);
  const offers = Array.isArray(rawOffers) ? rawOffers.map(normalizeOffer) : [];
  state.offers = offers;
  state.liveOffers = offers.filter((offer) => offer.statusDisplay === 'live');
  state.summary = buildSummary(state.liveOffers);
  state.suggestions = buildSuggestions({
    offers: state.offers,
    liveOffers: state.liveOffers,
    summary: state.summary,
  });
}

function render() {
  renderProfile();
  renderHeaderStats();
  renderCurrentOffers();
  renderSuggestions();
}

async function boot() {
  state.storeId = getStoreId();
  bindEvents();
  await Promise.all([loadProfile(), loadOffers()]);
  mountCreateOfferFlow();
  render();
}

boot().catch(() => {
  refs.currentOffersList.innerHTML = '<div class="pp-empty-inline">Unable to load offers right now. Please try again.</div>';
  refs.offersSuggestions.innerHTML = '<div class="pp-empty-inline">Suggestions are temporarily unavailable.</div>';
});
