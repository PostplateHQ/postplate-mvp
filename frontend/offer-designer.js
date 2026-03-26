const ITEM_OPTIONS = ['Burger', 'Tacos', 'Pizza', 'Bowl', 'Drinks', 'Dessert', 'Custom'];
const OFFER_OPTIONS = ['10% OFF', '20% OFF', 'Buy 1 Get 1', 'Combo Deal', 'Limited Time', 'Custom Offer'];
const STYLE_OPTIONS = ['Dark & Premium', 'Bright & Fun', 'Minimal Clean', 'Text Heavy', 'Image Focused'];
const REFINEMENT_OPTIONS = [
  'Make it bolder',
  'Make it cleaner',
  'Highlight the offer',
  'Make it more premium',
  'Make it more fun',
];

const state = {
  itemName: 'Burger',
  offerType: '20% OFF',
  offerLabel: '20% OFF Burger Combo',
  visualStyle: 'Minimal Clean',
  textDensity: 'balanced',
  backgroundMode: 'dark',
  fontMood: 'bold',
  restaurantName: 'Spice Taco House',
  restaurantLocation: '',
  logoAsset: '',
  productImageAsset: '',
  qrEnabled: true,
  logoEnabled: true,
  addressEnabled: false,
  refinementChoice: '',
};

const refs = {
  itemChoices: document.getElementById('itemChoices'),
  offerChoices: document.getElementById('offerChoices'),
  styleChoices: document.getElementById('styleChoices'),
  refinementChoices: document.getElementById('refinementChoices'),
  restaurantNameInput: document.getElementById('restaurantNameInput'),
  restaurantLocationInput: document.getElementById('restaurantLocationInput'),
  offerLabelInput: document.getElementById('offerLabelInput'),
  productImageInput: document.getElementById('productImageInput'),
  logoImageInput: document.getElementById('logoImageInput'),
  densityToggle: document.getElementById('densityToggle'),
  backgroundToggle: document.getElementById('backgroundToggle'),
  fontMoodToggle: document.getElementById('fontMoodToggle'),
  logoToggle: document.getElementById('logoToggle'),
  addressToggle: document.getElementById('addressToggle'),
  qrToggle: document.getElementById('qrToggle'),
  previewButton: document.getElementById('previewButton'),
  saveButton: document.getElementById('saveButton'),
  statusLine: document.getElementById('statusLine'),
  previewCard: document.getElementById('previewCard'),
  previewStyleTag: document.getElementById('previewStyleTag'),
  previewHeadline: document.getElementById('previewHeadline'),
  previewSubline: document.getElementById('previewSubline'),
  previewProduct: document.getElementById('previewProduct'),
  previewLogo: document.getElementById('previewLogo'),
  previewRestaurant: document.getElementById('previewRestaurant'),
  previewAddress: document.getElementById('previewAddress'),
  previewQr: document.getElementById('previewQr'),
  engineMeta: document.getElementById('engineMeta'),
};

function chip(label, active, onClick) {
  const button = document.createElement('button');
  button.className = 'od-chip' + (active ? ' active' : '');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function renderChips(container, options, selectedValue, onChoose) {
  container.innerHTML = '';
  options.forEach((value) => {
    container.appendChild(chip(value, value === selectedValue, () => onChoose(value)));
  });
}

function stylePreview() {
  if (state.visualStyle === 'Minimal Clean') {
    refs.previewCard.style.background = 'linear-gradient(165deg, #f8fafc, #e8eef7)';
    refs.previewCard.style.color = '#0f172a';
    refs.previewCard.querySelectorAll('p').forEach((node) => { node.style.color = '#475569'; });
  } else if (state.visualStyle === 'Bright & Fun') {
    refs.previewCard.style.background = 'linear-gradient(165deg, #7c2d12, #ea580c, #f59e0b)';
    refs.previewCard.style.color = '#fff7ed';
    refs.previewCard.querySelectorAll('p').forEach((node) => { node.style.color = '#ffedd5'; });
  } else {
    refs.previewCard.style.background = 'linear-gradient(165deg, #0b1120, #1e293b)';
    refs.previewCard.style.color = '#ffffff';
    refs.previewCard.querySelectorAll('p').forEach((node) => { node.style.color = '#d4d8df'; });
  }

  refs.previewStyleTag.textContent = state.visualStyle;
}

function renderLivePreview() {
  refs.previewHeadline.textContent = state.offerLabel || state.offerType;
  refs.previewSubline.textContent = state.itemName + ' at ' + state.restaurantName;
  refs.previewRestaurant.textContent = state.restaurantName;
  refs.previewAddress.textContent = state.addressEnabled
    ? (state.restaurantLocation || 'Address not added')
    : 'Address hidden';

  refs.previewLogo.style.display = state.logoEnabled ? 'grid' : 'none';
  refs.previewQr.style.display = state.qrEnabled ? 'grid' : 'none';
  refs.previewLogo.textContent = state.logoAsset ? 'Logo ✓' : 'Logo';

  refs.previewProduct.textContent = state.productImageAsset ? '' : 'Product';
  refs.previewProduct.style.backgroundImage = state.productImageAsset
    ? 'url(' + state.productImageAsset + ')'
    : 'none';

  stylePreview();
}

async function refreshEnginePreview() {
  refs.statusLine.textContent = 'Refreshing deterministic engine preview...';

  try {
    const response = await fetch('/offer-designs/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ designBrief: state }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to preview');
    }

    refs.engineMeta.textContent = JSON.stringify({
      selectedPresetId: payload.selectedPresetId,
      warnings: payload.preview.warnings,
      providerMeta: payload.providerMeta,
    }, null, 2);

    refs.statusLine.textContent = 'Engine preview updated (' + payload.selectedPresetId + ').';
  } catch (error) {
    refs.statusLine.textContent = 'Preview failed: ' + error.message;
  }
}

