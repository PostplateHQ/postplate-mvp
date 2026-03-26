function isValidUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function firstValidImage(images = []) {
  return (Array.isArray(images) ? images : []).find((row) => isValidUrl(row)) || '';
}

function flattenImagePool(imageUrlsByItem = {}, selectedItems = []) {
  const pool = [];
  selectedItems.forEach((item) => {
    const urls = Array.isArray(imageUrlsByItem[item]) ? imageUrlsByItem[item] : [];
    urls.forEach((url) => {
      if (isValidUrl(url)) pool.push(url);
    });
  });
  return pool;
}

function selectPromoAssets(input = {}) {
  const selectedItems = Array.isArray(input.selectedItems) ? input.selectedItems : [];
  const imageUrlsByItem = input.imageUrlsByItem && typeof input.imageUrlsByItem === 'object'
    ? input.imageUrlsByItem
    : {};
  const primaryItem = selectedItems[0] || '';
  const primaryImages = Array.isArray(imageUrlsByItem[primaryItem]) ? imageUrlsByItem[primaryItem] : [];
  const heroImageUrl = firstValidImage(primaryImages) || firstValidImage(flattenImagePool(imageUrlsByItem, selectedItems));
  const gridImageUrls = flattenImagePool(imageUrlsByItem, selectedItems).slice(0, 4);

  return {
    heroImageUrl,
    gridImageUrls,
  };
}

module.exports = {
  selectPromoAssets,
  isValidUrl,
};

