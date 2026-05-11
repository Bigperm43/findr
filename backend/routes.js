const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbGet, dbAll, dbRun } = require('./db');
const { scanOne, runBatchScan, getLastStatus } = require('./scanner');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'middlemen-dev-secret';

const TIER_LIMITS = {
  free:       { watchlists: 3 },
  hunter:     { watchlists: 15 },
  predator:   { watchlists: 50 },
  pro:        { watchlists: 150 },
  enterprise: { watchlists: 500 },
};

function sanitizeKeywords(keywords) {
  if (typeof keywords === 'string') return keywords;
  if (Array.isArray(keywords)) return keywords.join(' ');
  if (keywords && typeof keywords === 'object') return Object.values(keywords).join(' ');
  return String(keywords || '');
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch { return res.status(401).json({ error: 'Invalid token' }); }
}

router.post('/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const existing = dbGet('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' });
  const password_hash = await bcrypt.hash(password, 10);
  const result = dbRun('INSERT INTO users (email, password_hash, tier) VALUES (?, ?, ?)', [email.toLowerCase().trim(), password_hash, 'free']);
  const user = dbGet('SELECT id, email, tier FROM users WHERE id = ?', [result.lastInsertRowid]);
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id: user.id, email: user.email, tier: user.tier } });
});

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, tier: user.tier } });
});

router.get('/auth/me', requireAuth, (req, res) => {
  res.json(dbGet('SELECT id, email, tier, created_at FROM users WHERE id = ?', [req.userId]));
});

router.get('/watchlists', requireAuth, (req, res) => {
  const watchlists = dbAll(`SELECT w.*, (SELECT COUNT(*) FROM watch_hits h WHERE h.watchlist_id = w.id) as match_count, (SELECT COUNT(*) FROM watch_hits h WHERE h.watchlist_id = w.id AND h.seen = 0 AND h.feedback IS NULL) as unseen_count FROM watchlists w WHERE w.user_id = ? ORDER BY w.created_at DESC`, [req.userId]);
  res.json(watchlists);
});

