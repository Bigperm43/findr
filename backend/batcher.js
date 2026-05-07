/**
 * batcher.js — Query Batching Engine
 *
 * Core principle: "1 search → many users benefit"
 *
 * Takes all active watchlists and groups them into
 * the minimum number of unique queries needed to cover them all.
 * Similar watches share results — no duplicate API calls.
 */

/**
 * Normalise a keyword string for comparison.
 * Lowercases, splits, sorts tokens so order doesn't matter.
 */
function normaliseKeywords(keywords) {
  return keywords
    .toLowerCase()
    .split(/[\s,]+/)
    .map(k => k.trim())
    .filter(k => k.length > 1)
    .sort()
    .join(' ');
}

/**
 * Generate a cache key for a query + filters combo.
 * Same key = same cached result.
 */
function makeCacheKey(query, priceMin, priceMax, country) {
  const p1 = priceMin ? Math.floor(priceMin / 1000) * 1000 : 0;   // bucket to nearest $1k
  const p2 = priceMax ? Math.ceil(priceMax / 1000) * 1000 : 99999;
  const loc = country && country !== 'any' ? country.toLowerCase() : 'global';
  return `${normaliseKeywords(query)}|${p1}-${p2}|${loc}`;
}

/**
 * Score how similar two watchlists are (0–1).
 * Used to decide whether to group them into one query.
 */
function similarityScore(a, b) {
  const aTokens = new Set(normaliseKeywords(a.keywords).split(' '));
  const bTokens = new Set(normaliseKeywords(b.keywords).split(' '));
  const intersection = [...aTokens].filter(t => bTokens.has(t)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  if (union === 0) return 0;
  return intersection / union;  // Jaccard similarity
}

/**
 * Group watchlists into batches.
 * Watchlists with >60% keyword overlap share a query.
 * Returns array of batch objects:
 *   { cacheKey, query, priceMin, priceMax, country, watchlistIds }
 */
function groupIntoBatches(watchlists, SIMILARITY_THRESHOLD = 0.6) {
  const batches = [];

  for (const wl of watchlists) {
    // Try to find an existing batch this watchlist can join
    let joined = false;
    for (const batch of batches) {
      const rep = watchlists.find(w => w.id === batch.watchlistIds[0]);
      if (!rep) continue;

      // Must be same mode (local vs global)
      if (rep.mode !== wl.mode) continue;

      // For local mode, must be same country
      if (wl.mode === 'local' && rep.country !== wl.country) continue;

      // Check keyword similarity
      const sim = similarityScore(rep, wl);
      if (sim >= SIMILARITY_THRESHOLD) {
        batch.watchlistIds.push(wl.id);
        // Widen price range to cover all watches in batch
        if (wl.price_min != null)
          batch.priceMin = batch.priceMin != null ? Math.min(batch.priceMin, wl.price_min) : wl.price_min;
        if (wl.price_max != null)
          batch.priceMax = batch.priceMax != null ? Math.max(batch.priceMax, wl.price_max) : wl.price_max;
        joined = true;
        break;
      }
    }

    if (!joined) {
      // Create new batch for this watchlist
      const country = wl.mode === 'local' ? (wl.country || 'any') : 'global';
      const batch = {
        query: wl.keywords,
        priceMin: wl.price_min || null,
        priceMax: wl.price_max || null,
        country,
        mode: wl.mode,
        watchlistIds: [wl.id],
      };
      batch.cacheKey = makeCacheKey(batch.query, batch.priceMin, batch.priceMax, country);
      batches.push(batch);
    }
  }

  // Recompute cache keys after price ranges were widened
  for (const batch of batches) {
    batch.cacheKey = makeCacheKey(batch.query, batch.priceMin, batch.priceMax, batch.country);
  }

  return batches;
}

module.exports = { groupIntoBatches, makeCacheKey, normaliseKeywords };
