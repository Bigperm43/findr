const cron = require('node-cron');
const { dbGet, dbAll, dbRun } = require('./db');
const { groupIntoBatches } = require('./batcher');
const { scoreListing, SCORE_THRESHOLD } = require('./scorer');
const searchAdapter = require('./serp');
const { postScanNotifications } = require('./scanner_patch');

const CACHE_TTL_HOURS = 0.25;
const MAX_QUERIES_PER_RUN = parseInt(process.env.MAX_QUERIES_PER_RUN || '20');

let isScanning = false;
let lastStatus = {
  scannedAt: null, queriesRun: 0, cacheHits: 0,
  newHits: 0, watchesProcessed: 0, isScanning: false,
};

function getCachedResult(cacheKey) {
  const row = dbGet("SELECT * FROM query_cache WHERE query_key = ? AND expires_at > datetime('now')", [cacheKey]);
  if (!row) return null;
  try { return JSON.parse(row.raw_results); } catch { return null; }
}

function setCachedResult(cacheKey, results) {
  const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 3600 * 1000).toISOString();
  dbRun("DELETE FROM query_cache WHERE expires_at < datetime('now')", []);
  dbRun(`INSERT OR REPLACE INTO query_cache (query_key, raw_results, result_count, expires_at) VALUES (?, ?, ?, ?)`,
    [cacheKey, JSON.stringify(results), results.length, expiresAt]);
}

function clearCache(cacheKey) {
  dbRun("DELETE FROM query_cache WHERE query_key = ?", [cacheKey]);
}

function upsertListing(item) {
  const existing = dbGet('SELECT id FROM listings WHERE source_id = ?', [item.sourceId]);
  if (existing) {
    dbRun("UPDATE listings SET last_seen = datetime('now'), price = ? WHERE source_id = ?", [item.price, item.sourceId]);
    return existing.id;
  }
  const result = dbRun(
    `INSERT INTO listings (source_id, title, price, currency, location, image_url, listing_url, condition, source, raw_data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [item.sourceId, item.title, item.price, item.currency || 'USD',
     item.location, item.imageUrl, item.listingUrl, item.condition,
     item.source || 'unknown', JSON.stringify(item)]
  );
  return result.lastInsertRowid;
}

function createNotification(userId, watchlistId, hitId, listing, watchlistName, score) {
  const priceStr = listing.price ? `$${listing.price.toLocaleString()}` : '';
  const title = `New match: ${listing.title}`;
  const message = `${priceStr}${priceStr ? ' · ' : ''}${listing.source || ''} · Found for "${watchlistName}"`;
  dbRun(
    `INSERT INTO notifications (user_id, watchlist_id, hit_id, title, message, listing_url, source, price, currency, score)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, watchlistId, hitId, title, message, listing.listingUrl, listing.source, listing.price, listing.currency, score]
  );
  dbRun('UPDATE watch_hits SET notified = 1 WHERE id = ?', [hitId]);
  console.log(`[notif] New notification for user ${userId}: "${listing.title}"`);
}

function getNegatives(watchlistId) {
  return dbAll('SELECT pattern FROM watchlist_negatives WHERE watchlist_id = ?', [watchlistId]).map(n => n.pattern);
}

function filterByNegatives(listings, negatives) {
  if (!negatives.length) return listings;
  return listings.filter(item => {
    const t = (item.title || '').toLowerCase();
    return !negatives.some(p => t.includes(p));
  });
}

