function tokenise(text) {
  if (!text) return [];
  return text.toLowerCase().split(/[\s,\-\/]+/).filter(t => t.length > 1);
}

const PARTS_KEYWORDS = [
  'seal','gasket','fender','bumper','panel','grille','grill','emblem',
  'badge','trim','molding','moulding','handle','hinge','latch','clip',
  'bracket','mount','filter','pump','valve','hose','pipe','fitting',
  'wire','wiring','harness','switch','relay','fuse','sensor','alternator',
  'starter','distributor','carburetor','carburettor','manifold','exhaust',
  'muffler','header','intake','radiator','thermostat','brake','caliper',
  'rotor','drum','pad','shoe','cylinder','piston','ring','rod','crankshaft',
  'camshaft','timing','chain','belt','pulley','tensioner','transmission',
  'gearbox','differential','axle','driveshaft','suspension','shock','strut',
  'steering','rack','pinion','wheel','rim','tyre','tire','hub','headlight',
  'taillight','mirror','windshield','windscreen','wiper','glass','window',
  'seat','carpet','mat','dash','dashboard','gauge','manual','book',
  'brochure','poster','magazine','yearbook','model','toy','diecast',
  'die-cast','miniature','replica','photo','photograph','picture','print',
  'artwork','painting','part','parts','accessory','accessories','kit',
  'collectible','collectable','danbury','franklin mint','ertl','matchbox',
  'hot wheels','scale','1:18','1:24','1:43','1:64','figurine','ornament',
];

function keywordScore(listingTitle, watchKeywords) {
  const titleTokens = new Set(tokenise(listingTitle));
  const watchTokens = tokenise(watchKeywords);
  if (watchTokens.length === 0) return 0;
  let hits = 0;
  for (const token of watchTokens) {
    const matched = titleTokens.has(token) ||
      [...titleTokens].some(t => t === token);
    if (matched) hits++;
  }
  if (hits / Math.max(watchTokens.length, 1) < 0.8) return 5;
  const ratio = hits / Math.max(watchTokens.length, 1);
  return Math.round(ratio * 50);
}

function partsPenalty(title, watchlistName, watchlistKeywords) {
  const titleLower = (title || '').toLowerCase();
  const nameLower = (watchlistName || '').toLowerCase();
  const kwLower = (watchlistKeywords || '').toLowerCase();
  const hasPart = PARTS_KEYWORDS.some(p => titleLower.includes(p));
  if (!hasPart) return 0;
  const watchlistWantsParts = PARTS_KEYWORDS.some(p =>
    nameLower.includes(p) || kwLower.includes(p)
  );
  if (watchlistWantsParts) return 0;
  return -80;
}

function priceScore(listingPrice, priceMin, priceMax) {
  if (listingPrice == null) return 15;
  const hasMin = priceMin != null;
  const hasMax = priceMax != null;
  if (!hasMin && !hasMax) return 25;
  if (hasMin && listingPrice < priceMin) {
    const ratio = listingPrice / priceMin;
    return ratio > 0.7 ? 20 : ratio > 0.4 ? 10 : 0;
  }
  if (hasMax && listingPrice > priceMax) {
    const ratio = priceMax / listingPrice;
    return ratio > 0.85 ? 15 : ratio > 0.6 ? 5 : 0;
  }
  return 30;
}

function locationScore(listingLocation, watchCountry, watchMode) {
  if (watchMode === 'global') return 20;
  if (!listingLocation || !watchCountry || watchCountry === 'any') return 10;
  const loc = listingLocation.toLowerCase();
  const country = watchCountry.toLowerCase();
  const countryMap = {
    'australia': ['australia', 'au', 'vic', 'nsw', 'qld', 'melbourne', 'sydney'],
    'us': ['usa', 'united states', 'ca', 'ny', 'ma', 'il'],
    'usa': ['usa', 'us', 'united states', 'california', 'texas', 'florida'],
    'uk': ['united kingdom', 'england', 'london', 'britain'],
  };
  const aliases = countryMap[country] || [country];
  const locationMatch = aliases.some(alias => loc.includes(alias));
  return locationMatch ? 20 : 5;
}

function scoreListing(listing, watchlist) {
  const kw = keywordScore(listing.title, watchlist.keywords);
  const pr = priceScore(listing.price, watchlist.price_min, watchlist.price_max);
  const lo = locationScore(listing.location, watchlist.country, watchlist.mode);
  const penalty = partsPenalty(listing.title, watchlist.name, watchlist.keywords);
  const score = Math.max(0, Math.min(100, kw + pr + lo + penalty));
  return {
    score,
    breakdown: { keywords: kw, price: pr, location: lo, penalty }
  };
}

const SCORE_THRESHOLD = 30;
module.exports = { scoreListing, SCORE_THRESHOLD };