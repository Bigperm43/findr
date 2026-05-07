import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Inject global styles
const style = document.createElement('style');
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #080c0f; --surface: #0e1318; --surface2: #131920;
    --border: #1c2530; --border2: #243040;
    --text: #dde4ec; --muted: #4a6070;
    --accent: #00c2ff; --accent2: #ff5c35;
    --green: #00e5a0; --yellow: #ffc642; --red: #ff4757;
  }
  html, body, #root { height: 100%; background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  .fade-up { animation: fadeUp 0.3s ease both; }
  .spin { animation: spin 1s linear infinite; }
  .pulse { animation: pulse 2s ease infinite; }
  input, textarea, select {
    background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
    color: var(--text); font-family: 'JetBrains Mono', monospace; font-size: 13px;
    padding: 10px 14px; width: 100%; outline: none; transition: border-color 0.15s;
  }
  input:focus, textarea:focus, select:focus { border-color: var(--accent); }
  input::placeholder, textarea::placeholder { color: var(--muted); }
  button { cursor: pointer; font-family: 'Syne', sans-serif; font-weight: 600; border: none; border-radius: 6px; transition: all 0.15s; }
  .btn-primary { background: var(--accent); color: #000; padding: 10px 20px; font-size: 13px; }
  .btn-primary:hover { opacity: 0.85; }
  .btn-ghost { background: transparent; border: 1px solid var(--border2); color: var(--muted); padding: 8px 16px; font-size: 12px; }
  .btn-ghost:hover { border-color: var(--text); color: var(--text); }
  .btn-danger { background: transparent; border: 1px solid rgba(255,71,87,0.3); color: var(--red); padding: 7px 14px; font-size: 12px; }
  .btn-danger:hover { background: rgba(255,71,87,0.1); }
  .btn-sm { padding: 6px 12px !important; font-size: 11px !important; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; }
  .tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
  .mono { font-family: 'JetBrains Mono', monospace; }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
