const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '..', 'db', 'poster-data.json');

function nowIso() {
  return new Date().toISOString();
}

function generateId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function defaultData() {
  return {
    offerDesigns: [],
    posterAssets: [],
    generatedImageCache: {},
  };
}

function ensureFile() {
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(defaultData(), null, 2));
  }
}

function load() {
  ensureFile();
  const raw = fs.readFileSync(STORE_PATH, 'utf8').trim();
  if (!raw) return defaultData();

  try {
    return { ...defaultData(), ...JSON.parse(raw) };
  } catch (_error) {
    return defaultData();
  }
}

function save(data) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

function createAsset(payload = {}) {
  const data = load();
  const asset = {
    id: generateId('asset'),
    type: payload.type || 'image',
    sourceUrl: payload.sourceUrl || '',
    optimizedUrl: payload.optimizedUrl || payload.sourceUrl || '',
    mimeType: payload.mimeType || 'image/jpeg',
    createdAt: nowIso(),
  };

  data.posterAssets.push(asset);
  save(data);
  return asset;
}

function getAsset(assetId) {
  const data = load();
  return data.posterAssets.find((asset) => asset.id === assetId) || null;
}

function getAssetsByIds(assetIds = []) {
  const wanted = new Set((Array.isArray(assetIds) ? assetIds : []).map((id) => String(id || '').trim()).filter(Boolean));
  if (!wanted.size) return [];
  const data = load();
  return data.posterAssets.filter((asset) => wanted.has(asset.id));
}

function listAssets() {
  const data = load();
  return data.posterAssets.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function createOfferDesign(payload = {}) {
  const data = load();
  const now = nowIso();
  const record = {
    id: generateId('offer_design'),
    status: payload.status || 'draft',
    designBrief: payload.designBrief || {},
    selectedPresetId: payload.selectedPresetId || null,
    preview: payload.preview || null,
    providerMeta: payload.providerMeta || {},
    createdAt: now,
    updatedAt: now,
  };

  data.offerDesigns.push(record);
  save(data);
  return record;
}

function updateOfferDesign(designId, patch = {}) {
  const data = load();
  const row = data.offerDesigns.find((item) => item.id === designId);
  if (!row) return null;

  Object.assign(row, patch, { updatedAt: nowIso() });
  save(data);
  return row;
}

function getOfferDesign(designId) {
  const data = load();
  return data.offerDesigns.find((item) => item.id === designId) || null;
}

function listOfferDesigns() {
  const data = load();
  return data.offerDesigns
    .slice()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function getGeneratedImageCache(cacheKey) {
  const key = String(cacheKey || '').trim();
  if (!key) return null;
  const data = load();
  const cache = data.generatedImageCache && typeof data.generatedImageCache === 'object'
    ? data.generatedImageCache
    : {};
  return cache[key] || null;
}

function setGeneratedImageCache(cacheKey, payload = {}) {
  const key = String(cacheKey || '').trim();
  if (!key) return null;
  const data = load();
  if (!data.generatedImageCache || typeof data.generatedImageCache !== 'object') {
    data.generatedImageCache = {};
  }
  const record = {
    key,
    assetId: payload.assetId || '',
    imageUrl: payload.imageUrl || '',
    prompt: payload.prompt || '',
    promptId: payload.promptId || '',
    provider: payload.provider || 'unknown',
    meta: payload.meta || {},
    createdAt: nowIso(),
  };
  data.generatedImageCache[key] = record;
  save(data);
  return record;
}

module.exports = {
  nowIso,
  generateId,
  createAsset,
  getAsset,
  getAssetsByIds,
  listAssets,
  createOfferDesign,
  updateOfferDesign,
  getOfferDesign,
  listOfferDesigns,
  getGeneratedImageCache,
  setGeneratedImageCache,
};
