function shortenHeadline(value = '') {
  const clean = String(value || '').trim();
  if (!clean) return 'Limited Time Offer';
  if (clean.length <= 42) return clean;
  const parts = clean.split(/\s+/).slice(0, 6);
  return parts.join(' ');
}

function itemLineFor(items = []) {
  if (!Array.isArray(items) || items.length === 0) return 'Chef specials available';
  if (items.length === 1) return `Made for ${String(items[0]).toLowerCase()} lovers`;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items[0]}, ${items[1]} & more`;
}

function headlineFromOffer(offerType = '', offerText = '') {
  const type = String(offerType || '').toLowerCase();
  if (type.includes('buy 1')) return 'Buy 1 Get 1 Free';
  if (type.includes('20%')) return 'Get 20% Off';
  if (type.includes('10%')) return 'Get 10% Off';
  if (type.includes('combo')) return 'Combo Deal Available';
  if (type.includes('limited')) return 'Limited Time Offer';
  if (offerText) return shortenHeadline(offerText);
  return 'Special Offer';
}

function generatePromoCopy(input = {}) {
  const offerStrong = Boolean(input.isOfferStrong);
  const hasMultiItem = Boolean(input.isMultiItem);
  const headline = shortenHeadline(headlineFromOffer(input.offerType, input.offerText));
  const subheadline = offerStrong
    ? 'Freshly prepared and ready today.'
    : 'Made fresh daily for your neighborhood.';

  const itemLine = hasMultiItem
    ? itemLineFor(input.selectedItems)
    : itemLineFor(input.selectedItems);

  const cta = input.hasQr ? 'Scan and redeem in-store' : 'Available now';
  const brandLine = String(input.restaurantName || 'Your Restaurant');
  const footerLine = String(input.address || '').length > 64 ? '' : String(input.address || '');

  return {
    eyebrow: offerStrong ? 'Hot Offer' : 'Today at your local spot',
    headline,
    subheadline,
    itemLine,
    cta,
    brandLine,
    footerLine,
  };
}

module.exports = {
  generatePromoCopy,
  shortenHeadline,
};

