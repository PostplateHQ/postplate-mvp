function ensureDistinctSuggestions(suggestions = []) {
  const usedIntents = new Set();
  const usedCompositions = new Set();
  return suggestions
    .filter((row) => {
      const intentKey = String(row.visualIntent || '');
      const compositionKey = String(row.compositionType || '');
      const isIntentDuplicate = usedIntents.has(intentKey);
      const isCompositionDuplicate = usedCompositions.has(compositionKey);
      if (isIntentDuplicate && isCompositionDuplicate) return false;
      usedIntents.add(intentKey);
      usedCompositions.add(compositionKey);
      return true;
    })
    .slice(0, 3);
}

module.exports = {
  ensureDistinctSuggestions,
};
