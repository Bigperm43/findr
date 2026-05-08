import { useState, useEffect, useCallback, useRef } from 'react';
import api from './api';

const TIERS = {
  free:     { name: 'Free',     price: 0,     watchlists: 3,   countries: 1,  scanMins: 1440, matches: -1, wtb: 1,   color: '#6B7280' },
  hunter:   { name: 'Hunter',   price: 9.99,  watchlists: 15,  countries: 5,  scanMins: 60,   matches: -1, wtb: 10,  color: '#8B5CF6' },
  predator: { name: 'Predator', price: 24.99, watchlists: 50,  countries: -1, scanMins: 15,   matches: -1, wtb: 50,  color: '#06B6D4' },
  pro:      { name: 'Pro',      price: 59.99, watchlists: 150, countries: -1, scanMins: 5,    matches: -1, wtb: 100, color: '#F59E0B' },
};

const COUNTRIES = [
  'Any','Australia','USA','UK','Canada','New Zealand',
  'Germany','France','Italy','Spain','Netherlands',
  'Sweden','Norway','Denmark','Japan','Russia',
  'Singapore','India','Brazil','Mexico','UAE','South Africa'
];

const SCORE_SHOW = 60;
const SCORE_PROMPT = 35;

const S = {
  app: { minHeight:'100vh', background:'#09090B', color:'#FAFAFA', fontFamily:"'DM Sans', system-ui, sans-serif", display:'flex', flexDirection:'column' },
  nav: { background:'rgba(9,9,11,0.8)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'0 24px', height:60, display:'flex', alignItems:'center', position:'sticky', top:0, zIndex:100 },
  logo: { fontSize:22, fontWeight:800, letterSpacing:-1, background:'linear-gradient(135deg, #A78BFA, #38BDF8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' },
  card: { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:20, marginBottom:12 },
  btnPrimary: { background:'linear-gradient(135deg, #7C3AED, #2563EB)', border:'none', borderRadius:12, color:'#fff', fontSize:14, fontWeight:600, padding:'11px 20px', cursor:'pointer', display:'flex', alignItems:'center', gap:7, transition:'opacity 0.2s' },
  btnGhost: { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'#A1A1AA', fontSize:13, fontWeight:500, padding:'8px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:6, transition:'all 0.2s' },
  btnDanger: { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, color:'#F87171', fontSize:13, fontWeight:500, padding:'8px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:6 },
  input: { width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'#FAFAFA', fontSize:14, padding:'11px 14px', outline:'none', boxSizing:'border-box', fontFamily:'inherit' },
  label: { display:'block', fontSize:11, fontWeight:600, letterSpacing:1.2, textTransform:'uppercase', color:'#71717A', marginBottom:7 },
  tag: { display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, letterSpacing:0.3 },
  muted: { color:'#71717A', fontSize:13 },
};

const Icon = ({ n, s=16 }) => {
  const p = { width:s, height:s, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', style:{display:'inline-block',flexShrink:0} };
  const icons = {
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    refresh: <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>,
    pause: <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>,
    play: <polygon points="5 3 19 12 5 21 5 3"/>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 0-2 2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>,
    magic: <><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h0"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></>,
    crown: <><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 20h14"/></>,
    camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>,
    alertTriangle: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  };
  return <svg {...p}>{icons[n]}</svg>;
};

const BACKEND = 'https://findr-production-0355.up.railway.app';

async function parseWTBAd(text) {
  const response = await fetch(`${BACKEND}/api/parse-wtb`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text })
  });
  if (!response.ok) throw new Error('Parse failed');
  return await response.json();
}

async function parsePhoto(imageBase64, mimeType, description = '') {
  const response = await fetch(`${BACKEND}/api/parse-photo`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ imageBase64, mimeType, description })
  });
  if (!response.ok) throw new Error('Photo parse failed');
  return await response.json();
}

