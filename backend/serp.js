const axios = require("axios");

const COUNTRY_CONFIG = {
  australia: {
    gl: "au", hl: "en", google_domain: "google.com.au",
    sites: "gumtree.com.au OR domain.com.au OR realestate.com.au OR ebay.com.au OR carsales.com.au OR tradingpost.com.au OR facebook.com/marketplace OR caravan.com.au OR bikesales.com.au"
  },
  usa: {
    gl: "us", hl: "en", google_domain: "google.com",
    sites: "craigslist.org OR ebay.com OR autotrader.com OR cars.com OR zillow.com OR realtor.com OR facebook.com/marketplace OR offerup.com OR mercari.com"
  },
  uk: {
    gl: "gb", hl: "en", google_domain: "google.co.uk",
    sites: "gumtree.com OR ebay.co.uk OR autotrader.co.uk OR rightmove.co.uk OR zoopla.co.uk OR facebook.com/marketplace OR preloved.co.uk"
  },
  canada: {
    gl: "ca", hl: "en", google_domain: "google.ca",
    sites: "kijiji.ca OR ebay.ca OR autotrader.ca OR realtor.ca OR facebook.com/marketplace"
  },
  "new zealand": {
    gl: "nz", hl: "en", google_domain: "google.co.nz",
    sites: "trademe.co.nz OR ebay.com.au OR gumtree.com.au OR facebook.com/marketplace"
  },
  germany: {
    gl: "de", hl: "de", google_domain: "google.de",
    sites: "ebay-kleinanzeigen.de OR ebay.de OR mobile.de OR immobilienscout24.de OR facebook.com/marketplace"
  },
  france: {
    gl: "fr", hl: "fr", google_domain: "google.fr",
    sites: "leboncoin.fr OR ebay.fr OR lacentrale.fr OR facebook.com/marketplace"
  },
  italy: {
    gl: "it", hl: "it", google_domain: "google.it",
    sites: "subito.it OR ebay.it OR autoscout24.it OR facebook.com/marketplace"
  },
  spain: {
    gl: "es", hl: "es", google_domain: "google.es",
    sites: "wallapop.com OR milanuncios.com OR ebay.es OR facebook.com/marketplace"
  },
  japan: {
    gl: "jp", hl: "ja", google_domain: "google.co.jp",
    sites: "mercari.com OR yahoo.co.jp OR ebay.com OR facebook.com/marketplace"
  },
  russia: {
    gl: "ru", hl: "ru", google_domain: "google.ru",
    sites: "avito.ru OR auto.ru OR ebay.com OR facebook.com/marketplace"
  },
  netherlands: {
    gl: "nl", hl: "nl", google_domain: "google.nl",
    sites: "marktplaats.nl OR ebay.nl OR facebook.com/marketplace"
  },
  sweden: {
    gl: "se", hl: "sv", google_domain: "google.se",
    sites: "blocket.se OR ebay.com OR facebook.com/marketplace"
  },
  norway: {
    gl: "no", hl: "no", google_domain: "google.no",
    sites: "finn.no OR ebay.com OR facebook.com/marketplace"
  },
  denmark: {
    gl: "dk", hl: "da", google_domain: "google.dk",
    sites: "dba.dk OR ebay.com OR facebook.com/marketplace"
  },
  singapore: {
    gl: "sg", hl: "en", google_domain: "google.com.sg",
    sites: "carousell.sg OR ebay.com OR facebook.com/marketplace"
  },
  india: {
    gl: "in", hl: "en", google_domain: "google.co.in",
    sites: "olx.in OR quikr.com OR ebay.in OR facebook.com/marketplace"
  },
  brazil: {
    gl: "br", hl: "pt", google_domain: "google.com.br",
    sites: "olx.com.br OR mercadolivre.com.br OR facebook.com/marketplace"
  },
  mexico: {
    gl: "mx", hl: "es", google_domain: "google.com.mx",
    sites: "mercadolibre.com.mx OR segundamano.mx OR facebook.com/marketplace"
  },
  uae: {
    gl: "ae", hl: "en", google_domain: "google.ae",
    sites: "dubizzle.com OR opensooq.com OR ebay.com OR facebook.com/marketplace"
  },
  "south africa": {
    gl: "za", hl: "en", google_domain: "google.co.za",
    sites: "gumtree.co.za OR autotrader.co.za OR property24.com OR facebook.com/marketplace"
  },
  global: { gl: "us", hl: "en", google_domain: "google.com", sites: null },
  any: { gl: "us", hl: "en", google_domain: "google.com", sites: null },
};

