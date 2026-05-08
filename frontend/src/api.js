async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`https://findr-production-0355.up.railway.app${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401) { window.location.reload(); }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function getToken() {
  return localStorage.getItem('mm_token');
}

const api = {
  register: (email, password) => req('POST', '/api/auth/register', { email, password }),
  login: (email, password) => req('POST', '/api/auth/login', { email, password }),
  me: () => req('GET', '/api/auth/me'),
  getWatchlists: () => req('GET', '/api/watchlists'),
  createWatchlist: (data) => req('POST', '/api/watchlists', data),
  updateWatchlist: (id, data) => req('PUT', `/api/watchlists/${id}`, data),
  deleteWatchlist: (id) => req('DELETE', `/api/watchlists/${id}`),
  scanWatchlist: (id) => req('POST', `/api/watchlists/${id}/scan`),
  scanAll: () => req('POST', '/api/scan/all'),
  scanStatus: () => req('GET', '/api/scan/status'),
  getMatches: (params = {}) => req('GET', `/api/matches?${new URLSearchParams(params)}`),
  setFeedback: (id, feedback) => req('PATCH', `/api/matches/${id}/feedback`, { feedback }),
  markSeen: (watchlist_id) => req('POST', '/api/matches/mark-seen', { watchlist_id }),
  getStats: () => req('GET', '/api/stats'),
  getNotifications: () => req('GET', '/api/notifications'),
  getUnreadCount: () => req('GET', '/api/notifications/unread-count'),
  markNotificationRead: (id) => req('PATCH', `/api/notifications/${id}/read`),
  markAllNotificationsRead: () => req('POST', '/api/notifications/read-all'),
};

export default api;