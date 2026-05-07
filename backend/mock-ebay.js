/**
 * mock-ebay.js — simulates a search API response
 * Drop-in: same signature as real search adapters
 * Returns realistic listings based on keywords
 */

const CONDITIONS = ['NEW', 'USED', 'LIKE_NEW', 'GOOD'];
const LOCATIONS = [
  'Los Angeles, CA', 'Austin, TX', 'Miami, FL', 'Chicago, IL',
  'New York, NY', 'Seattle, WA', 'Denver, CO', 'Nashville, TN',
  'Melbourne, VIC', 'Sydney, NSW', 'Brisbane, QLD', 'Perth, WA',
  'London, UK', 'Toronto, ON', 'Hamburg, Germany', 'Tokyo, Japan',
];
const SOURCES = ['eBay', 'Gumtree', 'AutoTrader', 'Craigslist', 'CarSales', 'Marketplace'];

const TITLE_TEMPLATES = [
  kw => `${kw} - Excellent Condition Must See`,
  kw => `${kw} | Low Miles Clean History`,
  kw => `RARE ${kw} - Original No Reserve`,
  kw => `${kw} - Full Service History Priced to Sell`,
  kw => `${kw} Project Needs Work Make Offer`,
  kw => `${kw} - Numbers Matching Documented`,
  kw => `${kw} - Fully Restored Show Quality`,
  kw => `${kw} - As-Is Barn Find`,
  kw => `${kw} - Recent Import Clean Title`,
  kw => `${kw} - Solid Driver No Rust`,
  kw => `${kw} - Collector Grade Investment`,
  kw => `${kw} Daily Driver Runs Perfect`,
  kw => `${kw} - All Original Factory Correct`,
  kw => `${kw} - Modified Custom Build`,
  kw => `${kw} Low Reserve Auction Ends Soon`,
];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function search({ query, priceMin, priceMax, limit = 20 }) {
  // Simulate network latency
  await new Promise(r => setTimeout(r, rand(200, 600)));

  const terms = query.split(/[\s,]+/).filter(Boolean);
  const primaryKw = terms.slice(0, 3).join(' ');
  const count = rand(6, Math.min(limit, 16));
  const results = [];

  for (let i = 0; i < count; i++) {
    const min = priceMin ?? 100;
    const max = priceMax ?? 80000;
    const price = Math.round((min + Math.random() * (max - min)) / 50) * 50;
    const titleFn = pick(TITLE_TEMPLATES);
    const source = pick(SOURCES);
    const itemId = `MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    results.push({
      sourceId: itemId,
      title: titleFn(primaryKw),
      price,
      currency: 'USD',
      location: pick(LOCATIONS),
      imageUrl: null,
      listingUrl: `https://www.ebay.com/itm/${rand(100000000, 999999999)}`,
      condition: pick(CONDITIONS),
      source,
      endTime: new Date(Date.now() + rand(1, 14) * 86400000).toISOString(),
    });
  }
  return results;
}

module.exports = { search };