const EXCLUDE_SITES = [
  "youtube.com", "instagram.com", "tiktok.com",
  "twitter.com", "reddit.com", "pinterest.com", "wikipedia.org",
  "linkedin.com", "yelp.com"
];

const GLOBAL_COUNTRIES = ["australia", "usa", "uk", "canada", "new zealand"];

// Source favicon map for clean fallback images
const SOURCE_ICONS = {
  "ebay.com": "https://ir.ebaystatic.com/pictures/aw/pics/favicon.ico",
  "ebay.com.au": "https://ir.ebaystatic.com/pictures/aw/pics/favicon.ico",
  "ebay.co.uk": "https://ir.ebaystatic.com/pictures/aw/pics/favicon.ico",
  "gumtree.com.au": "https://www.gumtree.com.au/favicon.ico",
  "gumtree.com": "https://www.gumtree.com/favicon.ico",
  "facebook.com": "https://www.facebook.com/favicon.ico",
  "carsales.com.au": "https://www.carsales.com.au/favicon.ico",
  "trademe.co.nz": "https://www.trademe.co.nz/favicon.ico",
  "kijiji.ca": "https://www.kijiji.ca/favicon.ico",
  "craigslist.org": "https://www.craigslist.org/favicon.ico",
};

function extractDomain(url) {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return ""; }
}