function ScoreBadge({ score }) {
  const color = score >= 80 ? '#10B981' : score >= 55 ? '#F59E0B' : '#6B7280';
  const label = score >= 80 ? 'STRONG' : score >= 55 ? 'FAIR' : 'WEAK';
  return (
    <div style={{ textAlign:'center', flexShrink:0 }}>
      <div style={{ fontSize:20, fontWeight:800, color, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{score}</div>
      <div style={{ fontSize:9, color, letterSpacing:1.5, fontWeight:700 }}>{label}</div>
    </div>
  );
}

function TierBadge({ tier }) {
  const t = TIERS[tier] || TIERS.free;
  return (
    <span style={{ ...S.tag, background:`${t.color}18`, color:t.color, border:`1px solid ${t.color}30` }}>
      {tier === 'pro' && <Icon n="crown" s={10} />}
      {t.name}
    </span>
  );
}

function NotificationPanel({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.getNotifications().then(n => { setNotifications(n); setLoading(false); }); }, []);
  const markRead = async (id) => { await api.markNotificationRead(id); setNotifications(prev => prev.map(n => n.id === id ? { ...n, read:1 } : n)); };
  const markAllRead = async () => { await api.markAllNotificationsRead(); setNotifications(prev => prev.map(n => ({ ...n, read:1 }))); };
  const timeAgo = (d) => { const m = Math.floor((Date.now() - new Date(d)) / 60000); if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; const h = Math.floor(m/60); if (h < 24) return `${h}h ago`; return `${Math.floor(h/24)}d ago`; };
  return (
    <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:360, background:'#111113', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, zIndex:200, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.8)' }}>
      <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:14, fontWeight:700 }}>Notifications</div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={markAllRead} style={{ background:'none', border:'none', fontSize:12, color:'#A78BFA', cursor:'pointer', fontWeight:600 }}>Mark all read</button>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#71717A', cursor:'pointer', display:'flex' }}><Icon n="x" s={14} /></button>
        </div>
      </div>
      <div style={{ maxHeight:400, overflowY:'auto' }}>
        {loading && <div style={{ padding:24, textAlign:'center', color:'#71717A', fontSize:13 }}>Loading...</div>}
        {!loading && notifications.length === 0 && <div style={{ padding:40, textAlign:'center' }}><div style={{ fontSize:32, marginBottom:10 }}>🔔</div><div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>No notifications yet</div><div style={{ fontSize:12, color:'#71717A' }}>We'll alert you the moment a match appears</div></div>}
        {notifications.map(n => (
          <div key={n.id} onClick={() => markRead(n.id)} style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)', background:n.read ? 'transparent' : 'rgba(167,139,250,0.04)', cursor:'pointer' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginBottom:4 }}>
              <div style={{ fontSize:13, fontWeight:600, color:n.read ? '#71717A' : '#FAFAFA', flex:1 }}>{n.title}</div>
              {!n.read && <div style={{ width:7, height:7, borderRadius:'50%', background:'#A78BFA', flexShrink:0, marginTop:4 }} />}
            </div>
            <div style={{ fontSize:12, color:'#71717A', marginBottom:6 }}>{n.message}</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:11, color:'#52525B' }}>{timeAgo(n.created_at)}</span>
              {n.listing_url && <a href={n.listing_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize:12, color:'#A78BFA', textDecoration:'none', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}><Icon n="link" s={11} /> View</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingPage({ currentTier = 'free', onClose }) {
  const tiers = [
    { key:'free', features:['3 searches/month', '1 country only', 'Scan every 24 hrs', '1 WTB AI parse/month', 'In-app notifications'] },
    { key:'hunter', features:['15 searches/month', '5 countries', 'Scan every 60 min', 'Instant in-app notifications', '10 WTB AI parses/month', '10 Photo searches/month'] },
    { key:'predator', features:['50 searches/month', 'All countries + global', 'Scan every 15 min', 'Instant in-app notifications', '50 WTB AI parses/month', '50 Photo searches/month'] },
    { key:'pro', features:['150 searches/month', 'All countries + global', 'Scan every 5 min', 'Instant in-app notifications', '100 WTB AI parses/month', '100 Photo searches/month', 'API access'] },
  ];
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20, overflowY:'auto' }}>
      <div style={{ width:'100%', maxWidth:900 }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontSize:32, fontWeight:800, marginBottom:8, background:'linear-gradient(135deg, #A78BFA, #38BDF8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Upgrade Findr</div>
          <div style={{ color:'#71717A', fontSize:15 }}>Find more. Get notified faster. Never miss a deal.</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:16, marginBottom:24 }}>
          {tiers.map(t => {
            const tier = TIERS[t.key]; const isCurrent = t.key === currentTier; const isPopular = t.key === 'hunter';
            return (
              <div key={t.key} style={{ background: isCurrent ? `${tier.color}12` : 'rgba(255,255,255,0.03)', border:`1px solid ${isCurrent ? tier.color+'40' : 'rgba(255,255,255,0.08)'}`, borderRadius:16, padding:24, position:'relative', display:'flex', flexDirection:'column' }}>
                {isPopular && <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg, #7C3AED, #2563EB)', borderRadius:20, padding:'4px 14px', fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>MOST POPULAR</div>}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:tier.color, marginBottom:8, letterSpacing:0.5 }}>{tier.name.toUpperCase()}</div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                    <span style={{ fontSize:32, fontWeight:800 }}>{tier.price === 0 ? 'Free' : `$${tier.price}`}</span>
                    {tier.price > 0 && <span style={{ fontSize:13, color:'#71717A' }}>/mo</span>}
                  </div>
                </div>
                <div style={{ flex:1, marginBottom:20 }}>
                  {t.features.map(f => (
                    <div key={f} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, fontSize:13, color:'#D4D4D8' }}>
                      <div style={{ width:16, height:16, borderRadius:'50%', background:`${tier.color}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon n="check" s={10} /></div>
                      {f}
                    </div>
                  ))}
                </div>
                <button style={{ ...S.btnPrimary, justifyContent:'center', background: isCurrent ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${tier.color}CC, ${tier.color}88)`, opacity: isCurrent ? 0.6 : 1 }}>
                  {isCurrent ? 'Current Plan' : t.key === 'free' ? 'Downgrade' : 'Upgrade'}
                </button>
              </div>
            );
          })}
        </div>
        <div style={{ textAlign:'center' }}><button onClick={onClose} style={{ ...S.btnGhost, margin:'0 auto' }}>Close</button></div>
      </div>
    </div>
  );
}

