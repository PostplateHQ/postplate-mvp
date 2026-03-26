(function attachCreateOfferFlow(globalScope) {
  const ENTRY_OPTIONS = [
    { id: 'create_new', icon: '✦', title: 'Create New Offer', description: 'Start a fresh promotion with guided help.' },
    { id: 'duplicate_previous', icon: '⎘', title: 'Duplicate Previous Offer', description: 'Reuse a past offer and improve it quickly.' },
  ];

  const INTENT_OPTIONS = [
    { id: 'combo', icon: '▦', title: 'Combo Deal', description: 'Increase basket size with pairings and bundles.' },
    { id: 'discount', icon: '％', title: 'Discount Offer', description: 'Drive immediate conversion with a clear value.' },
    { id: 'new_item', icon: '✦', title: 'New Item', description: 'Spotlight menu discovery and first-time trials.' },
    { id: 'bring_back', icon: '↻', title: 'Bring Back Customers', description: 'Win back past guests with retention offers.' },
  ];

  const MOOD_OPTIONS = ['Bold', 'Premium', 'Fun'];
  const VISUAL_STYLE_OPTIONS = ['Dark background', 'Bright & colorful', 'Premium', 'Bold', 'Minimal'];
  const LAYOUT_STYLE_OPTIONS = ['Full background image', 'Half image + text', 'Text-heavy'];
  const IMAGE_SOURCE_OPTIONS = ['Upload image', 'Use existing', 'Generate using AI'];
  const FONT_STYLE_OPTIONS = ['Modern Sans', 'Classic Serif', 'Bold Display'];
  const TONE_STYLE_OPTIONS = ['Urgent Promo', 'Friendly Local', 'Premium Clean'];

  function fallbackApiUrl(pathname) {
    if (window.location.protocol === 'file:') return 'http://localhost:3000' + pathname;
    return pathname;
  }

  function asString(value, fallback = '') {
    const normalized = String(value || '').trim();
    return normalized || fallback;
  }

  class CreateOfferFlowModal {
    constructor(options = {}) {
      this.options = options;
      this.state = this.defaultState();

      this.refs = {
        modal: document.getElementById('createOfferFlowModal'),
        close: document.getElementById('closeCreateOfferFlow'),
        cancel: document.getElementById('createOfferCancelButton'),
        back: document.getElementById('createOfferBackButton'),
        next: document.getElementById('createOfferNextButton'),
        stepLabel: document.getElementById('createOfferStepLabel'),
        notice: document.getElementById('createOfferFlowNotice'),
        stepBlocks: Array.from(document.querySelectorAll('.pp-create-offer-step')),

        entryOptions: document.getElementById('createOfferEntryOptions'),
        duplicatePanel: document.getElementById('createOfferDuplicatePanel'),
        duplicateSelect: document.getElementById('createOfferDuplicateSelect'),

        intentOptions: document.getElementById('promotionIntentOptions'),
        itemDescription: document.getElementById('createOfferItemDescription'),
        moodOptions: document.getElementById('createOfferMoodOptions'),
        visualStyleOptions: document.getElementById('createOfferVisualStyleOptions'),
        layoutStyleOptions: document.getElementById('createOfferLayoutStyleOptions'),
        imageSourceOptions: document.getElementById('createOfferImageSourceOptions'),
        taglineOptions: document.getElementById('createOfferTaglineOptions'),
        fontStyleOptions: document.getElementById('createOfferFontStyleOptions'),
        toneStyleOptions: document.getElementById('createOfferToneStyleOptions'),

        uploadType: document.getElementById('createOfferUploadType'),
        uploadHelper: document.getElementById('createOfferUploadHelper'),
        uploadButton: document.getElementById('createOfferUploadButton'),
        useExistingButton: document.getElementById('createOfferUseExistingButton'),
        skipImagesButton: document.getElementById('createOfferSkipImagesButton'),
        fileInput: document.getElementById('createOfferFileInput'),
        existingAssets: document.getElementById('createOfferExistingAssets'),
        uploadedAssets: document.getElementById('createOfferUploadedAssets'),

        suggestionsLoading: document.getElementById('createOfferSuggestionsLoading'),
        suggestionsResults: document.getElementById('createOfferSuggestionsResults'),
        suggestionsList: document.getElementById('createOfferSuggestionsList'),

        finalPreview: document.getElementById('createOfferFinalPreview'),
        selectedSummary: document.getElementById('createOfferSelectedSummary'),

        downloadButton: document.getElementById('createOfferDownloadButton'),
        shareButton: document.getElementById('createOfferShareButton'),
        saveButton: document.getElementById('createOfferSaveButton'),
      };

      this.bindEvents();
      this.reset();
    }

    defaultState() {
      return {
        isOpen: false,
        step: 1,
        entryMode: '',
        duplicateOfferId: '',
        promotionIntent: '',
        itemDescription: '',
        mood: 'Bold',
        visualStyle: 'Premium',
        layoutStyle: 'Half image + text',
        imageSourcePreference: 'Generate using AI',
        taglineChoice: '',
        fontStyleChoice: 'Modern Sans',
        toneStyleChoice: 'Friendly Local',
        uploadedAssets: [],
        existingAssetPool: [],
        selectedExistingAssetIds: [],
        suggestions: [],
        selectedSuggestion: null,
        selectedDraft: null,
        loadingSuggestions: false,
        isSelectingSuggestion: false,
        isUploadingAssets: false,
      };
    }

    context() {
      if (typeof this.options.getContext === 'function') return this.options.getContext() || {};
      return {};
    }

    apiUrl(pathname) {
      if (typeof this.options.apiUrl === 'function') return this.options.apiUrl(pathname);
      return fallbackApiUrl(pathname);
    }

    setNotice(message = '', tone = 'info') {
      if (!this.refs.notice) return;
      if (!message) {
        this.refs.notice.textContent = '';
        this.refs.notice.className = 'pp-create-offer-notice hidden';
        return;
      }
      this.refs.notice.textContent = message;
      this.refs.notice.className = `pp-create-offer-notice ${tone}`;
    }

    reset() {
      this.state = this.defaultState();
      this.renderAllOptions();
      this.renderDuplicateOptions();
      this.renderUploadedAssets();
      this.renderExistingAssets();
      this.renderSuggestions();
      this.renderSelectedSummary();
      this.renderFinalPreview();
      this.render();
    }

    open(prefill = {}) {
      this.reset();
      this.state.isOpen = true;
      if (prefill.promotionIntent) {
        this.state.entryMode = 'create_new';
        this.state.promotionIntent = prefill.promotionIntent;
        this.state.step = 2;
      }
      this.refs.modal.classList.remove('hidden');
      this.refs.modal.setAttribute('aria-hidden', 'false');
      this.render();
    }

    close() {
      this.state.isOpen = false;
      this.refs.modal.classList.add('hidden');
      this.refs.modal.setAttribute('aria-hidden', 'true');
      this.setNotice('');
    }

    bindEvents() {
      this.refs.close.addEventListener('click', () => this.close());
      this.refs.cancel.addEventListener('click', () => this.close());
      this.refs.back.addEventListener('click', () => this.prevStep());
      this.refs.next.addEventListener('click', () => this.nextStep());

      this.refs.modal.addEventListener('click', (event) => {
        if (event.target === this.refs.modal) this.close();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && this.state.isOpen) this.close();
      });

      this.refs.itemDescription.addEventListener('input', () => {
        this.state.itemDescription = asString(this.refs.itemDescription.value);
        this.renderTaglineOptions();
      });
      this.refs.duplicateSelect.addEventListener('change', () => {
        this.state.duplicateOfferId = asString(this.refs.duplicateSelect.value);
      });

      this.refs.uploadType.addEventListener('change', () => this.renderUploadHelper());
      this.refs.uploadButton.addEventListener('click', () => this.refs.fileInput.click());
      this.refs.fileInput.addEventListener('change', async () => {
        await this.uploadSelectedFiles();
      });
      this.refs.useExistingButton.addEventListener('click', async () => {
        const shouldShow = this.refs.existingAssets.classList.contains('hidden');
        if (shouldShow) {
          await this.loadExistingAssets();
          this.refs.existingAssets.classList.remove('hidden');
        } else {
          this.refs.existingAssets.classList.add('hidden');
        }
      });
      this.refs.skipImagesButton.addEventListener('click', () => {
        this.state.selectedExistingAssetIds = [];
        this.refs.existingAssets.classList.add('hidden');
        this.renderExistingAssets();
      });

      this.refs.downloadButton?.addEventListener('click', () => this.downloadOutput());
      this.refs.shareButton?.addEventListener('click', () => this.shareOutput());
      this.refs.saveButton?.addEventListener('click', () => this.saveOutput());
    }

    render() {
      this.refs.stepLabel.textContent = `Step ${this.state.step} of 6`;
      this.refs.stepBlocks.forEach((block) => {
        block.classList.toggle('hidden', Number(block.dataset.step) !== this.state.step);
      });

      this.refs.back.classList.toggle('hidden', this.state.step <= 1);
      this.refs.back.disabled = this.state.step <= 1;

      const hideNext = this.state.step === 4 || this.state.step === 6;
      this.refs.next.classList.toggle('hidden', hideNext);
      this.refs.next.disabled = this.state.loadingSuggestions || this.state.isSelectingSuggestion || this.state.isUploadingAssets;
      this.refs.next.textContent = this.state.step === 3 ? 'Get Refined Suggestions' : (this.state.step === 5 ? 'Continue' : 'Next');

      this.refs.cancel.textContent = this.state.step === 6 ? 'Close' : 'Cancel';
      this.refs.itemDescription.value = this.state.itemDescription;
      this.refs.duplicatePanel.classList.toggle('hidden', this.state.entryMode !== 'duplicate_previous');
      this.renderUploadHelper();
      this.renderUploadPanelState();
    }

    renderAllOptions() {
      this.renderEntryOptions();
      this.renderIntentOptions();
      this.renderMoodOptions();
      this.renderVisualStyleOptions();
      this.renderLayoutStyleOptions();
      this.renderImageSourceOptions();
      this.renderTaglineOptions();
      this.renderFontStyleOptions();
      this.renderToneStyleOptions();
    }

    bindChoice(container, selectedValue, choices, onChange) {
      container.innerHTML = choices.map((choice) => (
        `<button class="pp-choice-chip${selectedValue === choice ? ' active' : ''}" type="button" data-choice="${choice}">${choice}</button>`
      )).join('');
      container.querySelectorAll('[data-choice]').forEach((button) => {
        button.addEventListener('click', () => onChange(asString(button.dataset.choice)));
      });
    }

    renderEntryOptions() {
      this.refs.entryOptions.innerHTML = ENTRY_OPTIONS.map((option) => `
        <button class="pp-create-offer-intent-card${this.state.entryMode === option.id ? ' active' : ''}" type="button" data-entry="${option.id}">
          <span class="pp-create-offer-intent-icon">${option.icon}</span>
          <strong>${option.title}</strong>
          <p>${option.description}</p>
        </button>
      `).join('');
      this.refs.entryOptions.querySelectorAll('[data-entry]').forEach((button) => {
        button.addEventListener('click', () => {
          this.state.entryMode = asString(button.dataset.entry);
          this.renderEntryOptions();
          this.render();
        });
      });
    }

    renderDuplicateOptions() {
      const offers = Array.isArray(this.context().offers) ? this.context().offers : [];
      const options = offers.slice(0, 10).map((offer) => (
        `<option value="${offer.id}">${offer.title || offer.name || 'Untitled'} · ${offer.offerType || ''}</option>`
      ));
      this.refs.duplicateSelect.innerHTML = ['<option value="">Select previous offer</option>', ...options].join('');
    }

    renderIntentOptions() {
      this.refs.intentOptions.innerHTML = INTENT_OPTIONS.map((option) => `
        <button class="pp-create-offer-intent-card${this.state.promotionIntent === option.id ? ' active' : ''}" type="button" data-intent="${option.id}">
          <span class="pp-create-offer-intent-icon">${option.icon}</span>
          <strong>${option.title}</strong>
          <p>${option.description}</p>
        </button>
      `).join('');
      this.refs.intentOptions.querySelectorAll('[data-intent]').forEach((button) => {
        button.addEventListener('click', () => {
          this.state.promotionIntent = asString(button.dataset.intent);
          this.renderIntentOptions();
        });
      });
    }

    renderMoodOptions() {
      this.bindChoice(this.refs.moodOptions, this.state.mood, MOOD_OPTIONS, (value) => {
        this.state.mood = value;
        this.renderMoodOptions();
      });
    }

    renderVisualStyleOptions() {
      this.bindChoice(this.refs.visualStyleOptions, this.state.visualStyle, VISUAL_STYLE_OPTIONS, (value) => {
        this.state.visualStyle = value;
        this.renderVisualStyleOptions();
      });
    }

    renderLayoutStyleOptions() {
      this.bindChoice(this.refs.layoutStyleOptions, this.state.layoutStyle, LAYOUT_STYLE_OPTIONS, (value) => {
        this.state.layoutStyle = value;
        this.renderLayoutStyleOptions();
      });
    }

    renderImageSourceOptions() {
      this.bindChoice(this.refs.imageSourceOptions, this.state.imageSourcePreference, IMAGE_SOURCE_OPTIONS, (value) => {
        this.state.imageSourcePreference = value;
        this.renderImageSourceOptions();
        this.renderUploadPanelState();
      });
    }

    renderTaglineOptions() {
      const item = this.state.itemDescription || 'your special';
      const options = [
        `${item} - Hot & Fresh Today`,
        `${item} - Limited Time Only`,
        `${item} - Taste the Difference`,
      ];
      if (!this.state.taglineChoice) this.state.taglineChoice = options[0];
      this.bindChoice(this.refs.taglineOptions, this.state.taglineChoice, options, (value) => {
        this.state.taglineChoice = value;
        this.renderTaglineOptions();
      });
    }

    renderFontStyleOptions() {
      this.bindChoice(this.refs.fontStyleOptions, this.state.fontStyleChoice, FONT_STYLE_OPTIONS, (value) => {
        this.state.fontStyleChoice = value;
        this.renderFontStyleOptions();
      });
    }

    renderToneStyleOptions() {
      this.bindChoice(this.refs.toneStyleOptions, this.state.toneStyleChoice, TONE_STYLE_OPTIONS, (value) => {
        this.state.toneStyleChoice = value;
        this.renderToneStyleOptions();
      });
    }

    renderUploadPanelState() {
      const enabled = this.state.imageSourcePreference === 'Upload image' || this.state.imageSourcePreference === 'Use existing';
      this.refs.uploadType.disabled = !enabled;
      this.refs.uploadButton.disabled = this.state.isUploadingAssets || !enabled;
      this.refs.useExistingButton.disabled = this.state.isUploadingAssets || !enabled;
      this.refs.skipImagesButton.disabled = this.state.isUploadingAssets || !enabled;
      if (!enabled) this.refs.existingAssets.classList.add('hidden');
    }

    renderUploadHelper() {
      if (this.state.imageSourcePreference === 'Generate using AI') {
        this.refs.uploadHelper.textContent = 'AI image fallback will run automatically if no usable upload is available.';
        return;
      }
      const selected = asString(this.refs.uploadType.value, 'food_image');
      if (selected === 'menu_screenshot') {
        this.refs.uploadHelper.textContent = 'Upload a menu screenshot and we will infer combo opportunities.';
      } else if (selected === 'food_image') {
        this.refs.uploadHelper.textContent = 'Upload real food photos for more believable social-ready previews.';
      } else {
        this.refs.uploadHelper.textContent = 'Optional uploads improve suggestion quality and trust.';
      }
    }

    renderUploadedAssets() {
      if (!this.state.uploadedAssets.length) {
        this.refs.uploadedAssets.innerHTML = '<p class="pp-muted-copy">No assets added yet. You can continue with AI fallback.</p>';
        return;
      }
      this.refs.uploadedAssets.innerHTML = this.state.uploadedAssets.map((asset) => (
        `<span class="pp-upload-chip source-uploaded">${asset.label} · ${asset.type.replaceAll('_', ' ')}</span>`
      )).join('');
    }

    renderExistingAssets() {
      if (!this.state.existingAssetPool.length) {
        this.refs.existingAssets.innerHTML = '<p class="pp-muted-copy">No existing assets found yet.</p>';
        return;
      }
      this.refs.existingAssets.innerHTML = `
        <div class="pp-create-offer-existing-grid">
          ${this.state.existingAssetPool.map((asset) => `
            <label class="pp-create-offer-existing-item">
              <input type="checkbox" value="${asset.id}" ${this.state.selectedExistingAssetIds.includes(asset.id) ? 'checked' : ''} />
              <span>${asset.type.replaceAll('_', ' ')} · ${asset.label}</span>
            </label>
          `).join('')}
        </div>
        <div class="pp-inline-actions">
          <button type="button" class="pp-secondary-btn" data-add-existing-assets>Add Selected</button>
        </div>
      `;
      this.refs.existingAssets.querySelectorAll('input[type="checkbox"]').forEach((input) => {
        input.addEventListener('change', () => {
          const id = asString(input.value);
          if (input.checked && !this.state.selectedExistingAssetIds.includes(id)) this.state.selectedExistingAssetIds.push(id);
          if (!input.checked) this.state.selectedExistingAssetIds = this.state.selectedExistingAssetIds.filter((row) => row !== id);
        });
      });
      this.refs.existingAssets.querySelector('[data-add-existing-assets]')?.addEventListener('click', () => {
        const chosen = this.state.existingAssetPool.filter((asset) => this.state.selectedExistingAssetIds.includes(asset.id));
        chosen.forEach((asset) => {
          if (!this.state.uploadedAssets.find((row) => row.id === asset.id)) this.state.uploadedAssets.push(asset);
        });
        this.renderUploadedAssets();
        this.refs.existingAssets.classList.add('hidden');
      });
    }

    renderSuggestions() {
      if (this.state.loadingSuggestions) {
        this.refs.suggestionsLoading.classList.remove('hidden');
        this.refs.suggestionsResults.classList.add('hidden');
        return;
      }
      this.refs.suggestionsLoading.classList.add('hidden');
      this.refs.suggestionsResults.classList.remove('hidden');
      if (!this.state.suggestions.length) {
        this.refs.suggestionsList.innerHTML = '<div class="pp-empty-inline">No suggestions available yet. Update your details and retry.</div>';
        return;
      }
      this.refs.suggestionsList.innerHTML = this.state.suggestions.map((suggestion) => `
        <article class="pp-create-offer-suggestion-card">
          <span class="pp-card-chip accent">${(suggestion.badge || suggestion.suggestionType || '').replaceAll('_', ' ')}</span>
          <strong>${suggestion.title}</strong>
          <p>${suggestion.supportLine || suggestion.subtitle || ''}</p>
          <p class="pp-create-offer-price">${suggestion.valueLine || suggestion.valueFraming || ''}</p>
          <div class="pp-create-offer-preview">
            ${suggestion.previewImage?.url
              ? `<img src="${suggestion.previewImage.url}" alt="${suggestion.title} preview image" loading="lazy" />
                 <span class="pp-create-offer-preview-label">Preview image</span>
                 ${suggestion.preview?.headline ? `<span class="pp-create-offer-preview-headline">${suggestion.preview.headline}</span>` : ''}`
              : `<span>${(suggestion.visualBehavior || '').replaceAll('_', ' ')}</span>`
            }
          </div>
          <button type="button" class="pp-primary-btn" data-use-suggestion="${suggestion.id}" ${this.state.isSelectingSuggestion ? 'disabled' : ''}>Use This Promo</button>
        </article>
      `).join('');
      this.refs.suggestionsList.querySelectorAll('[data-use-suggestion]').forEach((button) => {
        button.addEventListener('click', async () => this.selectSuggestion(asString(button.dataset.useSuggestion)));
      });
    }

    renderSelectedSummary() {
      if (!this.state.selectedSuggestion) {
        this.refs.selectedSummary.innerHTML = '<p class="pp-muted-copy">Select a suggestion to continue.</p>';
        return;
      }
      this.refs.selectedSummary.innerHTML = `
        <article class="pp-create-offer-selected-card">
          <strong>${this.state.selectedSuggestion.title}</strong>
          <p>${this.state.selectedSuggestion.supportLine || this.state.selectedSuggestion.subtitle || ''}</p>
          <p class="pp-create-offer-price">${this.state.selectedSuggestion.valueLine || this.state.selectedSuggestion.valueFraming || ''}</p>
          <p class="pp-muted-copy">Draft prepared for post, story, and flyer outputs.</p>
        </article>
      `;
    }

    renderFinalPreview() {
      if (!this.state.selectedSuggestion) {
        this.refs.finalPreview.innerHTML = '<div class="pp-empty-inline">Select a suggestion first to view final poster preview.</div>';
        return;
      }
      const profile = this.context().profile || {};
      const headline = this.state.selectedSuggestion.preview?.headline || this.state.selectedSuggestion.title;
      const subheadline = this.state.selectedSuggestion.preview?.subheadline || this.state.selectedSuggestion.valueLine || '';
      const imageUrl = this.state.selectedSuggestion.previewImage?.url || '';
      this.refs.finalPreview.innerHTML = `
        <div class="pp-create-offer-poster-canvas">
          ${imageUrl ? `<img src="${imageUrl}" alt="Final poster preview" loading="lazy" />` : ''}
          <div class="pp-create-offer-poster-overlay">
            <div class="pp-create-offer-poster-brand">${profile.restaurantName || 'Your Restaurant'}</div>
            <h5>${headline}</h5>
            <p>${subheadline}</p>
            <div class="pp-create-offer-poster-meta">
              <span>${profile.restaurantLocation || 'Primary location'}</span>
              <span>QR • Scan to redeem</span>
            </div>
          </div>
        </div>
      `;
    }

    applyDuplicateOfferPrefill() {
      const offers = Array.isArray(this.context().offers) ? this.context().offers : [];
      const selected = offers.find((offer) => offer.id === this.state.duplicateOfferId);
      if (!selected) return;
      this.state.itemDescription = asString(selected.title || selected.name, this.state.itemDescription || 'Chef Special');
      const type = asString(selected.offerType || selected.type).toLowerCase();
      if (type.includes('discount') || type.includes('%') || type.includes('off')) this.state.promotionIntent = 'discount';
      else if (type.includes('new')) this.state.promotionIntent = 'new_item';
      else if (type.includes('back') || type.includes('retain')) this.state.promotionIntent = 'bring_back';
      else this.state.promotionIntent = 'combo';
      this.renderIntentOptions();
      this.renderTaglineOptions();
    }

    prevStep() {
      if (this.state.step <= 1) return;
      this.state.step -= 1;
      this.render();
    }

    async nextStep() {
      if (this.state.step === 1) {
        if (!this.state.entryMode) return this.setNotice('Choose Create New or Duplicate Previous to continue.', 'warning');
        if (this.state.entryMode === 'duplicate_previous' && !this.state.duplicateOfferId) {
          return this.setNotice('Select a previous offer to duplicate.', 'warning');
        }
        if (this.state.entryMode === 'duplicate_previous') this.applyDuplicateOfferPrefill();
        this.state.step = 2;
        this.setNotice('');
        return this.render();
      }

      if (this.state.step === 2) {
        if (!this.state.promotionIntent) return this.setNotice('Select an offer type to continue.', 'warning');
        this.state.step = 3;
        this.setNotice('');
        return this.render();
      }

      if (this.state.step === 3) {
        if (!this.state.itemDescription) return this.setNotice('Add the item or offer you want to promote.', 'warning');
        this.state.step = 4;
        this.state.loadingSuggestions = true;
        this.setNotice('Generating refined poster directions...', 'info');
        this.render();
        this.renderSuggestions();
        try {
          await this.fetchSuggestions();
          this.setNotice(this.state.suggestions.length ? '' : 'No suggestions returned. Try adjusting your choices.', this.state.suggestions.length ? 'info' : 'warning');
        } catch (_error) {
          this.setNotice('Unable to generate suggestions right now. Please try again.', 'error');
        } finally {
          this.state.loadingSuggestions = false;
          this.render();
          this.renderSuggestions();
        }
        return;
      }

      if (this.state.step === 5) {
        this.state.step = 6;
        this.render();
      }
    }

    suggestionsPayload() {
      const ctx = this.context();
      return {
        storeId: ctx.storeId || '',
        lifecycleStage: 'draft',
        entryMode: this.state.entryMode,
        promotionIntent: this.state.promotionIntent,
        itemDescription: this.state.itemDescription,
        mood: this.state.mood,
        visualStyle: this.state.visualStyle,
        layoutStyle: this.state.layoutStyle,
        imageSourcePreference: this.state.imageSourcePreference,
        taglineChoice: this.state.taglineChoice,
        fontStyleChoice: this.state.fontStyleChoice,
        toneStyleChoice: this.state.toneStyleChoice,
        uploadedAssetIds: this.state.uploadedAssets.map((asset) => asset.id),
        businessContext: {
          cuisineType: ctx.profile?.cuisineType || '',
          businessType: ctx.profile?.businessType || '',
          location: ctx.profile?.restaurantLocation || '',
          restaurantName: ctx.profile?.restaurantName || '',
        },
        performanceSignals: {
          liveOffersCount: ctx.summary?.liveOffersCount || 0,
          totalRedemptions: ctx.summary?.totalRedemptions || 0,
          totalRepeatCustomers: ctx.summary?.totalRepeatCustomers || 0,
          totalRevenueInfluenced: ctx.summary?.totalRevenueInfluenced || 0,
        },
      };
    }

    async fetchSuggestions() {
      const response = await fetch(this.apiUrl('/api/offers/suggestions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.suggestionsPayload()),
      });
      const result = await response.json();
      if (!response.ok) {
        this.state.suggestions = [];
        throw new Error(result.error || 'Unable to generate suggestions.');
      }
      this.state.suggestions = Array.isArray(result.suggestions) ? result.suggestions : [];
    }

    async selectSuggestion(suggestionId) {
      if (this.state.isSelectingSuggestion) return;
      const selected = this.state.suggestions.find((row) => row.id === suggestionId);
      if (!selected) return;
      this.state.isSelectingSuggestion = true;
      this.setNotice('Preparing final preview...', 'info');
      this.render();
      try {
        const response = await fetch(this.apiUrl('/api/offers/select-suggestion'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId: this.context().storeId || '',
            suggestionId: selected.id,
            normalizedInput: this.suggestionsPayload(),
            selectedSuggestionPayload: selected,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to save selected promotion.');
        this.state.selectedSuggestion = selected;
        this.state.selectedDraft = result;
        this.state.step = 5;
        this.renderSelectedSummary();
        this.renderFinalPreview();
        this.setNotice('Final preview ready. Continue to output.', 'success');
        this.render();
      } catch (_error) {
        this.setNotice('We could not finalize this promo. Please try again.', 'error');
      } finally {
        this.state.isSelectingSuggestion = false;
        this.render();
      }
    }

    async uploadSelectedFiles() {
      const files = Array.from(this.refs.fileInput.files || []);
      if (!files.length) return;
      this.state.isUploadingAssets = true;
      this.render();
      const uploadType = asString(this.refs.uploadType.value, 'food_image');
      try {
        for (const file of files) {
          if (!String(file.type || '').startsWith('image/')) continue;
          if (Number(file.size || 0) > 8 * 1024 * 1024) continue;
          const dataUrl = await this.toDataUrl(file);
          const response = await fetch(this.apiUrl('/offer-designs/assets'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: uploadType,
              sourceUrl: dataUrl,
              optimizedUrl: dataUrl,
              mimeType: file.type || 'image/jpeg',
            }),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result.asset) throw new Error(result.error || `Upload failed (${response.status})`);
          this.state.uploadedAssets.push({
            id: result.asset.id,
            type: uploadType,
            label: file.name || 'Uploaded image',
          });
        }
        this.setNotice('Image upload complete.', 'success');
      } catch (_error) {
        this.setNotice('Image upload failed. Please try a different file.', 'error');
      } finally {
        this.state.isUploadingAssets = false;
        this.render();
      }
      this.refs.fileInput.value = '';
      this.renderUploadedAssets();
    }

    toDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    async loadExistingAssets() {
      try {
        this.setNotice('Loading existing assets...', 'info');
        const response = await fetch(this.apiUrl('/offer-designs/assets'));
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to load assets');
        const rows = Array.isArray(result.assets) ? result.assets : [];
        this.state.existingAssetPool = rows.slice(0, 12).map((asset, index) => ({
          id: asset.id,
          type: asString(asset.type, 'unknown'),
          label: `${String(asset.type || 'image').replaceAll('_', ' ')} ${index + 1}`,
        }));
        this.renderExistingAssets();
        this.setNotice(rows.length ? '' : 'No existing images found yet.', rows.length ? 'info' : 'warning');
      } catch (_error) {
        this.setNotice('Unable to load existing images right now.', 'error');
      }
    }

    async fetchQrDataUrlForDownload() {
      const ctx = this.context();
      const store = asString(ctx.storeId, 'taco123');
      const restaurant = asString(ctx.profile?.restaurantName, 'Your Restaurant');
      const offer = asString(this.state.selectedSuggestion?.title, 'Offer');
      const query = new URLSearchParams({
        store,
        restaurant,
        offer,
      });
      const response = await fetch(this.apiUrl(`/qr?${query.toString()}`));
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.qrDataUrl) return '';
      return result.qrDataUrl;
    }

    loadImage(url) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = url;
      });
    }

    drawCoverImage(context2d, image, width, height) {
      const scale = Math.max(width / image.width, height / image.height);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const x = (width - drawWidth) / 2;
      const y = (height - drawHeight) / 2;
      context2d.drawImage(image, x, y, drawWidth, drawHeight);
    }

    async downloadOutput() {
      if (!this.state.selectedSuggestion) {
        this.setNotice('Select a final preview before downloading.', 'warning');
        return;
      }
      this.setNotice('Preparing poster download...', 'info');

      const profile = this.context().profile || {};
      const imageUrl = this.state.selectedSuggestion.previewImage?.url || '';
      const headline = asString(this.state.selectedSuggestion.preview?.headline || this.state.selectedSuggestion.title, 'Offer');
      const subheadline = asString(this.state.selectedSuggestion.preview?.subheadline || this.state.selectedSuggestion.valueLine || '');
      const location = asString(profile.restaurantLocation, 'Primary location');
      const restaurant = asString(profile.restaurantName, 'Your Restaurant');
      const qrDataUrl = await this.fetchQrDataUrlForDownload();

      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (imageUrl) {
        try {
          const image = await this.loadImage(imageUrl);
          this.drawCoverImage(ctx, image, canvas.width, canvas.height);
        } catch (_error) {
          // Keep gradient fallback below.
        }
      }

      const overlay = ctx.createLinearGradient(0, 0, 0, canvas.height);
      overlay.addColorStop(0, 'rgba(2, 6, 23, 0.08)');
      overlay.addColorStop(0.65, 'rgba(2, 6, 23, 0.58)');
      overlay.addColorStop(1, 'rgba(2, 6, 23, 0.82)');
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.font = '700 34px "Arial", sans-serif';
      ctx.fillText(restaurant, 64, 92);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 88px "Arial", sans-serif';
      const headlineLines = [headline.slice(0, 24), headline.slice(24)].filter(Boolean);
      headlineLines.forEach((line, index) => {
        ctx.fillText(line, 64, 740 + (index * 90));
      });

      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      ctx.font = '600 44px "Arial", sans-serif';
      ctx.fillText(subheadline || 'Limited Time Offer', 64, 920);

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '500 30px "Arial", sans-serif';
      ctx.fillText(location, 64, 980);
      ctx.fillText('Scan to redeem', 852, 980);

      if (qrDataUrl) {
        try {
          const qr = await this.loadImage(qrDataUrl);
          ctx.fillStyle = 'rgba(255,255,255,0.96)';
          ctx.fillRect(836, 816, 180, 180);
          ctx.drawImage(qr, 846, 826, 160, 160);
        } catch (_error) {
          // Keep poster without QR if QR fails.
        }
      }

      canvas.toBlob((blob) => {
        if (!blob) {
          this.setNotice('Unable to build poster download right now.', 'error');
          return;
        }
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const fileBase = headline.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'offer-poster';
        anchor.href = url;
        anchor.download = `${fileBase}.png`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        this.setNotice('Poster downloaded with text and QR.', 'success');
      }, 'image/png');
    }

    async shareOutput() {
      const text = this.state.selectedSuggestion
        ? `${this.state.selectedSuggestion.title} — ${this.state.selectedSuggestion.valueLine || this.state.selectedSuggestion.valueFraming || ''}`
        : 'Offer ready';
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(text);
          this.setNotice('Share text copied to clipboard.', 'success');
        } else {
          this.setNotice('Clipboard is unavailable here.', 'warning');
        }
      } catch (_error) {
        this.setNotice('Unable to copy share text right now.', 'warning');
      }
    }

    saveOutput() {
      this.setNotice('Offer saved and ready for publishing workflow.', 'success');
    }
  }

  globalScope.PostPlateCreateOfferFlow = {
    CreateOfferFlowModal,
  };
})(window);