function getFallbackImage(url) {
  const domain = extractDomain(url);
  // Check known sources first
  for (const [key, icon] of Object.entries(SOURCE_ICONS)) {
    if (domain.includes(key)) return icon;
  }
  // Generic Google favicon fallback
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

async function search({ query, priceMin, priceMax, country = "any", mode = "global" }) {
  if (!process.env.SERP_API_KEY) throw new Error("SERP_API_KEY not set");

  const countryKey = (country || "any").toLowerCase().trim();
  const isGlobal = countryKey === "global" || countryKey === "any" || mode === "global";

  if (isGlobal) {
    console.log("[serp] Global search — querying " + GLOBAL_COUNTRIES.length + " countries");
    const allResults = [];

    for (const c of GLOBAL_COUNTRIES) {
      try {
        const results = await searchSingle({ query, priceMin, priceMax, country: c, mode: "local" });
        allResults.push(...results);
      } catch (err) {
        console.error("[serp] Global search failed for " + c + ": " + err.message);
      }
    }

    // Deduplicate by URL
    const seen = new Set();
    const deduped = allResults.filter(r => {
      if (seen.has(r.listingUrl)) return false;
      seen.add(r.listingUrl);
      return true;
    });

    console.log("[serp] Global search complete — " + deduped.length + " unique results across all countries");
    return deduped;
  }

  return searchSingle({ query, priceMin, priceMax, country: countryKey, mode });
}

async function searchSingle({ query, priceMin, priceMax, country = "any", mode = "local" }) {
  const countryKey = (country || "any").toLowerCase().trim();
  const config = COUNTRY_CONFIG[countryKey] || COUNTRY_CONFIG["any"];

  let fullQuery = query + " for sale";

  if (mode === "local" && countryKey !== "any" && countryKey !== "global") {
    fullQuery += " " + countryKey;
  }

  if (priceMin && priceMax) fullQuery += ` $${priceMin}-$${priceMax}`;
  else if (priceMin) fullQuery += ` over $${priceMin}`;
  else if (priceMax) fullQuery += ` under $${priceMax}`;

  for (const site of EXCLUDE_SITES) {
    fullQuery += ` -site:${site}`;
  }

  if (mode === "local" && config.sites) {
    fullQuery += ` (site:${config.sites.replace(/ OR /g, " OR site:")})`;
  }

  console.log("[serp] Query: " + fullQuery);
  console.log("[serp] Country: " + countryKey + " | Mode: " + mode);

  const params = {
    engine: "google",
    q: fullQuery,
    api_key: process.env.SERP_API_KEY,
    num: 10,
    gl: config.gl,
    hl: config.hl,
    google_domain: config.google_domain,
  };

  try {
    const r = await axios.get("https://serpapi.com/search", { params });
    const items = r.data.organic_results || [];
    console.log("[serp] Got " + items.length + " results from " + countryKey);

    return items.map((item, i) => {
      // Try every possible image field SerpAPI might return
      const imageUrl =
        item.thumbnail ||
        item.rich_snippet?.top?.extensions?.[0] ||
        item.pagemap?.cse_image?.[0]?.src ||
        item.pagemap?.cse_thumbnail?.[0]?.src ||
        item.pagemap?.product?.[0]?.image ||
        getFallbackImage(item.link);

      return {
        sourceId: "serp-" + i + "-" + Date.now() + Math.random(),
        title: item.title || "Unknown",
        price: extractPrice(item.snippet || item.title),
        currency: countryKey === "australia" ? "AUD" : countryKey === "uk" ? "GBP" : "USD",
        location: item.displayed_link || null,
        imageUrl,
        listingUrl: item.link,
        condition: null,
        source: extractSource(item.link),
        snippet: item.snippet || null,
      };
    });
  } catch (err) {
    console.error("[serp] Error for " + countryKey + ": " + err.message);
    throw err;
  }
}

function extractPrice(text) {
  if (!text) return null;
  const m = text.match(/[\$\£\€][\d,]+(\.\d{2})?/);
  return m ? parseFloat(m[0].replace(/[^0-9.]/g, "")) : null;
}

function extractSource(url) {
  if (!url) return "Web";
  try {
    const host = new URL(url).hostname.replace("www.", "");
    if (host.includes("ebay")) return "eBay";
    if (host.includes("gumtree")) return "Gumtree";
    if (host.includes("facebook")) return "Facebook Marketplace";
    if (host.includes("craigslist")) return "Craigslist";
    if (host.includes("carsales")) return "CarSales";
    if (host.includes("autotrader")) return "AutoTrader";
    if (host.includes("domain.com")) return "Domain";
    if (host.includes("realestate.com")) return "RealEstate.com.au";
    if (host.includes("trademe")) return "TradeMe";
    if (host.includes("kijiji")) return "Kijiji";
    if (host.includes("zillow")) return "Zillow";
    if (host.includes("rightmove")) return "Rightmove";
    if (host.includes("tradingpost")) return "Trading Post";
    if (host.includes("avito")) return "Avito";
    if (host.includes("leboncoin")) return "Le Bon Coin";
    if (host.includes("marktplaats")) return "Marktplaats";
    if (host.includes("blocket")) return "Blocket";
    if (host.includes("finn.no")) return "Finn.no";
    if (host.includes("mercari")) return "Mercari";
    if (host.includes("carousell")) return "Carousell";
    if (host.includes("dubizzle")) return "Dubizzle";
    if (host.includes("olx")) return "OLX";
    if (host.includes("wallapop")) return "Wallapop";
    if (host.includes("subito")) return "Subito";
    if (host.includes("bikesales")) return "Bikesales";
    if (host.includes("caravan")) return "Caravan";
    return host;
  } catch { return "Web"; }
}

module.exports = { search, COUNTRY_CONFIG };