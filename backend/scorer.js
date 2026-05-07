/**
 * scorer.js — Lightweight relevance scoring (no AI)
 *
 * Scores a listing against a watchlist using:
 *   - Keyword match (50 pts)
 *   - Price fit (30 pts)
 *   - Location match (20 pts)
 *
 * Returns score 0–100 + breakdown object.
 */

function tokenise(text) {
  if (!text) return [];
  return text.toLowerCase().split(/[\s,\-\/]+/).filter(t => t.length > 1);
}

/**
 * Keyword score (0–50)
 * Counts how many watch keywords appear in the listing title.
 */
function keywordScore(listingTitle, watchKeywords) {
  const titleTokens = new Set(tokenise(listingTitle));
  const watchTokens = tokenise(watchKeywords);
  if (watchTokens.length === 0) return 0;

  let hits = 0;
  for (const token of watchTokens) {
    // Exact token match OR listing title contains token as substring
    const matched = titleTokens.has(token) ||
      [...titleTokens].some(t => t.includes(token) || token.includes(t));
    if (matched) hits++;
  }

  return Math.round((hits / watchTokens.length) * 50);
}

/**
 * Price score (0–30)
 * Full score if price is in range. Partial if close. Zero if way off.
 */
function priceScore(listingPrice, priceMin, priceMax) {
  if (listingPrice == null) return 15; // unknown price — neutral
  const hasMin = priceMin != null;
  const hasMax = priceMax != null;

  if (!hasMin && !hasMax) return 25; // no filter = good match

  if (hasMin && listingPrice < priceMin) {
    // Below min — could be a deal or wrong item
    const ratio = listingPrice / priceMin;
    return ratio > 0.7 ? 20 : ratio > 0.4 ? 10 : 0;
  }
  if (hasMax && listingPrice > priceMax) {
    // Over budget
    const ratio = priceMax / listingPrice;
    return ratio > 0.85 ? 15 : ratio > 0.6 ? 5 : 0;
  }
  // In range
  return 30;
}

/**
 * Location score (0–20)
 */
function locationScore(listingLocation, watchCountry, watchMode) {
  if (watchMode === 'global') return 20; // global = all locations welcome
  if (!listingLocation || !watchCountry || watchCountry === 'any') return 10;

  const loc = listingLocation.toLowerCase();
  const country = watchCountry.toLowerCase();

  // Country code / name matching
  const countryMap = {
    'au': ['australia', 'vic', 'nsw', 'qld', 'wa', 'sa', 'tas', 'act', 'nt',
            'melbourne', 'sydney', 'brisbane', 'perth', 'adelaide'],
    'australia': ['australia', 'au', 'vic', 'nsw', 'qld', 'melbourne', 'sydney'],
    'us': ['usa', 'united states', 'ca', 'tx', 'fl', 'ny', 'wa', 'il'],
    'usa': ['usa', 'us', 'united states', 'california', 'texas', 'florida'],
    'uk': ['united kingdom', 'england', 'london', 'britain'],
  };

  const aliases = countryMap[country] || [country];
  const locationMatch = aliases.some(alias => loc.includes(alias));
  return locationMatch ? 20 : 5;
}

/**
 * Main scoring function.
 * Returns { score: 0-100, breakdown: { keywords, price, location } }
 */
function scoreListing(listing, watchlist) {
  const kw = keywordScore(listing.title, watchlist.keywords);
  const pr = priceScore(listing.price, watchlist.price_min, watchlist.price_max);
  const lo = locationScore(listing.location, watchlist.country, watchlist.mode);

  const score = kw + pr + lo;
  return {
    score: Math.min(100, score),
    breakdown: { keywords: kw, price: pr, location: lo }
  };
}

// Minimum score to store a hit (filters out clearly irrelevant results)
const SCORE_THRESHOLD = 30;

module.exports = { scoreListing, SCORE_THRESHOLD };
