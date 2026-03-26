function asString(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

const ITEM_PATTERNS = [
  {
    test: /pasta|spaghetti|penne|fettuccine|alfredo|lasagna|ravioli/i,
    normalizedItemName: 'pasta',
    foodCategory: 'pasta_dish',
    cuisineHints: ['italian'],
    servingStyle: 'plated_bowl',
    pairingCandidates: ['garlic bread', 'drink', 'family_pack'],
    tags: ['pasta', 'italian', 'sauce', 'plated'],
    confidence: 0.95,
  },
  {
    test: /salad|caesar|greek salad|garden salad|cobb/i,
    normalizedItemName: 'salad',
    foodCategory: 'salad',
    cuisineHints: ['healthy', 'american'],
    servingStyle: 'bowl_or_plate',
    pairingCandidates: ['drink', 'soup', 'side'],
    tags: ['salad', 'greens', 'fresh', 'healthy'],
    confidence: 0.94,
  },
  {
    test: /ice cream|gelato|sundae|sorbet/i,
    normalizedItemName: 'ice_cream',
    foodCategory: 'dessert',
    cuisineHints: ['desserts'],
    servingStyle: 'cup_or_scoop',
    pairingCandidates: ['waffle', 'brownie', 'milkshake'],
    tags: ['ice cream', 'dessert', 'sweet', 'cold'],
    confidence: 0.96,
  },
  {
    test: /biryani|pulao|pilaf/i,
    normalizedItemName: 'biryani',
    foodCategory: 'rice_dish',
    cuisineHints: ['indian', 'south_asian'],
    servingStyle: 'bowl_or_tray',
    pairingCandidates: ['drink', 'raita', 'family_pack'],
    tags: ['biryani', 'rice', 'spices', 'indian'],
    confidence: 0.95,
  },
  {
    test: /taco|burrito|quesadilla|nacho/i,
    normalizedItemName: 'taco_combo',
    foodCategory: 'street_food_combo',
    cuisineHints: ['mexican'],
    servingStyle: 'wrapped_or_plated',
    pairingCandidates: ['drink', 'chips', 'salsa'],
    tags: ['taco', 'mexican', 'fresh', 'grilled'],
    confidence: 0.92,
  },
  {
    test: /pizza|margherita|pepperoni/i,
    normalizedItemName: 'pizza',
    foodCategory: 'baked_flatbread',
    cuisineHints: ['pizza', 'italian'],
    servingStyle: 'slice_or_whole',
    pairingCandidates: ['drink', 'garlic bread', 'family_pack'],
    tags: ['pizza', 'cheese', 'oven', 'crust'],
    confidence: 0.92,
  },
  {
    test: /coffee|latte|espresso|cold brew|tea/i,
    normalizedItemName: 'coffee_drink',
    foodCategory: 'beverage',
    cuisineHints: ['cafe'],
    servingStyle: 'cup_or_glass',
    pairingCandidates: ['dessert', 'pastry'],
    tags: ['drink', 'coffee', 'cafe'],
    confidence: 0.9,
  },
  {
    test: /dessert|cake|brownie|ice cream|cookie/i,
    normalizedItemName: 'dessert',
    foodCategory: 'dessert',
    cuisineHints: ['desserts'],
    servingStyle: 'plated_or_boxed',
    pairingCandidates: ['coffee', 'bundle'],
    tags: ['dessert', 'sweet', 'plated'],
    confidence: 0.9,
  },
  {
    test: /bowl|ramen|poke|salad/i,
    normalizedItemName: 'bowl',
    foodCategory: 'bowl_meal',
    cuisineHints: ['american'],
    servingStyle: 'bowl',
    pairingCandidates: ['drink', 'side'],
    tags: ['bowl', 'fresh', 'meal'],
    confidence: 0.84,
  },
  {
    test: /burger|sandwich|slider/i,
    normalizedItemName: 'burger',
    foodCategory: 'sandwich',
    cuisineHints: ['american'],
    servingStyle: 'stacked_burger',
    pairingCandidates: ['fries', 'drink', 'combo'],
    tags: ['burger', 'grilled', 'bun'],
    confidence: 0.9,
  },
];

function understandItem(itemDescription = '') {
  const itemName = asString(itemDescription, 'Chef Special');
  const matched = ITEM_PATTERNS.find((row) => row.test.test(itemName));
  if (matched) {
    return {
      itemName,
      normalizedItemName: matched.normalizedItemName,
      foodCategory: matched.foodCategory,
      cuisineHints: matched.cuisineHints,
      servingStyle: matched.servingStyle,
      pairingCandidates: matched.pairingCandidates,
      expectedFoodTags: matched.tags,
      confidence: matched.confidence,
    };
  }

  const token = itemName.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)[0] || 'special';
  return {
    itemName,
    normalizedItemName: token,
    foodCategory: 'mixed_food',
    cuisineHints: [],
    servingStyle: 'plated',
    pairingCandidates: ['drink', 'side'],
    expectedFoodTags: [token, 'food', 'restaurant'],
    confidence: 0.65,
  };
}

module.exports = {
  understandItem,
};
