const BASE = '/api';
function getToken() { return localStorage.getItem('mm_token'); }

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401) { localStorage.removeItem('mm_token'); window.location.reload(); }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const api = {
  login: (email, password) => req('POST', '/auth/login', { email, password }),
  me: () => req('GET', '/auth/me'),
  getWatchlists: () => req('GET', '/watchlists'),
  createWatchlist: (data) => req('POST', '/watchlists', data),
  updateWatchlist: (id, data) => req('PUT', `/watchlists/${id}`, data),
  deleteWatchlist: (id) => req('DELETE', `/watchlists/${id}`),
  scanWatchlist: (id) => req('POST', `/watchlists/${id}/scan`),
  scanAll: () => req('POST', '/scan/all'),
  scanStatus: () => req('GET', '/scan/status'),
  getMatches: (params = {}) => req('GET', `/matches?${new URLSearchParams(params)}`),
  setFeedback: (id, feedback) => req('PATCH', `/matches/${id}/feedback`, { feedback }),
  markSeen: (watchlist_id) => req('POST', '/matches/mark-seen', { watchlist_id }),
  getStats: () => req('GET', '/stats'),
  getNotifications: () => req('GET', '/notifications'),
  getUnreadCount: () => req('GET', '/notifications/unread-count'),
  markNotificationRead: (id) => req('PATCH', `/notifications/${id}/read`),
  markAllNotificationsRead: () => req('POST', '/notifications/read-all'),
};

export default api;
