require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { initDb, dbRun } = require('./db');
const routes = require('./routes');
const { startScheduler } = require('./scanner');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*', credentials: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/api', routes);

app.get('/health', (req, res) => res.json({ status: 'ok', mode: 'mock', ts: new Date().toISOString() }));

app.get('/api/clear-all', (req, res) => {
  try {
    dbRun('DELETE FROM watch_hits', []);
    dbRun('DELETE FROM listings', []);
    dbRun('DELETE FROM notifications', []);
    dbRun('DELETE FROM query_cache', []);
    res.json({ ok: true, message: 'All data cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const getClaudeHeaders = () => ({
  'content-type': 'application/json',
  'x-api-key': process.env.ANTHROPIC_API_KEY,
  'anthropic-version': '2023-06-01'
});

// ─── WTB TEXT PARSER ──────────────────────────────────────────────────────────
app.post('/api/parse-wtb', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });
  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Extract buying criteria from this buyer request. It may have typos or be informal. Return ONLY a JSON object with these fields, nothing else, no markdown:\n- name: short title (max 60 chars)\n- keywords: core search terms for Google\n- price_min: number or null\n- price_max: number or null\n- country: one of [australia, usa, uk, canada, new zealand, germany, france, italy, spain, any]\n- mode: "local" or "global"\n- description: brief summary of requirements (max 150 chars)\n\nRequest: ${text}`
        }]
      },
      { headers: getClaudeHeaders() }
    );
    const raw = response.data.content[0].text.trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch (err) {
    console.error('[parse-wtb] Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to parse ad' });
  }
});

// ─── PHOTO PARSER ─────────────────────────────────────────────────────────────
app.post('/api/parse-photo', async (req, res) => {
  const { imageBase64, mimeType, description } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

  try {
    const userDescription = description ? `User's description: "${description}"` : 'No text description provided.';

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType || 'image/jpeg',
                data: imageBase64
              }
            },
            {
              type: 'text',
              text: `You are helping someone find an item to buy. They have provided a photo AND a text description. Use BOTH together to identify the item accurately. The text description takes priority over what you see in the image if there is any conflict.\n\n${userDescription}\n\nBased on both the image and the description above, return ONLY a JSON object with these fields, nothing else, no markdown:\n- name: short title describing the item (max 60 chars)\n- keywords: the best Google search terms to find this item for sale (be very specific using the description)\n- price_min: estimated minimum price as number or null\n- price_max: estimated maximum price as number or null\n- country: "any"\n- mode: "global"\n- description: brief description combining both photo and text clues (max 150 chars)\n\nReturn only valid JSON, nothing else.`
            }
          ]
        }]
      },
      { headers: getClaudeHeaders() }
    );

    const raw = response.data.content[0].text.trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    console.log('[parse-photo] Identified:', parsed.name);
    res.json(parsed);
  } catch (err) {
    console.error('[parse-photo] Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to analyse photo' });
  }
});

app.get('/api/set-pro', (req, res) => {
  const { dbRun } = require('./db');
  dbRun('UPDATE users SET tier = ? WHERE email = ?', ['pro', 'admin@middlemen.local']);
  res.json({ ok: true });
});

async function start() {
  await initDb();
  console.log('[db] Ready');
  startScheduler();
  app.listen(PORT, () => {
    console.log(`\nThe Middlemen v2 — http://localhost:${PORT}`);
    console.log(`Login: admin@middlemen.local / password123\n`);
  });
}

start().catch(err => { console.error('Startup failed:', err); process.exit(1); });