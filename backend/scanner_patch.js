function postScanNotifications(wl, newHits, dbGet, dbAll, dbRun) {
  const lifetimeMatches = dbGet('SELECT COUNT(*) as c FROM watch_hits WHERE watchlist_id = ?', [wl.id])?.c || 0;
  const prevMatchCount = wl.last_match_count || 0;
  if (prevMatchCount === 0 && newHits.length > 0) {
    const topHit = newHits[0];
    const listing = dbGet('SELECT listing_url FROM listings WHERE id = ?', [topHit.listing_id]);
    dbRun(`INSERT INTO notifications (user_id, watchlist_id, hit_id, title, message, listing_url, read) SELECT w.user_id, ?, ?, ?, ?, ?, 0 FROM watchlists w WHERE w.id = ?`, [wl.id, topHit.id, 'We found your first result', `for "${wl.name}"`, listing?.listing_url||null, wl.id]);
  }
  if (lifetimeMatches === 0 && newHits.length === 0) {
    const ageMs = Date.now() - new Date(wl.created_at).getTime();
    const lastNotified = wl.last_still_searching_at ? new Date(wl.last_still_searching_at).getTime() : 0;
    if (ageMs > 86400000 && (Date.now() - lastNotified) > 172800000) {
      dbRun(`INSERT INTO notifications (user_id, watchlist_id, title, message, read) SELECT w.user_id, ?, ?, ?, 0 FROM watchlists w WHERE w.id = ?`, [wl.id, 'Still searching', `We are still hunting for "${wl.name}" and will alert you the moment something appears`, wl.id]);
      dbRun(`UPDATE watchlists SET last_still_searching_at = datetime('now') WHERE id = ?`, [wl.id]);
    }
  }
  dbRun(`UPDATE watchlists SET last_match_count = ?, last_scanned = datetime('now') WHERE id = ?`, [lifetimeMatches, wl.id]);
}
module.exports = { postScanNotifications };
