function titleCase(value = '') {
  return String(value || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function cuisineCopyPack(cuisineKey, itemProfile, strongDiscount) {
  const isBiryani = itemProfile.normalizedItemName === 'biryani';

  if (cuisineKey === 'indian') {
    if (isBiryani) {
      return {
        combo: {
          valueLine: strongDiscount ? 'Lunch Intro Price Today' : 'Only $11.99 Today',
          supportLine: 'Great for weekday lunch with raita or drink pairing',
        },
        bundle: {
          valueLine: 'Feed 4 for $24.99',
          supportLine: 'Strong weekend and dinner value for family orders',
        },
        launch: {
          valueLine: 'Limited First-Week Launch',
          supportLine: 'Best for awareness and first-time trial',
        },
      };
    }
    return {
      combo: {
        valueLine: strongDiscount ? 'Save 20% This Lunch Window' : 'Lunch Value Combo Today',
        supportLine: 'Works well for weekday spice-forward lunch demand',
      },
      bundle: {
        valueLine: 'Family Value Pack This Weekend',
        supportLine: 'Built for dinner sharing and larger table orders',
      },
      launch: {
        valueLine: 'Limited Launch Week Feature',
        supportLine: 'Positioned for discovery and social trial',
      },
    };
  }

  if (cuisineKey === 'mexican') {
    return {
      combo: {
        valueLine: strongDiscount ? 'Save 20% This Lunch Window' : 'Only $10.99 Combo Today',
        supportLine: 'Great for weekday lunch traffic and quick pickups',
      },
      bundle: {
        valueLine: 'Feed 4 for $22.99',
        supportLine: 'Best for family and group dinner occasions',
      },
      launch: {
        valueLine: 'Limited New Menu Launch',
        supportLine: 'Best for awareness and first-order trial',
      },
    };
  }

  return {
    combo: {
      valueLine: strongDiscount ? 'Save 20% This Lunch Window' : 'Only $11.99 Today',
      supportLine: 'Great for weekday lunch orders',
    },
    bundle: {
      valueLine: 'Feed 4 for $24.99',
      supportLine: 'Strong weekend and dinner promotion',
    },
    launch: {
      valueLine: 'Limited First-Week Launch',
      supportLine: 'Best for awareness and trial',
    },
  };
}

function buildSuggestionBlueprints(input, itemProfile, cuisineProfile) {
  const baseItem = titleCase(itemProfile.itemName || input.itemDescription || 'Chef Special');
  const itemKey = (itemProfile.normalizedItemName || baseItem).replace(/\s+/g, '_').toLowerCase();
  const cuisineKey = cuisineProfile.primaryCuisine || input.businessContext.cuisineType || 'american';
  const strongDiscount = input.promotionIntent === 'discount';
  const isRetention = input.promotionIntent === 'bring_back';
  const cuisineCopy = cuisineCopyPack(cuisineKey, itemProfile, strongDiscount);
  const allowFamilyPack = (itemProfile.pairingCandidates || []).includes('family_pack');

  const baseCombo = {
    promoType: 'combo',
    targetMoment: 'lunch',
    badge: isRetention ? 'Fast Win-Back' : 'Best for Lunch Traffic',
    title: `${baseItem} Lunch Combo`,
    valueLine: cuisineCopy.combo.valueLine,
    supportLine: cuisineCopy.combo.supportLine,
    visualIntent: `bold_combo_hero_${cuisineKey}`,
    compositionType: 'hero_combo',
    previewSeed: `${itemKey}_combo_drink`,
    expectedFoodTags: [...(itemProfile.expectedFoodTags || []), 'combo', 'drink', cuisineKey],
    score: 0.91,
    suggestionType: 'combo_promotion',
  };
  const baseFamily = {
    promoType: 'bundle',
    targetMoment: 'dinner_weekend',
    badge: 'Good for Family Orders',
    title: `Family ${baseItem} Pack`,
    valueLine: cuisineCopy.bundle.valueLine,
    supportLine: cuisineCopy.bundle.supportLine,
    visualIntent: `family_bundle_${cuisineKey}`,
    compositionType: 'family_tray',
    previewSeed: `${itemKey}_family_tray`,
    expectedFoodTags: [...(itemProfile.expectedFoodTags || []), 'family', 'tray', cuisineKey],
    score: 0.87,
    suggestionType: 'family_bundle',
  };
  const baseLaunch = {
    promoType: input.promotionIntent === 'new_item' ? 'new_item' : 'launch',
    targetMoment: 'awareness',
    badge: input.promotionIntent === 'new_item' ? 'Launch Priority' : 'New Item Spotlight',
    title: `Try the New ${baseItem}`,
    valueLine: cuisineCopy.launch.valueLine,
    supportLine: cuisineCopy.launch.supportLine,
    visualIntent: `premium_new_item_${cuisineKey}`,
    compositionType: 'premium_plated',
    previewSeed: `${itemKey}_premium_plated`,
    expectedFoodTags: [...(itemProfile.expectedFoodTags || []), 'premium', 'launch', cuisineKey],
    score: 0.84,
    suggestionType: 'new_item_spotlight',
  };
  const discountPush = {
    promoType: 'discount',
    targetMoment: 'afternoon',
    badge: 'Conversion Booster',
    title: `${baseItem} Save Now`,
    valueLine: 'Save 20% This Week',
    supportLine: 'Built for immediate redemptions and quick conversions',
    visualIntent: `urgent_discount_${cuisineKey}`,
    compositionType: 'text_offer_focus',
    previewSeed: `${itemKey}_discount_urgent`,
    expectedFoodTags: [...(itemProfile.expectedFoodTags || []), 'discount', cuisineKey],
    score: 0.86,
    suggestionType: 'timed_discount',
  };

  let blueprints = [baseCombo, baseLaunch, discountPush];
  if (input.promotionIntent === 'combo' && allowFamilyPack) {
    blueprints = [baseCombo, baseFamily, baseLaunch];
  } else if (input.promotionIntent === 'new_item') {
    blueprints = [baseLaunch, baseCombo, discountPush];
  } else if (input.promotionIntent === 'discount') {
    blueprints = [discountPush, baseCombo, baseLaunch];
  }

  if (isRetention) {
    blueprints = [
      {
        promoType: 'win_back',
        targetMoment: 'evening',
        badge: 'Win Back Strategy',
        title: `Welcome Back ${baseItem} Offer`,
        valueLine: 'Exclusive return guest bonus',
        supportLine: 'Re-engage past customers with a clear value',
        visualIntent: `return_guest_${cuisineKey}`,
        compositionType: 'text_offer_focus',
        previewSeed: `${itemKey}_winback_offer`,
        expectedFoodTags: [...(itemProfile.expectedFoodTags || []), 'offer', 'return', cuisineKey],
        score: 0.89,
        suggestionType: 'win_back_offer',
      },
      {
        ...baseCombo,
        badge: 'Best for Comebacks',
        valueLine: 'Comeback Combo Offer',
        supportLine: 'Great for reactivating prior visitors quickly',
        score: 0.84,
      },
      {
      promoType: 'win_back',
      targetMoment: 'weekend',
      badge: 'Loyalty Push',
      title: `${baseItem} Return Guest Perk`,
      valueLine: 'Weekend return bonus',
      supportLine: 'Encourages repeat visits with a clear benefit',
      visualIntent: `loyalty_offer_${cuisineKey}`,
      compositionType: 'premium_plated',
      previewSeed: `${itemKey}_loyalty_offer`,
      expectedFoodTags: [...(itemProfile.expectedFoodTags || []), 'loyalty', 'offer', cuisineKey],
      score: 0.81,
      suggestionType: 'loyalty_offer',
      },
    ];
  }

  return blueprints.map((row, index) => ({
    id: `${itemKey}_${row.promoType}_${index + 1}`,
    itemKey,
    cuisineKey,
    ...row,
  }));
}

module.exports = {
  buildSuggestionBlueprints,
};
