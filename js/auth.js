// =============================================================================
// FAMILYHUB — auth.js
// Auth helpers + API client
// =============================================================================

// ─── Auth helpers ─────────────────────────────────────────────────────────────
const Auth = {
  getToken:   ()    => localStorage.getItem('fh_token'),
  getUser:    ()    => JSON.parse(localStorage.getItem('fh_user') || 'null'),
  isLoggedIn: ()    => !!localStorage.getItem('fh_token'),
  clear:      ()    => { localStorage.removeItem('fh_token'); localStorage.removeItem('fh_user'); },
};

// ─── API client ───────────────────────────────────────────────────────────────
const API = {
  _headers() {
    const h = { 'Content-Type': 'application/json' };
    if (Auth.getToken()) h['Authorization'] = `Bearer ${Auth.getToken()}`;
    return h;
  },
  async get(route) {
    try {
      const r = await fetch(`${API_BASE}api.php?r=${route}`, { headers: this._headers() });
      return await r.json();
    } catch { return { ok: false, error: 'offline' }; }
  },
  async post(route, body) {
    try {
      const r = await fetch(`${API_BASE}api.php?r=${route}`, {
        method: 'POST', headers: this._headers(), body: JSON.stringify(body),
      });
      return await r.json();
    } catch { return { ok: false, error: 'offline' }; }
  },
  async syncData() {
    if (!Auth.isLoggedIn()) return;
    API.post('data', { data: DB }).catch(() => {});
  },
  async loadUserData() {
    if (!Auth.isLoggedIn()) return false;
    try {
      const res = await API.get('data');
      if (res.ok && res.data) {
        DB = res.data;
        const key = window._dbStorageKey || 'familyHubDB';
        localStorage.setItem(key, JSON.stringify(DB));
        return true;
      }
      return false;
    } catch { return false; }
  },
  async loadNotifications() {
    if (!Auth.isLoggedIn()) return;
    const res = await API.get('notifications');
    if (res.ok && res.notifications) {
      DB.notificacoes = res.notifications.map(n => ({
        id: n.id, title: n.title, msg: n.message,
        type: n.type, icon: n.icon, read: !!n.is_read, date: n.created_at,
      }));
      saveDB(false);
      updateNotifBadge();
    }
  },
  async markAllRead() {
    if (!Auth.isLoggedIn()) return;
    await API.post('notifications/read', {});
  },
};

// ─── Logout e Info do usuário ─────────────────────────────────────────────────
function handleLogout() {
  if(Auth.isLoggedIn()){fetch(`${API_BASE}auth.php?action=logout`,{method:'POST',headers:{Authorization:`Bearer ${Auth.getToken()}`}}).catch(()=>{});}
  Auth.clear();
  window.location.href = 'index.html';
}

function updateUserInfo() {
  const user=Auth.getUser(); if(!user)return;
  if(user.familyName&&DB.settings.familyName==='Família Gomes'){DB.settings.familyName=user.familyName;}
}