async function saveOfferDesign() {
  refs.statusLine.textContent = 'Saving offer design...';

  try {
    const response = await fetch('/offer-designs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ designBrief: state, status: 'draft' }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to save offer design');
    }

    refs.statusLine.textContent = 'Saved offer design: ' + payload.offerDesign.id;
  } catch (error) {
    refs.statusLine.textContent = 'Save failed: ' + error.message;
  }
}

function bindInputs() {
  refs.restaurantNameInput.value = state.restaurantName;
  refs.restaurantLocationInput.value = state.restaurantLocation;
  refs.offerLabelInput.value = state.offerLabel;
  refs.productImageInput.value = state.productImageAsset;
  refs.logoImageInput.value = state.logoAsset;

  refs.restaurantNameInput.addEventListener('input', () => { state.restaurantName = refs.restaurantNameInput.value.trim() || 'Your Restaurant'; renderLivePreview(); });
  refs.restaurantLocationInput.addEventListener('input', () => { state.restaurantLocation = refs.restaurantLocationInput.value.trim(); renderLivePreview(); });
  refs.offerLabelInput.addEventListener('input', () => { state.offerLabel = refs.offerLabelInput.value.trim(); renderLivePreview(); });
  refs.productImageInput.addEventListener('input', () => { state.productImageAsset = refs.productImageInput.value.trim(); renderLivePreview(); });
  refs.logoImageInput.addEventListener('input', () => { state.logoAsset = refs.logoImageInput.value.trim(); renderLivePreview(); });

  refs.densityToggle.addEventListener('change', () => { state.textDensity = refs.densityToggle.checked ? 'more_text' : 'balanced'; });
  refs.backgroundToggle.addEventListener('change', () => { state.backgroundMode = refs.backgroundToggle.checked ? 'dark' : 'light'; renderLivePreview(); });
  refs.fontMoodToggle.addEventListener('change', () => { state.fontMood = refs.fontMoodToggle.checked ? 'bold' : 'elegant'; });
  refs.logoToggle.addEventListener('change', () => { state.logoEnabled = refs.logoToggle.checked; renderLivePreview(); });
  refs.addressToggle.addEventListener('change', () => { state.addressEnabled = refs.addressToggle.checked; renderLivePreview(); });
  refs.qrToggle.addEventListener('change', () => { state.qrEnabled = refs.qrToggle.checked; renderLivePreview(); });

  refs.previewButton.addEventListener('click', refreshEnginePreview);
  refs.saveButton.addEventListener('click', saveOfferDesign);
}

function drawItemChoices() {
  renderChips(refs.itemChoices, ITEM_OPTIONS, state.itemName, (value) => {
    state.itemName = value;
    if (!refs.offerLabelInput.value.trim()) {
      state.offerLabel = state.offerType + ' ' + value;
      refs.offerLabelInput.value = state.offerLabel;
    }
    drawItemChoices();
    renderLivePreview();
  });
}

function drawOfferChoices() {
  renderChips(refs.offerChoices, OFFER_OPTIONS, state.offerType, (value) => {
    state.offerType = value;
    if (!refs.offerLabelInput.value.trim()) {
      state.offerLabel = value + ' ' + state.itemName;
      refs.offerLabelInput.value = state.offerLabel;
    }
    drawOfferChoices();
    renderLivePreview();
  });
}

function drawStyleChoices() {
  renderChips(refs.styleChoices, STYLE_OPTIONS, state.visualStyle, (value) => {
    state.visualStyle = value;
    drawStyleChoices();
    renderLivePreview();
  });
}

function drawRefinementChoices() {
  renderChips(refs.refinementChoices, REFINEMENT_OPTIONS, state.refinementChoice, (value) => {
    state.refinementChoice = value;
    drawRefinementChoices();
  });
}

function boot() {
  drawItemChoices();
  drawOfferChoices();
  drawStyleChoices();
  drawRefinementChoices();
  bindInputs();
  renderLivePreview();
  refreshEnginePreview();
}

boot();
