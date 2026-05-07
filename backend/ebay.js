const axios = require('axios');

// eBay Browse API v1 - uses OAuth Client Credentials
// Docs: https://developer.ebay.com/api-docs/buy/browse/overview.html

const EBAY_BASE_URL = 'https://api.ebay.com';
const EBAY_SANDBOX_URL = 'https://api.sandbox.ebay.com';

let tokenCache = null;

/**
 * Get eBay OAuth token using Client Credentials flow.
 * Token is cached until expiry.
 */
async function getEbayToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const useSandbox = process.env.EBAY_SANDBOX === 'true';

  if (!clientId || !clientSecret) {
    throw new Error('EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set in .env');
  }

  const baseUrl = useSandbox ? EBAY_SANDBOX_URL : EBAY_BASE_URL;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await axios.post(
    `${baseUrl}/identity/v1/oauth2/token`,
    'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    }
  );

  const { access_token, expires_in } = response.data;
  tokenCache = {
    token: access_token,
    expiresAt: Date.now() + (expires_in - 60) * 1000 // refresh 60s early
  };

  return access_token;
}

/**
 * Search eBay listings using Browse API.
 * @param {object} params
 * @param {string} params.keywords  - search query string
 * @param {number} [params.priceMin] - minimum price filter
 * @param {number} [params.priceMax] - maximum price filter
 * @param {number} [params.limit=50] - max results per call (max 200)
 * @returns {Array} array of normalised listing objects
 */
async function searchEbay({ keywords, priceMin, priceMax, limit = 50 }) {
  const token = await getEbayToken();
  const useSandbox = process.env.EBAY_SANDBOX === 'true';
  const baseUrl = useSandbox ? EBAY_SANDBOX_URL : EBAY_BASE_URL;

  // Build filter string
  const filters = [];
  if (priceMin != null || priceMax != null) {
    const min = priceMin != null ? priceMin : 0;
    const max = priceMax != null ? priceMax : 999999999;
    filters.push(`price:[${min}..${max}]`);
    filters.push('priceCurrency:USD');
  }

  const params = {
    q: keywords,
    limit: Math.min(limit, 200),
    ...(filters.length > 0 && { filter: filters.join(',') }),
  };

  const response = await axios.get(`${baseUrl}/buy/browse/v1/item_summary/search`, {
    params,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
    }
  });

  const items = response.data.itemSummaries || [];

  return items.map(item => ({
    ebayItemId: item.itemId,
    title: item.title,
    price: item.price ? parseFloat(item.price.value) : null,
    currency: item.price ? item.price.currency : 'USD',
    location: item.itemLocation
      ? [item.itemLocation.city, item.itemLocation.stateOrProvince, item.itemLocation.country]
          .filter(Boolean).join(', ')
      : null,
    imageUrl: item.image ? item.image.imageUrl : null,
    listingUrl: item.itemWebUrl,
    condition: item.condition || null,
    endTime: item.itemEndDate || null,
  }));
}

/**
 * Keyword filter — checks if a listing title contains enough of the search keywords.
 * Uses a simple token overlap strategy: at least 1 keyword must appear.
 */
function passesKeywordFilter(title, keywords) {
  if (!title || !keywords) return false;
  const titleLower = title.toLowerCase();
  const terms = keywords.toLowerCase().split(/[\s,]+/).filter(k => k.length > 2);
  return terms.some(term => titleLower.includes(term));
}

/**
 * Price filter — checks listing price is within watchlist budget range.
 */
function passesPriceFilter(price, priceMin, priceMax) {
  if (price == null) return true; // allow if price unknown
  if (priceMin != null && price < priceMin) return false;
  if (priceMax != null && price > priceMax) return false;
  return true;
}

module.exports = { searchEbay, passesKeywordFilter, passesPriceFilter };