function PhotoModal({ onParsed, onClose }) {
  const [preview, setPreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = (ev) => { const result = ev.target.result; setPreview(result); setImageData(result.split(',')[1]); };
    reader.readAsDataURL(file);
  };
  const analyse = async () => {
    if (!imageData) return;
    setLoading(true); setError('');
    try { const result = await parsePhoto(imageData, mimeType, description); onParsed(result); }
    catch { setError('Failed to analyse photo. Try a clearer image.'); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20 }}>
      <div style={{ ...S.card, width:'100%', maxWidth:540, background:'#111113', border:'1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div style={{ fontSize:16, fontWeight:700, display:'flex', alignItems:'center', gap:8 }}><span style={{ color:'#38BDF8' }}><Icon n="camera" s={16} /></span> Photo Search</div>
          <button onClick={onClose} style={{ ...S.btnGhost, padding:'4px 8px' }}><Icon n="x" /></button>
        </div>
        <div style={{ fontSize:13, color:'#71717A', marginBottom:16 }}>Upload a photo AND add a description for best results — AI uses both together.</div>
        <div onClick={() => fileRef.current?.click()} style={{ border:'2px dashed rgba(56,189,248,0.3)', borderRadius:12, padding:preview ? 12 : 32, textAlign:'center', cursor:'pointer', marginBottom:12, background: preview ? 'transparent' : 'rgba(56,189,248,0.03)', transition:'all 0.2s' }}>
          {preview ? <img src={preview} alt="Preview" style={{ maxWidth:'100%', maxHeight:180, borderRadius:8, objectFit:'contain' }} /> : <><div style={{ fontSize:36, marginBottom:8 }}>📸</div><div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Click to upload a photo</div><div style={{ fontSize:12, color:'#71717A' }}>JPG, PNG, WEBP supported</div></>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }} />
        {preview && <button onClick={() => { setPreview(null); setImageData(null); }} style={{ ...S.btnGhost, marginBottom:12, fontSize:12 }}><Icon n="x" s={12} /> Remove photo</button>}
        <div style={{ marginBottom:12 }}>
          <label style={S.label}>Describe what you're looking for (recommended)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...S.input, resize:'vertical', fontSize:13, lineHeight:1.5 }} placeholder="e.g. vintage rolex submariner, good condition..." />
          <div style={{ fontSize:11, color:'#52525B', marginTop:4 }}>Your description takes priority over what AI sees in the photo</div>
        </div>
        {error && <div style={{ color:'#F87171', fontSize:12, marginBottom:8 }}>{error}</div>}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={S.btnGhost}>Cancel</button>
          <button onClick={analyse} disabled={loading || !imageData} style={{ ...S.btnPrimary, flex:1, justifyContent:'center', background:'linear-gradient(135deg, #0891B2, #2563EB)', opacity: loading || !imageData ? 0.5 : 1 }}>
            {loading ? '🔍 Analysing...' : '📸 Identify & Search'}
          </button>
        </div>
      </div>
    </div>
  );
}