async function runBatchScan() {
  if (isScanning) { console.log('[scanner] Already running, skipping.'); return; }
  isScanning = true;
  const startTime = Date.now();
  const batchId = `batch-${Date.now()}`;
  console.log(`\n[scanner] ===== BATCH SCAN START ${new Date().toLocaleTimeString()} =====`);

  let queriesRun = 0, cacheHits = 0, listingsFound = 0, newHits = 0, watchesProcessed = 0;

  try {
    const watchlists = dbAll("SELECT * FROM watchlists WHERE status = 'active'", []);
    if (watchlists.length === 0) {
      console.log('[scanner] No active watchlists.');
      isScanning = false;
      return;
    }

    console.log(`[scanner] ${watchlists.length} active watchlist(s)`);
    const batches = groupIntoBatches(watchlists);
    console.log(`[scanner] Grouped into ${batches.length} query batch(es)`);

    const watchNewHits = {};

    for (const batch of batches) {
      if (queriesRun >= MAX_QUERIES_PER_RUN) break;

      let listings = getCachedResult(batch.cacheKey);
      if (listings) {
        console.log(`[scanner] CACHE HIT: "${batch.query}" (${listings.length} results)`);
        cacheHits++;
      } else {
        console.log(`[scanner] FRESH SEARCH: "${batch.query}" | ${batch.country} | ${batch.mode}`);
        try {
          listings = await searchAdapter.search({
            query: batch.query, priceMin: batch.priceMin, priceMax: batch.priceMax,
            country: batch.country, mode: batch.mode, limit: 20,
          });
          setCachedResult(batch.cacheKey, listings);
          queriesRun++;
          console.log(`[scanner] Got ${listings.length} fresh results -> cached 15min`);
        } catch (err) {
          console.error(`[scanner] Search failed: ${err.message}`);
          listings = [];
        }
      }

      listingsFound += listings.length;
      const watchesInBatch = watchlists.filter(w => batch.watchlistIds.includes(w.id));

      for (const watch of watchesInBatch) {
        if (!watchNewHits[watch.id]) watchNewHits[watch.id] = [];
        const negatives = getNegatives(watch.id);
        const filtered = filterByNegatives(listings, negatives);

        for (const item of filtered) {
          const listingId = upsertListing(item);
          if (!listingId) continue;
          const { score, breakdown } = scoreListing(item, watch);
          if (score < SCORE_THRESHOLD) continue;
          const existing = dbGet('SELECT id FROM watch_hits WHERE watchlist_id = ? AND listing_id = ?', [watch.id, listingId]);
          if (!existing) {
            const hitResult = dbRun(
              `INSERT INTO watch_hits (watchlist_id, listing_id, score, score_breakdown) VALUES (?, ?, ?, ?)`,
              [watch.id, listingId, score, JSON.stringify(breakdown)]
            );
            newHits++;
            watchNewHits[watch.id].push({ id: hitResult.lastInsertRowid, listing_id: listingId });
            createNotification(watch.user_id, watch.id, hitResult.lastInsertRowid, item, watch.name, score);
          }
        }
      }

      watchesProcessed += watchesInBatch.length;
      await new Promise(r => setTimeout(r, 300));
    }

    for (const watch of watchlists) {
      postScanNotifications(watch, watchNewHits[watch.id] || [], dbGet, dbAll, dbRun);
    }

  } catch (err) {
    console.error('[scanner] Batch scan error:', err.message);
  }

  const duration = Date.now() - startTime;
  dbRun(
    `INSERT INTO scan_log (batch_id, queries_run, cache_hits, listings_found, new_hits, watches_processed, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [batchId, queriesRun, cacheHits, listingsFound, newHits, watchesProcessed, duration]
  );

  lastStatus = { scannedAt: new Date().toISOString(), queriesRun, cacheHits, listingsFound, newHits, watchesProcessed, duration, isScanning: false };
  console.log(`[scanner] DONE in ${duration}ms - ${queriesRun} queries, ${cacheHits} cache hits, ${newHits} new hits`);
  console.log(`[scanner] ===== BATCH SCAN END =====\n`);
  isScanning = false;
  return lastStatus;
}

async function scanOne(watchlistId) {
  const wl = dbGet('SELECT * FROM watchlists WHERE id = ?', [watchlistId]);
  if (!wl) throw new Error('Watchlist not found');
  console.log(`[scanner] Manual scan for watchlist: "${wl.name}" - bypassing cache`);
  const batches = groupIntoBatches([wl]);
  const negatives = getNegatives(wl.id);
  let newHitsList = [];

  for (const batch of batches) {
    clearCache(batch.cacheKey);
    let listings = [];
    try {
      listings = await searchAdapter.search({
        query: batch.query, priceMin: batch.priceMin, priceMax: batch.priceMax,
        country: batch.country, mode: batch.mode, limit: 20,
      });
      setCachedResult(batch.cacheKey, listings);
      console.log(`[scanner] Got ${listings.length} fresh results`);
    } catch (err) {
      console.error(`[scanner] Search failed: ${err.message}`);
    }

    const filtered = filterByNegatives(listings, negatives);
    for (const item of filtered) {
      const listingId = upsertListing(item);
      if (!listingId) continue;
      const { score, breakdown } = scoreListing(item, wl);
      if (score < SCORE_THRESHOLD) continue;
      const existing = dbGet('SELECT id FROM watch_hits WHERE watchlist_id = ? AND listing_id = ?', [wl.id, listingId]);
      if (!existing) {
        const hitResult = dbRun(
          `INSERT INTO watch_hits (watchlist_id, listing_id, score, score_breakdown) VALUES (?, ?, ?, ?)`,
          [wl.id, listingId, score, JSON.stringify(breakdown)]
        );
        newHitsList.push({ id: hitResult.lastInsertRowid, listing_id: listingId });
        createNotification(wl.user_id, wl.id, hitResult.lastInsertRowid, item, wl.name, score);
      }
    }
  }

  postScanNotifications(wl, newHitsList, dbGet, dbAll, dbRun);
  console.log(`[scanner] Manual scan complete - ${newHitsList.length} new hits`);
  return { newHits: newHitsList.length };
}

function startScheduler() {
  const schedule = process.env.SCAN_CRON || '*/5 * * * *';
  console.log(`[scanner] Scheduler: ${schedule} (cache TTL: ${CACHE_TTL_HOURS * 60} minutes)`);
  cron.schedule(schedule, () => runBatchScan());
  setTimeout(() => runBatchScan(), 4000);
}

function getLastStatus() { return { ...lastStatus, isScanning }; }

module.exports = { runBatchScan, scanOne, startScheduler, getLastStatus };