router.post('/watchlists', requireAuth, (req, res) => {
  const { name, description, keywords, price_min, price_max, country, mode } = req.body;
  if (!name || !keywords) return res.status(400).json({ error: 'Name and keywords required' });
  const user = dbGet('SELECT tier FROM users WHERE id = ?', [req.userId]);
  const tier = user?.tier || 'free';
  const limit = TIER_LIMITS[tier]?.watchlists ?? 3;
  const current = dbGet('SELECT COUNT(*) as c FROM watchlists WHERE user_id = ?', [req.userId])?.c || 0;
  if (current >= limit) return res.status(403).json({ error: 'limit_reached', message: `You have reached the ${limit} search limit on the ${tier} plan.`, current, limit, tier });
  const safeKeywords = sanitizeKeywords(keywords);
  const result = dbRun(`INSERT INTO watchlists (user_id, name, description, keywords, price_min, price_max, country, mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [req.userId, name, description||null, safeKeywords, price_min||null, price_max||null, country||'any', mode||'local']);
  res.status(201).json(dbGet('SELECT * FROM watchlists WHERE id = ?', [result.lastInsertRowid]));
});

router.put('/watchlists/:id', requireAuth, (req, res) => {
  const wl = dbGet('SELECT * FROM watchlists WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!wl) return res.status(404).json({ error: 'Not found' });
  const { name, description, keywords, price_min, price_max, country, mode, status } = req.body;
  const safeKeywords = keywords ? sanitizeKeywords(keywords) : null;
  dbRun(`UPDATE watchlists SET name=COALESCE(?,name), description=COALESCE(?,description), keywords=COALESCE(?,keywords), price_min=?, price_max=?, country=COALESCE(?,country), mode=COALESCE(?,mode), status=COALESCE(?,status) WHERE id=?`, [name||null, description||null, safeKeywords, price_min??null, price_max??null, country||null, mode||null, status||null, req.params.id]);
  res.json(dbGet('SELECT * FROM watchlists WHERE id = ?', [req.params.id]));
});

router.delete('/watchlists/:id', requireAuth, (req, res) => {
  const wl = dbGet('SELECT * FROM watchlists WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!wl) return res.status(404).json({ error: 'Not found' });
  dbRun('DELETE FROM watch_hits WHERE watchlist_id = ?', [req.params.id]);
  dbRun('DELETE FROM notifications WHERE watchlist_id = ?', [req.params.id]);
  dbRun('DELETE FROM watchlist_negatives WHERE watchlist_id = ?', [req.params.id]);
  dbRun('DELETE FROM watchlists WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

router.post('/watchlists/:id/scan', requireAuth, async (req, res) => {
  const wl = dbGet('SELECT * FROM watchlists WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!wl) return res.status(404).json({ error: 'Not found' });
  try { const result = await scanOne(parseInt(req.params.id)); res.json({ success: true, ...result }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/scan/all', requireAuth, async (req, res) => {
  try { const result = await runBatchScan(); res.json({ success: true, ...result }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/scan/status', requireAuth, (req, res) => { res.json(getLastStatus()); });

router.get('/matches', requireAuth, (req, res) => {
  const { watchlist_id, feedback, min_score = 0, limit = 100, offset = 0 } = req.query;
  let sql = `SELECT h.*, l.title, l.price, l.currency, l.location, l.image_url, l.listing_url, l.condition, l.source, l.first_seen, w.name as watchlist_name, w.keywords as watchlist_keywords FROM watch_hits h JOIN listings l ON l.id = h.listing_id JOIN watchlists w ON w.id = h.watchlist_id WHERE w.user_id = ? AND h.score >= ?`;
  const params = [req.userId, parseInt(min_score)];
  if (watchlist_id) { sql += ' AND h.watchlist_id = ?'; params.push(watchlist_id); }
  if (feedback === 'none') sql += ' AND h.feedback IS NULL';
  else if (feedback) { sql += ' AND h.feedback = ?'; params.push(feedback); }
  sql += ' ORDER BY h.score DESC, h.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  res.json(dbAll(sql, params).map(m => ({ ...m, score_breakdown: m.score_breakdown ? JSON.parse(m.score_breakdown) : null })));
});

router.post('/matches/:id/feedback', requireAuth, (req, res) => {
  const { feedback } = req.body;
  if (!feedback || !['found', 'not_relevant'].includes(feedback)) return res.status(400).json({ error: 'feedback must be found or not_relevant' });
  const hit = dbGet(`SELECT h.*, l.title, l.listing_url, w.name as watchlist_name, w.user_id, w.id as wl_id FROM watch_hits h JOIN listings l ON l.id = h.listing_id JOIN watchlists w ON w.id = h.watchlist_id WHERE h.id = ?`, [req.params.id]);
  if (!hit || hit.user_id !== req.userId) return res.status(404).json({ error: 'Not found' });
  dbRun(`UPDATE watch_hits SET feedback = ?, feedback_at = datetime('now'), seen = 1 WHERE id = ?`, [feedback, req.params.id]);
  if (feedback === 'found') {
    dbRun(`UPDATE watchlists SET status = 'paused', last_found_at = datetime('now') WHERE id = ?`, [hit.watchlist_id]);
    dbRun(`INSERT INTO notifications (user_id, watchlist_id, hit_id, title, message, listing_url, read) VALUES (?, ?, ?, ?, ?, ?, 0)`, [req.userId, hit.watchlist_id, hit.id, 'Item found', `Search paused for "${hit.watchlist_name}"`, hit.listing_url||null]);
  }
  if (feedback === 'not_relevant') {
    const pattern = (hit.title || '').toLowerCase().trim();
    if (pattern) dbRun(`INSERT OR IGNORE INTO watchlist_negatives (watchlist_id, pattern, source) VALUES (?, ?, 'user_dismiss')`, [hit.watchlist_id, pattern]);
  }
  res.json({ ok: true, match: dbGet('SELECT * FROM watch_hits WHERE id = ?', [req.params.id]) });
});

router.patch('/matches/:id/feedback', requireAuth, (req, res) => {
  const { feedback } = req.body;
  const hit = dbGet(`SELECT h.* FROM watch_hits h JOIN watchlists w ON w.id = h.watchlist_id WHERE h.id = ? AND w.user_id = ?`, [req.params.id, req.userId]);
  if (!hit) return res.status(404).json({ error: 'Not found' });
  dbRun('UPDATE watch_hits SET feedback = ?, seen = 1 WHERE id = ?', [feedback||null, req.params.id]);
  res.json({ success: true });
});

router.post('/matches/mark-seen', requireAuth, (req, res) => {
  const { watchlist_id } = req.body;
  if (watchlist_id) dbRun(`UPDATE watch_hits SET seen = 1 WHERE watchlist_id = ? AND watchlist_id IN (SELECT id FROM watchlists WHERE user_id = ?)`, [watchlist_id, req.userId]);
  res.json({ success: true });
});

router.get('/watchlists/:id/negatives', requireAuth, (req, res) => {
  const wl = dbGet('SELECT id FROM watchlists WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!wl) return res.status(404).json({ error: 'Not found' });
  res.json(dbAll('SELECT id, pattern, source, created_at FROM watchlist_negatives WHERE watchlist_id = ? ORDER BY created_at DESC', [req.params.id]));
});

router.delete('/watchlists/:id/negatives/:patternId', requireAuth, (req, res) => {
  const wl = dbGet('SELECT id FROM watchlists WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!wl) return res.status(404).json({ error: 'Not found' });
  dbRun('DELETE FROM watchlist_negatives WHERE id = ? AND watchlist_id = ?', [req.params.patternId, req.params.id]);
  res.json({ ok: true });
});

router.get('/notifications', requireAuth, (req, res) => {
  res.json(dbAll(`SELECT n.*, w.name as watchlist_name FROM notifications n LEFT JOIN watchlists w ON w.id = n.watchlist_id WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 50`, [req.userId]));
});

router.get('/notifications/unread-count', requireAuth, (req, res) => {
  res.json({ count: dbGet('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0', [req.userId])?.count || 0 });
});

router.patch('/notifications/:id/read', requireAuth, (req, res) => {
  dbRun('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  res.json({ success: true });
});

router.post('/notifications/read-all', requireAuth, (req, res) => {
  dbRun('UPDATE notifications SET read = 1 WHERE user_id = ?', [req.userId]);
  res.json({ success: true });
});

router.get('/stats', requireAuth, (req, res) => {
  const uid = req.userId;
  res.json({
    totalWatchlists: dbGet("SELECT COUNT(*) as c FROM watchlists WHERE user_id=?", [uid])?.c || 0,
    activeWatchlists: dbGet("SELECT COUNT(*) as c FROM watchlists WHERE user_id=? AND status='active'", [uid])?.c || 0,
    totalMatches: dbGet(`SELECT COUNT(*) as c FROM watch_hits h JOIN watchlists w ON w.id=h.watchlist_id WHERE w.user_id=?`, [uid])?.c || 0,
    unseenMatches: dbGet(`SELECT COUNT(*) as c FROM watch_hits h JOIN watchlists w ON w.id=h.watchlist_id WHERE w.user_id=? AND h.seen=0 AND h.feedback IS NULL`, [uid])?.c || 0,
    unreadNotifications: dbGet("SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND read=0", [uid])?.c || 0,
    totalListings: dbGet("SELECT COUNT(*) as c FROM listings", [])?.c || 0,
    recentScans: dbAll("SELECT * FROM scan_log ORDER BY scanned_at DESC LIMIT 5", []),
    scanStatus: getLastStatus(),
  });
});

router.get('/cache/status', requireAuth, (req, res) => {
  res.json({ activeCacheEntries: dbAll("SELECT query_key, result_count, created_at, expires_at FROM query_cache WHERE expires_at > datetime('now') ORDER BY created_at DESC", []).length });
});

module.exports = router;