function WTBModal({ onParsed, onClose }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const parse = async () => {
    if (!text.trim()) return;
    setLoading(true); setError('');
    try { const result = await parseWTBAd(text); onParsed(result); }
    catch { setError('Failed to parse. Try again or fill the form manually.'); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20 }}>
      <div style={{ ...S.card, width:'100%', maxWidth:540, background:'#111113', border:'1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div style={{ fontSize:16, fontWeight:700, display:'flex', alignItems:'center', gap:8 }}><span style={{ color:'#A78BFA' }}><Icon n="magic" s={16} /></span> AI Parse WTB Ad</div>
          <button onClick={onClose} style={{ ...S.btnGhost, padding:'4px 8px' }}><Icon n="x" /></button>
        </div>
        <div style={{ fontSize:13, color:'#71717A', marginBottom:16 }}>Paste any "Want To Buy" post — AI extracts search criteria automatically.</div>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={8} style={{ ...S.input, resize:'vertical', lineHeight:1.6 }} placeholder="Paste WTB ad here..." />
        {error && <div style={{ color:'#F87171', fontSize:12, marginTop:8 }}>{error}</div>}
        <div style={{ display:'flex', gap:10, marginTop:16 }}>
          <button onClick={onClose} style={S.btnGhost}>Cancel</button>
          <button onClick={parse} disabled={loading || !text.trim()} style={{ ...S.btnPrimary, flex:1, justifyContent:'center', opacity: loading || !text.trim() ? 0.5 : 1 }}>
            {loading ? 'Analysing...' : '✨ Extract & Fill Form'}
          </button>
        </div>
      </div>
    </div>
  );
}

function WatchlistModal({ existing, onSave, onClose, userTier = 'free' }) {
  const tier = TIERS[userTier] || TIERS.free;
  const [form, setForm] = useState({ name: existing?.name || '', description: existing?.description || '', keywords: existing?.keywords || '', price_min: existing?.price_min || '', price_max: existing?.price_max || '', country: existing?.country || 'any', mode: existing?.mode || 'local' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWTB, setShowWTB] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleParsed = (parsed) => {
    setForm(f => ({ ...f, name: parsed.name || f.name, keywords: parsed.keywords || f.keywords, price_min: parsed.price_min || f.price_min, price_max: parsed.price_max || f.price_max, country: parsed.country || f.country, mode: parsed.mode || f.mode, description: parsed.description || f.description }));
    setShowWTB(false); setShowPhoto(false);
  };
  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const payload = { ...form, price_min: form.price_min ? parseFloat(form.price_min) : null, price_max: form.price_max ? parseFloat(form.price_max) : null };
      if (existing) await api.updateWatchlist(existing.id, payload); else await api.createWatchlist(payload);
      onSave();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  const countryOptions = tier.countries === -1 ? COUNTRIES : COUNTRIES.slice(0, tier.countries + 1);
  return (
    <>
      {showWTB && <WTBModal onParsed={handleParsed} onClose={() => setShowWTB(false)} />}
      {showPhoto && <PhotoModal onParsed={handleParsed} onClose={() => setShowPhoto(false)} />}
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
        <div style={{ ...S.card, width:'100%', maxWidth:520, background:'#111113', border:'1px solid rgba(255,255,255,0.1)', maxHeight:'90vh', overflowY:'auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div style={{ fontSize:16, fontWeight:700 }}>{existing ? 'Edit Search' : 'New Search'}</div>
            <button onClick={onClose} style={{ ...S.btnGhost, padding:'4px 8px' }}><Icon n="x" /></button>
          </div>
          {!existing && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
              <button type="button" onClick={() => setShowWTB(true)} style={{ padding:'12px 16px', background:'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(56,189,248,0.08))', border:'1px solid rgba(167,139,250,0.25)', borderRadius:12, cursor:'pointer', color:'#A78BFA', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <Icon n="magic" s={14} /> ✨ Paste WTB Ad
              </button>
              <button type="button" onClick={() => setShowPhoto(true)} style={{ padding:'12px 16px', background:'linear-gradient(135deg, rgba(8,145,178,0.15), rgba(37,99,235,0.08))', border:'1px solid rgba(56,189,248,0.25)', borderRadius:12, cursor:'pointer', color:'#38BDF8', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <Icon n="camera" s={14} /> 📸 Photo Search
              </button>
            </div>
          )}
          <form onSubmit={submit}>
            <div style={{ marginBottom:16 }}>
              <label style={S.label}>What are you looking for? *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} style={S.input} placeholder="e.g. 1957 El Camino, Vintage Rolex, RTX 4090" required />
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={S.label}>Search Keywords *</label>
              <input value={form.keywords} onChange={e => set('keywords', e.target.value)} style={S.input} placeholder="e.g. 1957 el camino chevrolet SS" required />
              <div style={{ fontSize:11, color:'#52525B', marginTop:5 }}>Sent directly to search engine</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div><label style={S.label}>Min Price ($)</label><input type="number" value={form.price_min} onChange={e => set('price_min', e.target.value)} style={S.input} placeholder="0" /></div>
              <div><label style={S.label}>Max Price ($)</label><input type="number" value={form.price_max} onChange={e => set('price_max', e.target.value)} style={S.input} placeholder="No limit" /></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div>
                <label style={S.label}>Search Mode</label>
                <select value={form.mode} onChange={e => set('mode', e.target.value)} style={{ ...S.input, appearance:'auto', color:'#09090B', background:'#FAFAFA' }}>
                  <option value="local">Local (Country)</option>
                  <option value="global">Global (Worldwide)</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Country</label>
                <select value={form.country} onChange={e => set('country', e.target.value)} style={{ ...S.input, appearance:'auto', color:'#09090B', background:'#FAFAFA' }} disabled={form.mode === 'global'}>
                  {countryOptions.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={S.label}>Notes (optional)</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} style={{ ...S.input, resize:'vertical' }} placeholder="Extra details..." />
            </div>
            <div style={{ background:'rgba(167,139,250,0.06)', border:'1px solid rgba(167,139,250,0.12)', borderRadius:12, padding:14, marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#A78BFA', marginBottom:6, letterSpacing:0.5 }}>HOW IT WORKS</div>
              <div style={{ fontSize:12, color:'#71717A', lineHeight:1.7 }}>Findr scans the web every {tier.scanMins} minutes on your plan. The moment a matching listing appears, you'll be notified instantly.</div>
            </div>
            {error && <div style={{ color:'#F87171', fontSize:12, marginBottom:14 }}>{error}</div>}
            <div style={{ display:'flex', gap:10 }}>
              <button type="button" style={S.btnGhost} onClick={onClose}>Cancel</button>
              <button type="submit" style={{ ...S.btnPrimary, flex:1, justifyContent:'center' }} disabled={loading}>
                {loading ? 'Saving...' : existing ? 'Save Changes' : 'Start Searching'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function MatchCard({ match: m, onFeedback, dimmed = false }) {
  const [loading, setLoading] = useState(false);
  const fb = async (feedback) => { setLoading(true); await onFeedback(m.id, feedback); setLoading(false); };
  const sourceColors = { 'eBay':'#F59E0B', 'Gumtree':'#10B981', 'Facebook Marketplace':'#3B82F6', 'CarSales':'#EF4444', 'default':'#8B5CF6' };
  const sc = sourceColors[m.source] || sourceColors.default;
  return (
    <div style={{ ...S.card, display:'flex', gap:16, alignItems:'flex-start', opacity: m.feedback === 'not_relevant' ? 0.35 : dimmed ? 0.6 : 1, transition:'opacity 0.2s', border: dimmed ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ width:72, height:72, borderRadius:12, flexShrink:0, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, overflow:'hidden' }}>
        {m.image_url ? <img src={m.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:11 }} onError={e => e.target.style.display='none'} /> : '📦'}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:8, alignItems:'flex-start', marginBottom:8 }}>
          <div style={{ fontSize:14, fontWeight:600, lineHeight:1.4, color:'#F4F4F5' }}>{m.title}</div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
            {m.price != null && <div style={{ fontSize:18, fontWeight:800, color:'#10B981', fontVariantNumeric:'tabular-nums' }}>${m.price.toLocaleString()}</div>}
            <ScoreBadge score={m.score} />
          </div>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
          {m.source && <span style={{ ...S.tag, background:`${sc}15`, color:sc, border:`1px solid ${sc}30` }}>{m.source}</span>}
          {dimmed && <span style={{ ...S.tag, background:'rgba(245,158,11,0.1)', color:'#F59E0B', border:'1px solid rgba(245,158,11,0.25)' }}>LOW CONFIDENCE</span>}
          {m.location && <span style={{ ...S.tag, background:'rgba(255,255,255,0.04)', color:'#71717A', border:'1px solid rgba(255,255,255,0.08)', textTransform:'none', fontSize:10 }}>{m.location}</span>}
          <span style={{ ...S.tag, background:'rgba(167,139,250,0.08)', color:'#A78BFA', border:'1px solid rgba(167,139,250,0.2)' }}>{m.watchlist_name}</span>
          <span style={{ ...S.tag, background:'rgba(255,255,255,0.03)', color:'#52525B', border:'1px solid rgba(255,255,255,0.06)', fontSize:10 }}>{new Date(m.created_at || m.first_seen).toLocaleDateString()}</span>
        </div>
        {m.feedback ? (
          <span style={{ fontSize:12, color: m.feedback === 'found' ? '#10B981' : '#71717A' }}>{m.feedback === 'found' ? '✓ Marked as found' : '✗ Dismissed'}</span>
        ) : (
          <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
            <a href={m.listing_url} target="_blank" rel="noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#D4D4D8', fontSize:12, fontWeight:600, textDecoration:'none' }}><Icon n="link" s={11} /> View Listing</a>
            <button onClick={() => fb('found')} disabled={loading} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', color:'#10B981', fontSize:12, fontWeight:600, cursor:'pointer' }}><Icon n="check" s={11} /> Found It</button>
            <button onClick={() => fb('not_relevant')} disabled={loading} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.18)', color:'#F87171', fontSize:12, fontWeight:600, cursor:'pointer' }}><Icon n="x" s={11} /> Dismiss</button>
          </div>
        )}
      </div>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (mode === 'register') {
        if (password !== confirmPassword) { setError('Passwords do not match'); setLoading(false); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters'); setLoading(false); return; }
        const { token, user } = await api.register(email, password);
        localStorage.setItem('mm_token', token);
        onLogin(user);
      } else {
        const { token, user } = await api.login(email, password);
        localStorage.setItem('mm_token', token);
        onLogin(user);
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#09090B', display:'flex', flexDirection:'column' }}>
      {showPricing && <PricingPage onClose={() => setShowPricing(false)} />}
      <div style={{ position:'fixed', inset:0, background:'radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(56,189,248,0.06) 0%, transparent 60%)', pointerEvents:'none' }} />
      <nav style={{ ...S.nav, justifyContent:'space-between' }}>
        <div style={S.logo}>Findr</div>
        <button onClick={() => setShowPricing(true)} style={S.btnGhost}>Pricing</button>
      </nav>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:24, position:'relative' }}>
        <div style={{ width:'100%', maxWidth:420 }}>
          <div style={{ textAlign:'center', marginBottom:40 }}>
            <div style={{ width:64, height:64, borderRadius:20, background:'linear-gradient(135deg, #7C3AED, #2563EB)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:28 }}>🔍</div>
            <div style={{ fontSize:36, fontWeight:800, letterSpacing:-1.5, background:'linear-gradient(135deg, #A78BFA, #38BDF8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:8 }}>Findr</div>
            <div style={{ fontSize:14, color:'#71717A', letterSpacing:0.5 }}>Find anything. Anywhere. Instantly.</div>
          </div>
          <div style={{ display:'flex', background:'rgba(255,255,255,0.04)', borderRadius:12, padding:4, marginBottom:24 }}>
            {['login','register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }} style={{ flex:1, padding:'10px', borderRadius:9, border:'none', cursor:'pointer', fontSize:14, fontWeight:600, transition:'all 0.2s', background: mode === m ? 'rgba(124,58,237,0.3)' : 'transparent', color: mode === m ? '#A78BFA' : '#71717A' }}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>
          <div style={{ ...S.card, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', padding:28 }}>
            <form onSubmit={submit}>
              <div style={{ marginBottom:16 }}>
                <label style={S.label}>Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" required style={S.input} placeholder="you@example.com" />
              </div>
              <div style={{ marginBottom: mode === 'register' ? 16 : 24 }}>
                <label style={S.label}>Password</label>
                <input value={password} onChange={e => setPassword(e.target.value)} type="password" required style={S.input} placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'} />
              </div>
              {mode === 'register' && (
                <div style={{ marginBottom:24 }}>
                  <label style={S.label}>Confirm Password</label>
                  <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" required style={S.input} placeholder="••••••••" />
                </div>
              )}
              {error && <div style={{ color:'#F87171', fontSize:13, marginBottom:14, padding:'10px 14px', background:'rgba(239,68,68,0.08)', borderRadius:8, border:'1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
              <button type="submit" disabled={loading} style={{ ...S.btnPrimary, width:'100%', justifyContent:'center', fontSize:15, padding:'13px 20px' }}>
                {loading ? (mode === 'register' ? 'Creating account...' : 'Signing in...') : (mode === 'register' ? 'Create Free Account' : 'Sign In')}
              </button>
            </form>
            {mode === 'login' && (
              <div style={{ marginTop:16, padding:12, background:'rgba(255,255,255,0.03)', borderRadius:10, fontSize:12, color:'#52525B', fontFamily:'monospace' }}>admin@middlemen.local / password123</div>
            )}
            {mode === 'register' && (
              <div style={{ marginTop:16, fontSize:12, color:'#52525B', textAlign:'center', lineHeight:1.6 }}>
                By creating an account you agree to our Terms of Service and Privacy Policy. Free accounts include 3 searches/month.
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:24, flexWrap:'wrap' }}>
            {['🌍 20+ Countries', '⚡ Real-time scans', '🤖 AI WTB Parser', '📸 Photo Search', '🔔 Instant alerts'].map(f => (
              <span key={f} style={{ fontSize:12, color:'#71717A', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'4px 12px' }}>{f}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem('mm_token');
    if (!token) { setChecking(false); return; }
    api.me().then(u => { setUser(u); setChecking(false); }).catch(() => { localStorage.removeItem('mm_token'); setChecking(false); });
  }, []);
  if (checking) return <div style={{ minHeight:'100vh', background:'#09090B', display:'flex', alignItems:'center', justifyContent:'center', color:'#71717A', fontSize:13, fontFamily:'monospace' }}>loading...</div>;
  if (!user) return <LoginPage onLogin={setUser} />;
  return <Dashboard user={user} onLogout={() => { localStorage.removeItem('mm_token'); setUser(null); }} />;
}

function Dashboard({ user, onLogout }) {
  const userTier = user?.tier || 'pro';
  const tier = TIERS[userTier] || TIERS.free;
  const [tab, setTab] = useState('watchlists');
  const [watchlists, setWatchlists] = useState([]);
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [modal, setModal] = useState(null);
  const [selectedWl, setSelectedWl] = useState(null);
  const [matchFilter, setMatchFilter] = useState('all');
  const [scanningId, setScanningId] = useState(null);
  const [scanAllLoading, setScanAllLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showLowConfidence, setShowLowConfidence] = useState({});
  const notifRef = useRef(null);

  const loadData = useCallback(async () => {
    try { const [wls, s] = await Promise.all([api.getWatchlists(), api.getStats()]); setWatchlists(wls); setStats(s); setUnreadCount(s.unreadNotifications || 0); } catch {}
  }, []);

  const loadMatches = useCallback(async () => {
    try {
      const params = {};
      if (selectedWl) params.watchlist_id = selectedWl;
      if (matchFilter === 'unseen') params.feedback = 'none';
      if (matchFilter === 'found') params.feedback = 'found';
      setMatches(await api.getMatches(params));
    } catch {}
  }, [selectedWl, matchFilter]);

  useEffect(() => { loadData(); const t = setInterval(loadData, 15000); return () => clearInterval(t); }, [loadData]);
  useEffect(() => { if (tab === 'matches') loadMatches(); }, [tab, loadMatches]);
  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false); };
    document.addEventListener('mousedown', handler); return () => document.removeEventListener('mousedown', handler);
  }, []);

  const scanOne = async (id) => { setScanningId(id); try { await api.scanWatchlist(id); await loadData(); if (tab === 'matches') await loadMatches(); } catch (err) { alert('Scan error: ' + err.message); } finally { setScanningId(null); } };
  const scanAll = async () => { setScanAllLoading(true); try { await api.scanAll(); await loadData(); if (tab === 'matches') await loadMatches(); } catch (err) { alert('Error: ' + err.message); } finally { setScanAllLoading(false); } };
  const deleteWl = async (id) => { if (!window.confirm('Delete this watchlist?')) return; await api.deleteWatchlist(id); loadData(); };
  const toggleStatus = async (wl) => { await api.updateWatchlist(wl.id, { status: wl.status === 'active' ? 'paused' : 'active' }); loadData(); };
  const handleFeedback = async (hitId, feedback) => { await api.setFeedback(hitId, feedback); setMatches(prev => prev.map(m => m.id === hitId ? { ...m, feedback } : m)); };

  const activeCount = watchlists.filter(w => w.status === 'active').length;
  const scanStatus = stats?.scanStatus;
  const atWatchlistLimit = tier.watchlists !== -1 && watchlists.length >= tier.watchlists;

  const goodMatches = matches.filter(m => m.score >= SCORE_SHOW);
  const lowMatches = matches.filter(m => m.score >= SCORE_PROMPT && m.score < SCORE_SHOW);
  const lowByWatchlist = {};
  lowMatches.forEach(m => { const key = m.watchlist_id || 'all'; if (!lowByWatchlist[key]) lowByWatchlist[key] = []; lowByWatchlist[key].push(m); });

  return (
    <div style={S.app}>
      {showPricing && <PricingPage currentTier={userTier} onClose={() => setShowPricing(false)} />}
      <div style={{ position:'fixed', inset:0, background:'radial-gradient(ellipse at 10% 80%, rgba(124,58,237,0.05) 0%, transparent 50%), radial-gradient(ellipse at 90% 10%, rgba(56,189,248,0.04) 0%, transparent 50%)', pointerEvents:'none', zIndex:0 }} />

      <nav style={{ ...S.nav, justifyContent:'space-between', position:'sticky', zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:24 }}>
          <div style={S.logo}>Findr</div>
          {[{ id:'watchlists', icon:'search', label:'My Searches' }, { id:'matches', icon:'zap', label:`Results${stats?.unseenMatches > 0 ? ` (${stats.unseenMatches})` : ''}` }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background:'none', border:'none', height:60, padding:'0 4px', fontSize:14, fontWeight:600, display:'flex', alignItems:'center', gap:7, color: tab === t.id ? '#FAFAFA' : '#71717A', borderBottom:`2px solid ${tab === t.id ? '#A78BFA' : 'transparent'}`, cursor:'pointer', transition:'all 0.15s' }}>
              <Icon n={t.icon} s={14} /> {t.label}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#52525B', fontFamily:'monospace' }}>
            {scanStatus?.isScanning ? <><span style={{ width:6, height:6, borderRadius:'50%', background:'#F59E0B', display:'inline-block' }} /> SCANNING</> : activeCount > 0 ? <><span style={{ width:6, height:6, borderRadius:'50%', background:'#10B981', display:'inline-block' }} /> ACTIVE</> : <><span style={{ width:6, height:6, borderRadius:'50%', background:'#52525B', display:'inline-block' }} /> IDLE</>}
          </div>
          <button onClick={scanAll} disabled={scanAllLoading || activeCount === 0} style={{ ...S.btnGhost, opacity: activeCount === 0 ? 0.4 : 1 }}><Icon n="refresh" s={13} /> {scanAllLoading ? 'Scanning...' : 'Scan Now'}</button>
          <button onClick={() => setShowPricing(true)} style={{ ...S.btnGhost, gap:6 }}><TierBadge tier={userTier} />{userTier === 'free' && <span style={{ fontSize:11, color:'#A78BFA' }}>Upgrade</span>}</button>
          <div ref={notifRef} style={{ position:'relative' }}>
            <button onClick={() => setShowNotifications(!showNotifications)} style={{ background:'none', border:'none', cursor:'pointer', position:'relative', padding:'6px 8px', color: unreadCount > 0 ? '#A78BFA' : '#71717A', display:'flex', alignItems:'center' }}>
              <Icon n="bell" s={18} />
              {unreadCount > 0 && <span style={{ position:'absolute', top:2, right:2, width:16, height:16, borderRadius:'50%', background:'linear-gradient(135deg, #7C3AED, #2563EB)', color:'#fff', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
          </div>
          <button onClick={onLogout} style={{ ...S.btnGhost, padding:'6px 10px' }}><Icon n="logout" s={14} /></button>
        </div>
      </nav>

      <div style={{ background:'rgba(255,255,255,0.02)', borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'10px 24px', display:'flex', gap:28, alignItems:'center', flexWrap:'wrap', position:'relative', zIndex:1 }}>
        {[{ label:'Active Searches', val:activeCount, color:'#10B981' }, { label:'Total Matches', val:stats?.totalMatches || 0, color:'#A78BFA' }, { label:'New Results', val:stats?.unseenMatches || 0, color: stats?.unseenMatches > 0 ? '#F59E0B' : '#52525B' }, { label:'Notifications', val:unreadCount, color: unreadCount > 0 ? '#38BDF8' : '#52525B' }].map(s => (
          <div key={s.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:22, fontWeight:800, color:s.color, fontVariantNumeric:'tabular-nums' }}>{s.val}</span>
            <span style={{ fontSize:12, color:'#52525B', fontWeight:500 }}>{s.label}</span>
          </div>
        ))}
        <div style={{ marginLeft:'auto', fontSize:11, color:'#3F3F46', fontFamily:'monospace' }}>{scanStatus?.scannedAt ? `Last scan: ${new Date(scanStatus.scannedAt).toLocaleTimeString()}` : 'Not scanned yet'}</div>
        {tier.watchlists !== -1 && <div style={{ display:'flex', alignItems:'center', gap:8 }}><div style={{ fontSize:11, color:'#52525B' }}>{watchlists.length}/{tier.watchlists} searches</div><div style={{ width:60, height:4, background:'rgba(255,255,255,0.08)', borderRadius:2 }}><div style={{ width:`${(watchlists.length/tier.watchlists)*100}%`, height:'100%', background: atWatchlistLimit ? '#EF4444' : '#A78BFA', borderRadius:2, transition:'width 0.3s' }} /></div></div>}
      </div>

      <main style={{ flex:1, padding:24, maxWidth:1000, width:'100%', margin:'0 auto', position:'relative', zIndex:1 }}>
        {tab === 'watchlists' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
              <div>
                <div style={{ fontSize:24, fontWeight:800, marginBottom:4, letterSpacing:-0.5 }}>My Searches</div>
                <div style={{ fontSize:13, color:'#71717A' }}>Scanning every {tier.scanMins} min · Notified instantly on match</div>
              </div>
              <button onClick={() => atWatchlistLimit ? setShowPricing(true) : setModal('new')} style={{ ...S.btnPrimary, opacity: atWatchlistLimit ? 0.7 : 1 }}>
                <Icon n="plus" s={14} /> {atWatchlistLimit ? 'Upgrade for more' : 'New Search'}
              </button>
            </div>

            {watchlists.length === 0 ? (
              <div style={{ ...S.card, padding:64, textAlign:'center' }}>
                <div style={{ fontSize:52, marginBottom:16 }}>🔍</div>
                <div style={{ fontSize:20, fontWeight:800, marginBottom:8, letterSpacing:-0.5 }}>What are you looking for?</div>
                <div style={{ fontSize:14, color:'#71717A', marginBottom:28, maxWidth:400, margin:'0 auto 28px' }}>Tell Findr what you want. We'll scan Gumtree, eBay, Facebook Marketplace and more — and notify you the moment it appears.</div>
                <button onClick={() => setModal('new')} style={{ ...S.btnPrimary, margin:'0 auto', fontSize:15, padding:'13px 28px' }}>Start Your First Search</button>
              </div>
            ) : watchlists.map((wl) => {
              const modeColor = wl.mode === 'global' ? '#38BDF8' : '#A78BFA';
              const hasBeenScanned = !!wl.last_scanned;
              return (
                <div key={wl.id} style={{ ...S.card, borderLeft:`3px solid ${wl.status === 'active' ? '#10B981' : 'rgba(255,255,255,0.08)'}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
                        <span style={{ fontSize:15, fontWeight:700, color:'#F4F4F5' }}>{wl.name}</span>
                        <span style={{ ...S.tag, background: wl.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)', color: wl.status === 'active' ? '#10B981' : '#71717A', border:`1px solid ${wl.status === 'active' ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}` }}>
                          {wl.status === 'active' && <span style={{ width:5, height:5, borderRadius:'50%', background:'#10B981', display:'inline-block' }} />}
                          {wl.status}
                        </span>
                        <span style={{ ...S.tag, background:`${modeColor}10`, color:modeColor, border:`1px solid ${modeColor}25` }}>{wl.mode === 'global' ? '🌐 Global' : `📍 ${wl.country || 'local'}`}</span>
                      </div>
                      <div style={{ fontSize:13, color:'#A78BFA', fontFamily:'monospace', marginBottom:8 }}>"{wl.keywords}"</div>
                      <div style={{ display:'flex', gap:16, fontSize:12, color:'#52525B', flexWrap:'wrap' }}>
                        {(wl.price_min || wl.price_max) && <span>${(wl.price_min||0).toLocaleString()} – ${wl.price_max ? wl.price_max.toLocaleString() : '∞'}</span>}
                        {wl.last_scanned && <span>Scanned {new Date(wl.last_scanned).toLocaleString()}</span>}
                        {!wl.last_scanned && <span style={{ color:'#F59E0B' }}>⏳ Pending first scan...</span>}
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:32, fontWeight:800, color:'#A78BFA', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{wl.match_count}</div>
                      <div style={{ fontSize:10, color:'#52525B', letterSpacing:1, textTransform:'uppercase' }}>matches</div>
                      {wl.unseen_count > 0 && <div style={{ fontSize:12, color:'#F59E0B', marginTop:2 }}>{wl.unseen_count} new</div>}
                    </div>
                  </div>
                  {wl.status === 'active' && wl.match_count === 0 && !hasBeenScanned && (
                    <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(167,139,250,0.05)', border:'1px solid rgba(167,139,250,0.1)', borderRadius:10, fontSize:12, color:'#71717A' }}>
                      ⏳ First scan in progress — we'll notify you the moment something appears.
                    </div>
                  )}
                  {wl.status === 'active' && wl.match_count === 0 && hasBeenScanned && (
                    <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:10, fontSize:12, color:'#A78BFA', lineHeight:1.6 }}>
                      🔍 No matching listings found yet — Findr will keep checking every {tier.scanMins} minutes and notify you the moment something comes up.
                    </div>
                  )}
                  <div style={{ display:'flex', gap:8, marginTop:16, paddingTop:16, borderTop:'1px solid rgba(255,255,255,0.05)', flexWrap:'wrap' }}>
                    <button onClick={() => scanOne(wl.id)} disabled={scanningId === wl.id} style={S.btnGhost}><Icon n="refresh" s={12} /> {scanningId === wl.id ? 'Scanning...' : 'Scan Now'}</button>
                    <button onClick={() => { setSelectedWl(wl.id); setTab('matches'); api.markSeen(wl.id); }} style={S.btnGhost}><Icon n="eye" s={12} /> View Results</button>
                    <button onClick={() => setModal(wl)} style={S.btnGhost}><Icon n="edit" s={12} /> Edit</button>
                    <button onClick={() => toggleStatus(wl)} style={S.btnGhost}>{wl.status === 'active' ? <><Icon n="pause" s={12} /> Pause</> : <><Icon n="play" s={12} /> Resume</>}</button>
                    <button onClick={() => deleteWl(wl.id)} style={{ ...S.btnDanger, marginLeft:'auto' }}><Icon n="trash" s={12} /> Delete</button>
                  </div>
                </div>
              );
            })}

            {atWatchlistLimit && (
              <div style={{ ...S.card, background:'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(56,189,248,0.05))', border:'1px solid rgba(167,139,250,0.2)', textAlign:'center', padding:28 }}>
                <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>You've reached your search limit</div>
                <div style={{ fontSize:13, color:'#71717A', marginBottom:16 }}>Upgrade to Hunter for 15 searches, or Predator for 50.</div>
                <button onClick={() => setShowPricing(true)} style={{ ...S.btnPrimary, margin:'0 auto', justifyContent:'center' }}><Icon n="crown" s={14} /> View Plans</button>
              </div>
            )}
          </div>
        )}

        {tab === 'matches' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:24, fontWeight:800, marginBottom:4, letterSpacing:-0.5 }}>Results</div>
                <div style={{ fontSize:13, color:'#71717A' }}>{goodMatches.length} quality matches found</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
              <select value={selectedWl || ''} onChange={e => setSelectedWl(e.target.value || null)} style={{ ...S.input, width:'auto', minWidth:160, padding:'8px 14px', appearance:'auto', color:'#09090B', background:'#FAFAFA' }}>
                <option value="">All Searches</option>
                {watchlists.map(wl => <option key={wl.id} value={wl.id}>{wl.name}</option>)}
              </select>
              {['all','unseen','found'].map(f => (
                <button key={f} onClick={() => setMatchFilter(f)} style={{ padding:'8px 16px', fontSize:13, fontWeight:600, borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background: matchFilter === f ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.04)', color: matchFilter === f ? '#A78BFA' : '#71717A', cursor:'pointer', transition:'all 0.15s' }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            {goodMatches.length === 0 && lowMatches.length === 0 && (
              <div style={{ ...S.card, padding:56, textAlign:'center' }}>
                <div style={{ fontSize:36, marginBottom:12 }}>🔍</div>
                <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>No matching listings found yet</div>
                <div style={{ fontSize:13, color:'#71717A', lineHeight:1.7 }}>We've searched the web but haven't found anything yet. Findr will keep scanning every {tier.scanMins} minutes and notify you the moment something comes up.</div>
              </div>
            )}
            {goodMatches.map(m => <MatchCard key={m.id} match={m} onFeedback={handleFeedback} />)}
            {Object.entries(lowByWatchlist).map(([wlKey, items]) => {
              const isShowing = showLowConfidence[wlKey];
              const wlName = items[0]?.watchlist_name || 'this search';
              return (
                <div key={wlKey}>
                  {!isShowing && (
                    <div style={{ ...S.card, background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.2)', display:'flex', alignItems:'center', gap:14, padding:'16px 20px' }}>
                      <span style={{ color:'#F59E0B', flexShrink:0 }}><Icon n="alertTriangle" s={20} /></span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>{items.length} low-confidence {items.length === 1 ? 'match' : 'matches'} found for "{wlName}"</div>
                        <div style={{ fontSize:12, color:'#71717A' }}>These results scored below 60 — they may be loosely related. Want to see them anyway?</div>
                      </div>
                      <button onClick={() => setShowLowConfidence(prev => ({ ...prev, [wlKey]: true }))} style={{ ...S.btnGhost, flexShrink:0, fontSize:12, whiteSpace:'nowrap' }}>Show anyway</button>
                    </div>
                  )}
                  {isShowing && items.map(m => <MatchCard key={m.id} match={m} onFeedback={handleFeedback} dimmed={true} />)}
                  {isShowing && <button onClick={() => setShowLowConfidence(prev => ({ ...prev, [wlKey]: false }))} style={{ ...S.btnGhost, fontSize:12, marginBottom:12 }}>Hide low-confidence results</button>}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {modal && <WatchlistModal existing={typeof modal === 'object' ? modal : null} onSave={() => { setModal(null); loadData(); }} onClose={() => setModal(null)} userTier={userTier} />}
    </div>
  );
}