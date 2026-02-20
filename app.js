// =============================================================================
// FAMILYHUB — Script Principal  (v2)
// Arquitetura: Auth → API → Estado → DB → Gamificação → Notificações → Views
// =============================================================================

const API_BASE = './';

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

// =============================================================================
// 1. ESTADO GLOBAL
// =============================================================================
let currentView = 'dashboard';
let isDarkMode  = localStorage.getItem('familyHubDarkMode') === 'true';

let filterAtividades          = 'Todas';
let filterAtividadesMembro    = 'Todos';
let filterAtividadesStatus    = 'Todas';
let filterAtividadesPrioridade= 'Todas';
let sortAtividades            = 'data';
let searchAtividades          = '';

let filterReceitas = 'Todas';
let searchReceitas = '';

let calMonth       = new Date().getMonth();
let calYear        = new Date().getFullYear();
let calFilterMembro= 'Todos';
let calFilterCat   = 'Todas';

let globalSearch     = '';
let globalSearchOpen = false;

// ─── Menu de navegação lateral ────────────────────────────────────────────────
const MENU = [
  { id: 'dashboard',    label: 'Dashboard',       icon: 'layout-dashboard', subtitle: 'Visão geral da sua tribo.'          },
  { id: 'calendario',   label: 'Calendário',       icon: 'calendar',         subtitle: 'Navegue e filtre os eventos.'        },
  { id: 'atividades',   label: 'Atividades',       icon: 'check-square',     subtitle: 'Gestão de tarefas com filtros.'      },
  { id: 'compras',      label: 'Listas & Compras', icon: 'shopping-cart',    subtitle: 'Adicione, mova e remova itens.'      },
  { id: 'receitas',     label: 'Receitas',         icon: 'chef-hat',         subtitle: 'Gerencie seu cardápio e preparos.'   },
  { id: 'membros',      label: 'Membros',          icon: 'users',            subtitle: 'Gerencie quem faz parte da família.' },
  { id: 'ranking',      label: 'Ranking',          icon: 'trophy',           subtitle: 'Pontuação e conquistas da família.'  },
  { id: 'estatisticas', label: 'Estatísticas',     icon: 'bar-chart-2',      subtitle: 'Análise detalhada do progresso.'     },
];

// =============================================================================
// 2. BANCO DE DADOS (localStorage + Dados Padrão)
// =============================================================================
const defaultDB = {
  settings: { familyName: 'Família Gomes', email: 'contato@familia.com', photo: '' },
  gamification: {
    pontos: {},
    conquistas: [],
    streaks: {},
    lastActivityDate: {},
    premios_resgatados: [],   // { id, memberId, date }
    desafios: [],              // desafios ativos/completados
  },
  notificacoes: [],
  atividades: [
    { id: 1, title: 'Compras do Mês', date: '2026-02-19', time: '09:00', tag: 'TAREFA DOMÉSTICA', resp: 'Papai', status: 'pendente',  priority: 'media',  notes: '', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { id: 2, title: 'Natação do Lucas',  date: '2026-02-19', time: '14:00', tag: 'ESPORTE',          resp: 'Lucas', status: 'andamento', priority: 'alta',   notes: 'Levar toalha e óculos', color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400' },
    { id: 3, title: 'Dentista (Revisão)',date: '2026-02-22', time: '15:30', tag: 'SAÚDE',            resp: 'Lucas', status: 'concluida', priority: 'alta',   notes: '', color: 'text-red-500 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
  ],
  listas: [
    { id: 1, title: 'Compras do Mês',     border: 'border-blue-500',    icon: 'shopping-cart', pendentes: ['Arroz 5kg','Feijão Carioca','Café 500g','Óleo de Soja'], carrinho: ['Azeite Extra Virgem','Sal'] },
    { id: 2, title: 'Feira & Hortifruti', border: 'border-emerald-500', icon: 'leaf',          pendentes: ['Tomate Italiano','Bananas Prata','Cebola','Alho'],         carrinho: [] },
    { id: 3, title: 'Farmácia & Geral',   border: 'border-purple-500',  icon: 'pill',          pendentes: ['Dipirona Gotas','Fio Dental','Shampoo'],                    carrinho: ['Vitamina C'] },
  ],
  receitas: [
    { id: 1, title: 'Bolo de Milho Cremoso', tag: 'DOCES', time: '45 min', diff: 'Fácil', porcoes: 8, img: 'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=800', ingredients: ['3 espigas de milho verde','1 xícara de açúcar','1 xícara de leite','1/2 xícara de óleo','3 ovos','1 colher de fermento'], steps: '1. Retire os grãos da espiga.\n2. Bata tudo no liquidificador.\n3. Misture o fermento.\n4. Asse a 180°C por 40 minutos.' },
    { id: 2, title: 'Lasanha à Bolonhesa',   tag: 'SALGADOS', time: '1h 20min', diff: 'Médio', porcoes: 6, img: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800', ingredients: ['500g de massa para lasanha','500g de carne moída','300g de mussarela','300g de presunto','2 sachês de molho de tomate','Alho e cebola'], steps: '1. Refogue alho, cebola e carne.\n2. Adicione molho e tempere.\n3. Monte em camadas: molho, massa, presunto, queijo.\n4. Asse por 30 min.' },
  ],
  membros: [
    { id: 1, name: 'Papai', role: 'PAI',   photo: 'https://i.pravatar.cc/150?img=11', border: 'border-blue-500',   borderHex: '#3b82f6' },
    { id: 2, name: 'Mamãe', role: 'MÃE',   photo: 'https://i.pravatar.cc/150?img=5',  border: 'border-pink-400',   borderHex: '#f472b6' },
    { id: 3, name: 'Lucas', role: 'FILHO', photo: 'https://i.pravatar.cc/150?img=12', border: 'border-orange-400', borderHex: '#fb923c' },
  ],
};

let DB = (() => {
  const stored = localStorage.getItem('familyHubDB');
  const db = stored ? JSON.parse(stored) : defaultDB;
  if (!db.settings)      db.settings  = defaultDB.settings;
  db.atividades = db.atividades.map(a  => ({ status: 'pendente', priority: 'media', notes: '', ...a }));
  db.listas     = db.listas.map((l, i) => ({ id: l.id || Date.now() + i, icon: l.icon || 'shopping-cart', ...l }));
  db.receitas   = db.receitas.map(r    => ({ porcoes: 4, ...r }));
  db.membros    = db.membros.map(m     => ({ borderHex: '#3b82f6', ...m }));
  if (!db.gamification)                       db.gamification = defaultDB.gamification;
  if (!db.gamification.pontos)                db.gamification.pontos = {};
  if (!db.gamification.conquistas)            db.gamification.conquistas = [];
  if (!db.gamification.streaks)               db.gamification.streaks = {};
  if (!db.gamification.lastActivityDate)      db.gamification.lastActivityDate = {};
  if (!db.gamification.premios_resgatados)    db.gamification.premios_resgatados = [];
  if (!db.gamification.desafios)              db.gamification.desafios = [];
  if (!db.notificacoes)                       db.notificacoes = [];
  return db;
})();

function saveDB(sync = true) {
  localStorage.setItem('familyHubDB', JSON.stringify(DB));
  updateSidebarSettings();
  if (sync) API.syncData();
}

// =============================================================================
// 3. TOASTS & CONFIRM
// =============================================================================
function toast(msg, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const colors = { success: 'bg-emerald-500', error: 'bg-red-500', info: 'bg-blue-500', warning: 'bg-amber-500' };
  const icons  = { success: 'check-circle', error: 'x-circle', info: 'info', warning: 'alert-triangle' };
  const el = document.createElement('div');
  el.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium ${colors[type]} transform translate-x-full transition-all duration-300 max-w-xs`;
  el.innerHTML = `<i data-lucide="${icons[type]}" class="w-4 h-4 flex-shrink-0"></i><span>${msg}</span>`;
  container.appendChild(el);
  lucide.createIcons({ nodes: [el] });
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('translate-x-full')));
  setTimeout(() => { el.classList.add('translate-x-full', 'opacity-0'); setTimeout(() => el.remove(), 300); }, duration);
}

function confirmDialog(msg, onConfirm) {
  const overlay = document.getElementById('confirm-overlay');
  document.getElementById('confirm-msg').textContent = msg;
  overlay.classList.remove('hidden');
  requestAnimationFrame(() => overlay.classList.remove('opacity-0'));
  document.getElementById('confirm-yes').onclick = () => { closeConfirm(); onConfirm(); };
  document.getElementById('confirm-no').onclick  = closeConfirm;
}
function closeConfirm() {
  const overlay = document.getElementById('confirm-overlay');
  overlay.classList.add('opacity-0');
  setTimeout(() => overlay.classList.add('hidden'), 200);
}

// =============================================================================
// 4. NAVEGAÇÃO E HEADER
// =============================================================================
function changeView(viewId) {
  currentView      = viewId;
  globalSearchOpen = false;
  globalSearch     = '';
  const searchInput = document.getElementById('global-search');
  if (searchInput) searchInput.value = '';
  closeSearchDropdown();
  renderApp();
}

function updateHeader() {
  const item = MENU.find(i => i.id === currentView);
  document.getElementById('page-title').textContent    = item ? item.label    : 'Configurações';
  document.getElementById('page-subtitle').textContent = item ? item.subtitle : 'Personalize o sistema.';
  const btn = document.getElementById('header-btn');
  const btnText = document.getElementById('header-btn-text');
  btn.style.display = 'flex';
  const headerActions = {
    dashboard:    { label: 'Nova Atividade', action: () => openModal('formAtividade') },
    calendario:   { label: 'Nova Atividade', action: () => openModal('formAtividade') },
    atividades:   { label: 'Nova Atividade', action: () => openModal('formAtividade') },
    receitas:     { label: 'Nova Receita',   action: () => openModal('formReceita')   },
    membros:      { label: 'Novo Membro',    action: () => openModal('formMembro')    },
    compras:      { label: 'Nova Lista',     action: () => openModal('formLista')     },
    estatisticas: { label: 'Exportar PDF',   action: () => toast('Exportação em breve!', 'info') },
  };
  const action = headerActions[currentView];
  if (action) { btnText.textContent = action.label; btn.onclick = action.action; }
  else { btn.style.display = 'none'; }
}

function renderSidebar() {
  const menu       = document.getElementById('nav-menu');
  const configMenu = document.getElementById('nav-config');
  menu.innerHTML   = '';
  const hoje              = new Date().toISOString().split('T')[0];
  const atividadesPendentes= DB.atividades.filter(a => a.status === 'pendente').length;
  const atrasadas         = DB.atividades.filter(a => a.status === 'pendente' && a.date < hoje).length;

  MENU.forEach(item => {
    const isActive = item.id === currentView;
    const btnClass = isActive
      ? 'bg-brand-main text-white shadow-sm'
      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100';
    let badge = '';
    if (item.id === 'atividades') {
      if (atrasadas > 0 && !isActive)
        badge = `<span class="ml-auto text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-red-500 text-white">${atrasadas}</span>`;
      else if (atividadesPendentes > 0)
        badge = `<span class="ml-auto text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/30 text-white' : 'bg-brand-main/15 text-brand-main'}">${atividadesPendentes}</span>`;
    }
    menu.innerHTML += `<li><button onclick="changeView('${item.id}')"
      class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-[14px] ${btnClass}">
      <i data-lucide="${item.icon}" class="w-5 h-5 flex-shrink-0"></i>
      <span>${item.label}</span>${badge}</button></li>`;
  });

  const topMembro = DB.membros.map(m => ({ ...m, pts: DB.gamification.pontos[m.name] || 0 })).sort((a,b) => b.pts - a.pts)[0];
  const miniRankHtml = topMembro ? `
    <li class="mb-1"><div class="px-4 py-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30">
      <p class="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-1.5">🏆 Líder da Semana</p>
      <div class="flex items-center gap-2">
        <img src="${topMembro.photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(topMembro.name)}" class="w-6 h-6 rounded-full object-cover">
        <p class="text-[12px] font-bold text-slate-700 dark:text-slate-200 truncate">${topMembro.name}</p>
        <span class="ml-auto text-[11px] font-black text-amber-600">${topMembro.pts}pts</span>
      </div></div></li>` : '';

  const isConfig = currentView === 'configuracoes';
  const confClass = isConfig ? 'bg-brand-main text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100';
  configMenu.innerHTML = `${miniRankHtml}
    <li><button onclick="changeView('configuracoes')"
      class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-[14px] ${confClass}">
      <i data-lucide="settings" class="w-5 h-5"></i><span>Configurações</span></button></li>
    <li><button onclick="handleLogout()"
      class="w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all font-medium text-[13px] text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
      <i data-lucide="log-out" class="w-4 h-4"></i><span>Sair</span></button></li>`;
}

function updateSidebarSettings() {
  const sideTitle = document.querySelector('aside h1');
  if (sideTitle) sideTitle.textContent = DB.settings.familyName;
  const sidePhoto = document.querySelector('aside .bg-brand-main\\/10');
  if (!sidePhoto) return;
  if (DB.settings.photo) {
    sidePhoto.innerHTML = `<img src="${DB.settings.photo}" class="w-full h-full rounded-full object-cover border-2 border-brand-main">`;
  } else {
    sidePhoto.innerHTML = `<i data-lucide="users" class="w-8 h-8"></i>`;
    lucide.createIcons();
  }
}

// =============================================================================
// 5. BUSCA GLOBAL
// =============================================================================
function initGlobalSearch() {
  const input = document.getElementById('global-search');
  if (!input) return;
  input.addEventListener('input', (e) => {
    globalSearch = e.target.value.trim();
    if (globalSearch.length >= 2) renderSearchDropdown(globalSearch);
    else closeSearchDropdown();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeSearchDropdown(); input.value = ''; globalSearch = ''; }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#global-search') && !e.target.closest('#search-dropdown')) closeSearchDropdown();
  });
}

function renderSearchDropdown(query) {
  const q = query.toLowerCase();
  let existing = document.getElementById('search-dropdown');
  if (!existing) {
    existing = document.createElement('div');
    existing.id = 'search-dropdown';
    existing.className = 'absolute top-full left-0 right-0 mt-2 bg-panel-light dark:bg-panel-dark rounded-2xl shadow-2xl border border-border-light dark:border-border-dark z-50 max-h-[420px] overflow-y-auto custom-scrollbar';
    document.querySelector('#global-search').parentElement.appendChild(existing);
    document.querySelector('#global-search').parentElement.style.position = 'relative';
  }

  const results = {
    atividades: DB.atividades.filter(a =>
      a.title.toLowerCase().includes(q) || a.resp.toLowerCase().includes(q) || (a.notes||'').toLowerCase().includes(q)
    ).slice(0, 5),
    receitas: DB.receitas.filter(r =>
      r.title.toLowerCase().includes(q) || r.tag.toLowerCase().includes(q)
    ).slice(0, 3),
    membros: DB.membros.filter(m =>
      m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q)
    ).slice(0, 3),
  };

  const total = results.atividades.length + results.receitas.length + results.membros.length;

  if (total === 0) {
    existing.innerHTML = `<div class="p-5 text-center text-slate-400 text-sm"><i data-lucide="search-x" class="w-6 h-6 mx-auto mb-2 opacity-40"></i><p>Nenhum resultado para "<b>${query}</b>"</p></div>`;
    lucide.createIcons({ nodes: [existing] });
    return;
  }

  let html = `<div class="p-2">`;

  if (results.atividades.length) {
    html += `<p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 py-1.5">Atividades</p>`;
    results.atividades.forEach(a => {
      const st = statusConfig[a.status];
      html += `<button onclick="changeView('atividades'); closeSearchDropdown(); document.getElementById('global-search').value=''"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group">
        <span class="w-7 h-7 rounded-lg flex items-center justify-center ${st.color} flex-shrink-0"><i data-lucide="${st.icon}" class="w-3.5 h-3.5"></i></span>
        <div class="flex-1 min-w-0">
          <p class="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">${highlight(a.title, q)}</p>
          <p class="text-[11px] text-slate-400">${a.date.split('-').reverse().join('/')} · ${a.resp}</p>
        </div></button>`;
    });
  }

  if (results.receitas.length) {
    html += `<p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 py-1.5 mt-1">Receitas</p>`;
    results.receitas.forEach(r => {
      html += `<button onclick="changeView('receitas'); closeSearchDropdown(); document.getElementById('global-search').value=''"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
        <span class="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
          <i data-lucide="chef-hat" class="w-3.5 h-3.5 text-orange-500"></i></span>
        <div class="flex-1 min-w-0">
          <p class="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">${highlight(r.title, q)}</p>
          <p class="text-[11px] text-slate-400">${r.tag} · ${r.time}</p>
        </div></button>`;
    });
  }

  if (results.membros.length) {
    html += `<p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 py-1.5 mt-1">Membros</p>`;
    results.membros.forEach(m => {
      html += `<button onclick="changeView('membros'); closeSearchDropdown(); document.getElementById('global-search').value=''"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
        <img src="${m.photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(m.name)}" class="w-7 h-7 rounded-full object-cover flex-shrink-0">
        <div class="flex-1 min-w-0">
          <p class="text-[13px] font-semibold text-slate-800 dark:text-slate-100">${highlight(m.name, q)}</p>
          <p class="text-[11px] text-slate-400">${m.role}</p>
        </div></button>`;
    });
  }

  html += `</div>`;
  existing.innerHTML = html;
  lucide.createIcons({ nodes: [existing] });
}

function closeSearchDropdown() {
  const el = document.getElementById('search-dropdown');
  if (el) el.remove();
}

function highlight(text, query) {
  if (!query) return text;
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>');
}

// =============================================================================
// 6. UTILITÁRIOS
// =============================================================================
function handleImageUpload(inputId, callback) {
  const file = document.getElementById(inputId).files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => callback(e.target.result);
  reader.readAsDataURL(file);
}

function formatDateLabel(dateStr) {
  const [y,m,d] = dateStr.split('-').map(Number);
  const date  = new Date(y, m-1, d);
  const hoje  = new Date(); hoje.setHours(0,0,0,0);
  const amanha= new Date(hoje); amanha.setDate(hoje.getDate()+1);
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate()-1);
  const fmtBR = dateStr.split('-').reverse().join('/');
  if (date.toDateString() === hoje.toDateString())   return { label:'Hoje',   sub:fmtBR, highlight:true,  past:false };
  if (date.toDateString() === amanha.toDateString()) return { label:'Amanhã', sub:fmtBR, highlight:false, past:false };
  if (date.toDateString() === ontem.toDateString())  return { label:'Ontem',  sub:fmtBR, highlight:false, past:true  };
  const weekdays = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  return { label:weekdays[date.getDay()], sub:fmtBR, highlight:false, past:date<hoje };
}

function getTagColor(cat) {
  const map = {
    'TAREFA DOMÉSTICA': 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400',
    'ESCOLA':           'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
    'ESPORTE':          'text-orange-500 bg-orange-50 dark:bg-orange-900/30',
    'SAÚDE':            'text-red-500 bg-red-50 dark:bg-red-900/30',
  };
  return map[cat] || 'text-slate-500 bg-slate-100';
}

const priorityConfig = {
  baixa:   { label:'Baixa',   color:'text-slate-400', dot:'bg-slate-300', icon:'minus'    },
  media:   { label:'Média',   color:'text-amber-500', dot:'bg-amber-400', icon:'equal'    },
  alta:    { label:'Alta',    color:'text-red-500',   dot:'bg-red-400',   icon:'arrow-up' },
  urgente: { label:'Urgente', color:'text-red-700',   dot:'bg-red-600',   icon:'zap'      },
};

const statusConfig = {
  pendente:  { label:'Pendente',     color:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',       icon:'clock'           },
  andamento: { label:'Em Andamento', color:'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',           icon:'loader'          },
  concluida: { label:'Concluída',    color:'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',icon:'check-circle-2'  },
};

// =============================================================================
// 7. VIEW — DASHBOARD (aprimorado)
// =============================================================================
function renderDashboard() {
  const hoje       = new Date().toISOString().split('T')[0];
  const atividades = DB.atividades;

  const total      = atividades.length;
  const concluidas = atividades.filter(a => a.status==='concluida').length;
  const pendentes  = atividades.filter(a => a.status==='pendente').length;
  const andamento  = atividades.filter(a => a.status==='andamento').length;
  const atrasadas  = atividades.filter(a => a.status==='pendente' && a.date<hoje).length;
  const pct        = total > 0 ? Math.round((concluidas/total)*100) : 0;

  // Atividades da próxima semana
  const semana = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate()+i);
    return d.toISOString().split('T')[0];
  });
  const proxSemana = atividades.filter(a => semana.includes(a.date) && a.status!=='concluida').length;

  // Agenda do dia
  const ativHoje = atividades.filter(a => a.date===hoje).sort((a,b) => a.time.localeCompare(b.time));

  const timelineHTML = ativHoje.length > 0
    ? ativHoje.map(item => {
        const isConcluida = item.status==='concluida';
        return `<div class="relative pl-8 pb-5 border-l border-border-light dark:border-border-dark last:border-transparent last:pb-0">
          <div class="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full ${isConcluida ? 'bg-slate-400' : 'bg-brand-main'} ring-4 ring-white dark:ring-slate-900"></div>
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1">
              <h4 class="text-[14px] font-semibold ${isConcluida ? 'line-through text-slate-400' : ''}">${item.title}</h4>
              <div class="flex flex-wrap items-center gap-2 mt-1">
                <span class="text-[11px] font-extrabold px-2 py-0.5 rounded border ${item.color}">${item.tag}</span>
                <span class="text-[12px] text-slate-400 flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i>${item.time}</span>
                <span class="text-[12px] text-slate-400">${item.resp}</span>
              </div>
            </div>
            <button onclick="toggleStatusAtividade(${item.id}); renderApp()" title="Marcar concluída"
              class="w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
              ${isConcluida ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-brand-main'}">
              ${isConcluida ? '<i data-lucide="check" class="w-3 h-3"></i>' : ''}
            </button>
          </div></div>`;
      }).join('')
    : `<div class="text-center py-6"><i data-lucide="sun" class="w-8 h-8 mx-auto mb-2 text-amber-400 opacity-70"></i>
        <p class="text-slate-500 text-sm font-medium">Dia livre! Nenhuma atividade hoje.</p></div>`;

  // Faixa semanal
  const weekDays = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate()+i);
    const dateStr = d.toISOString().split('T')[0];
    const count   = atividades.filter(a => a.date===dateStr).length;
    const conclStr= atividades.filter(a => a.date===dateStr && a.status==='concluida').length;
    return { dateStr, count, conclStr, isToday:i===0, weekday:['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()], day:d.getDate() };
  });
  const weekStripHTML = weekDays.map(w => `
    <div class="flex flex-col items-center gap-1 cursor-pointer group"
      onclick="calMonth=${new Date(w.dateStr.split('-')[0], w.dateStr.split('-')[1]-1,1).getMonth()}; calYear=${w.dateStr.split('-')[0]}; changeView('calendario')">
      <span class="text-[10px] font-bold uppercase text-slate-400 group-hover:text-brand-main transition-colors">${w.weekday}</span>
      <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all
        ${w.isToday ? 'bg-brand-main text-white shadow-md' : 'group-hover:bg-brand-main/10 text-slate-600 dark:text-slate-300'}">${w.day}</div>
      ${w.count>0 ? `<div class="w-1.5 h-1.5 rounded-full ${w.isToday?'bg-white':'bg-brand-main'} opacity-80"></div>` : '<div class="w-1.5 h-1.5"></div>'}
    </div>`).join('');

  // Progresso circular
  const radius = 28; const circ = 2*Math.PI*radius;
  const strokeDash = `${(pct/100)*circ} ${circ}`;

  // Membros stats
  const membrosStats = DB.membros.map(m => ({
    ...m, pts: DB.gamification.pontos[m.name]||0,
    tarefas: atividades.filter(a => a.resp===m.name && a.status==='concluida').length,
    pendentesCount: atividades.filter(a => a.resp===m.name && a.status==='pendente').length,
  })).sort((a,b) => b.pts-a.pts);
  const topMembro = membrosStats[0];

  // Resumo de listas de compras
  const totalPendentesCompras = DB.listas.reduce((s,l) => s+l.pendentes.length, 0);
  const totalNoCarrinho       = DB.listas.reduce((s,l) => s+l.carrinho.length, 0);

  // Taxa de conclusão por categoria
  const categorias = [...new Set(atividades.map(a => a.tag))];
  const catStats = categorias.map(cat => {
    const catAts = atividades.filter(a => a.tag===cat);
    const catConc = catAts.filter(a => a.status==='concluida').length;
    return { cat, total: catAts.length, concluidas: catConc, pct: catAts.length>0 ? Math.round((catConc/catAts.length)*100) : 0 };
  }).sort((a,b) => b.total - a.total).slice(0,4);

  // Mural por categoria
  const muralCategories = [
    { tag:'ESCOLA',           icon:'book-open',   color:'text-blue-500',    bg:'bg-blue-50 dark:bg-blue-900/20'     },
    { tag:'ESPORTE',          icon:'trophy',      color:'text-orange-500',  bg:'bg-orange-50 dark:bg-orange-900/20' },
    { tag:'SAÚDE',            icon:'heart-pulse', color:'text-red-500',     bg:'bg-red-50 dark:bg-red-900/20'       },
    { tag:'TAREFA DOMÉSTICA', icon:'home',        color:'text-emerald-500', bg:'bg-emerald-50 dark:bg-emerald-900/20'},
  ];
  const muralHTML = muralCategories.map(cat => {
    const tasks = atividades.filter(a => a.tag===cat.tag && a.date>=hoje && a.status!=='concluida').slice(0,3);
    if (!tasks.length) return '';
    return `<div class="bg-panel-light dark:bg-panel-dark p-5 rounded-2xl shadow-sm border border-border-light dark:border-border-dark">
      <h3 class="font-bold text-[13px] flex items-center gap-2 mb-4 uppercase tracking-widest">
        <span class="p-1.5 rounded-lg ${cat.bg}"><i data-lucide="${cat.icon}" class="w-4 h-4 ${cat.color}"></i></span>
        <span class="text-slate-600 dark:text-slate-300">${cat.tag}</span></h3>
      <div class="space-y-2.5">
        ${tasks.map(t => { const p=priorityConfig[t.priority]||priorityConfig.media; return `
          <div class="flex items-center gap-3 p-2.5 bg-bg-light dark:bg-slate-800/50 rounded-xl">
            <div class="w-2 h-2 rounded-full flex-shrink-0 ${p.dot}"></div>
            <div class="flex-1 min-w-0">
              <p class="text-[13px] font-semibold truncate">${t.title}</p>
              <p class="text-[11px] text-slate-400 mt-0.5">${t.date.split('-').reverse().join('/')} · ${t.resp}</p>
            </div></div>`;}).join('')}
      </div></div>`;
  }).join('');

  // Progresso mensal (últimos 6 meses simulado)
  const now = new Date();
  const monthLabels = Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1); return d.toLocaleString('pt-BR',{month:'short'});});
  const monthData = Array.from({length:6},(_,i)=>{
    const d = new Date(now.getFullYear(),now.getMonth()-5+i,1);
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const conc = atividades.filter(a=>a.date.startsWith(ym)&&a.status==='concluida').length;
    const tot  = atividades.filter(a=>a.date.startsWith(ym)).length;
    return {conc,tot};
  });
  const maxMonth = Math.max(...monthData.map(m=>m.tot),1);
  const chartBarsHTML = monthData.map((m,i)=>`
    <div class="flex flex-col items-center gap-1 flex-1">
      <span class="text-[9px] font-bold text-brand-main">${m.conc>0?m.conc:''}</span>
      <div class="w-full relative flex flex-col justify-end" style="height:60px">
        <div class="w-full rounded-t-lg bg-slate-100 dark:bg-slate-800 absolute bottom-0" style="height:100%"></div>
        <div class="w-full rounded-t-lg bg-brand-main/80 absolute bottom-0 transition-all duration-700" style="height:${m.tot>0?Math.round((m.conc/maxMonth)*100):0}%"></div>
        ${m.tot>0?`<div class="w-full rounded-t-lg border-2 border-dashed border-brand-main/30 absolute bottom-0" style="height:${Math.round((m.tot/maxMonth)*100)}%"></div>`:''}
      </div>
      <span class="text-[9px] text-slate-400 font-medium capitalize">${monthLabels[i]}</span>
    </div>`).join('');

  return `<div class="flex flex-col xl:flex-row gap-8 h-full items-start">
    <!-- ═══ COLUNA ESQUERDA ═══ -->
    <div class="w-full xl:w-[380px] flex flex-col gap-5 flex-shrink-0">

      <!-- Banner de boas-vindas -->
      <div class="bg-gradient-to-br from-brand-main to-[#2c5c4e] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div class="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full blur-2xl"></div>
        <div class="absolute -left-4 -bottom-8 w-28 h-28 bg-black/10 rounded-full blur-xl"></div>
        <div class="relative z-10 flex items-start justify-between gap-4">
          <div class="flex-1">
            <p class="text-emerald-200 text-[11px] font-bold uppercase tracking-widest mb-1">
              ${new Date().toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long'})}
            </p>
            <h3 class="text-2xl font-bold mb-4">${DB.settings.familyName} 👋</h3>
            <div class="flex gap-2 flex-wrap">
              <button onclick="openModal('formAtividade')"
                class="bg-white text-brand-main px-4 py-2 rounded-xl font-bold text-[13px] hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
                <i data-lucide="plus" class="w-4 h-4"></i> Atividade</button>
              <button onclick="changeView('estatisticas')"
                class="bg-white/20 text-white px-4 py-2 rounded-xl font-bold text-[13px] hover:bg-white/30 transition-colors flex items-center gap-2">
                <i data-lucide="bar-chart-2" class="w-4 h-4"></i> Stats</button>
            </div>
          </div>
          <div class="flex flex-col items-center">
            <svg width="70" height="70" viewBox="0 0 70 70" class="-rotate-90">
              <circle cx="35" cy="35" r="${radius}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="5"/>
              <circle cx="35" cy="35" r="${radius}" fill="none" stroke="white" stroke-width="5"
                stroke-dasharray="${strokeDash}" stroke-linecap="round" class="transition-all duration-1000"/>
            </svg>
            <div class="text-center -mt-14"><p class="text-xl font-black">${pct}%</p><p class="text-[9px] text-emerald-200 uppercase tracking-wider">feito</p></div>
          </div>
        </div>
      </div>

      <!-- Faixa semanal -->
      <div class="bg-panel-light dark:bg-panel-dark rounded-2xl px-4 py-3 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex justify-between items-center">${weekStripHTML}</div>
      </div>

      <!-- Cards de stats – grade 2x2 melhorada -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-panel-light dark:bg-panel-dark rounded-xl p-4 border border-border-light dark:border-border-dark shadow-sm">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg"><i data-lucide="clock" class="w-4 h-4 text-amber-500"></i></div>
            <p class="text-2xl font-black text-amber-500">${pendentes}</p>
          </div>
          <p class="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Pendentes</p>
        </div>
        <div class="bg-panel-light dark:bg-panel-dark rounded-xl p-4 border border-border-light dark:border-border-dark shadow-sm">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><i data-lucide="loader" class="w-4 h-4 text-blue-500"></i></div>
            <p class="text-2xl font-black text-blue-500">${andamento}</p>
          </div>
          <p class="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Andamento</p>
        </div>
        <div class="bg-panel-light dark:bg-panel-dark rounded-xl p-4 border border-border-light dark:border-border-dark shadow-sm">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg"><i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-500"></i></div>
            <p class="text-2xl font-black text-emerald-500">${concluidas}</p>
          </div>
          <p class="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Concluídas</p>
        </div>
        <div class="bg-panel-light dark:bg-panel-dark rounded-xl p-4 border border-border-light dark:border-border-dark shadow-sm">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-2 ${atrasadas>0?'bg-red-50 dark:bg-red-900/20':'bg-slate-50 dark:bg-slate-800'} rounded-lg"><i data-lucide="alert-triangle" class="w-4 h-4 ${atrasadas>0?'text-red-500':'text-slate-400'}"></i></div>
            <p class="text-2xl font-black ${atrasadas>0?'text-red-500':'text-slate-400'}">${atrasadas}</p>
          </div>
          <p class="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Atrasadas</p>
        </div>
      </div>

      <!-- Gráfico de barras mensal -->
      <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-5 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <i data-lucide="bar-chart-2" class="w-3.5 h-3.5"></i> Progresso Mensal
          </h3>
          <div class="flex items-center gap-3 text-[9px] font-bold">
            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-brand-main/80 inline-block"></span>Concluídas</span>
            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm border-2 border-dashed border-brand-main/50 inline-block"></span>Total</span>
          </div>
        </div>
        <div class="flex items-end gap-1.5">${chartBarsHTML}</div>
      </div>

      <!-- Destaques rápidos -->
      <div class="grid grid-cols-2 gap-3">
        ${topMembro ? `
        <div class="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10 rounded-xl p-3.5 border border-amber-200 dark:border-amber-800/40">
          <p class="text-[9px] font-extrabold uppercase tracking-widest text-amber-500 mb-2">🏆 Líder</p>
          <div class="flex items-center gap-2">
            <img src="${topMembro.photo||'https://ui-avatars.com/api/?name='+encodeURIComponent(topMembro.name)}" class="w-8 h-8 rounded-full object-cover">
            <div><p class="text-[13px] font-bold truncate">${topMembro.name}</p><p class="text-[10px] text-amber-600 font-bold">${topMembro.pts} pts</p></div>
          </div></div>` : '<div></div>'}
        <div class="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl p-3.5 border border-blue-200 dark:border-blue-800/40">
          <p class="text-[9px] font-extrabold uppercase tracking-widest text-blue-500 mb-2">🛒 Compras</p>
          <p class="text-xl font-black text-blue-600">${totalPendentesCompras}</p>
          <p class="text-[10px] text-blue-500 font-semibold">${totalNoCarrinho} no carrinho</p>
        </div>
      </div>

      <!-- Próxima semana info -->
      ${proxSemana > 0 ? `
      <div class="bg-panel-light dark:bg-panel-dark rounded-xl p-3.5 border border-border-light dark:border-border-dark shadow-sm flex items-center gap-3">
        <div class="p-2 bg-brand-main/10 rounded-lg"><i data-lucide="calendar" class="w-4 h-4 text-brand-main"></i></div>
        <div><p class="text-[13px] font-bold">${proxSemana} atividade${proxSemana>1?'s':''} essa semana</p>
          <p class="text-[11px] text-slate-400">Próximos 7 dias</p></div>
        <button onclick="changeView('calendario')" class="ml-auto text-brand-main hover:underline text-[12px] font-bold">Ver →</button>
      </div>` : ''}

      <!-- Desempenho por membro -->
      ${DB.membros.length > 0 ? `
      <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-5 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <i data-lucide="users" class="w-3.5 h-3.5"></i> Desempenho
          </h3>
          <button onclick="changeView('ranking')" class="text-brand-main text-[11px] font-bold hover:underline">Ranking →</button>
        </div>
        <div class="space-y-3">
          ${membrosStats.map(m => `
          <div class="flex items-center gap-3">
            <img src="${m.photo||'https://ui-avatars.com/api/?name='+encodeURIComponent(m.name)}" class="w-7 h-7 rounded-full object-cover flex-shrink-0">
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <p class="text-[12px] font-semibold truncate">${m.name}</p>
                <span class="text-[11px] font-bold text-brand-main">${m.tarefas} ✓</span>
              </div>
              <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-brand-main to-emerald-400 transition-all duration-700" style="width:${total>0?Math.round((m.tarefas/total)*100):0}%"></div>
              </div>
            </div>
          </div>`).join('')}
        </div>
      </div>` : ''}

      <!-- Agenda de Hoje -->
      <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-5 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <i data-lucide="clock" class="w-3.5 h-3.5"></i> Agenda de Hoje
          </h3>
          <span class="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-bold">${ativHoje.length} eventos</span>
        </div>
        ${timelineHTML}
      </div>
    </div>

    <!-- ═══ COLUNA DIREITA ═══ -->
    <div class="flex-1 w-full space-y-6">

      <!-- Taxa de conclusão por categoria -->
      ${catStats.length > 0 ? `
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold">Por Categoria</h3>
          <button onclick="changeView('atividades')" class="text-brand-main text-sm font-bold hover:underline">Ver todas →</button>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${catStats.map(cs => `
          <div class="bg-panel-light dark:bg-panel-dark rounded-xl p-4 border border-border-light dark:border-border-dark shadow-sm text-center">
            <div class="relative inline-flex items-center justify-center w-14 h-14 mb-3">
              <svg width="56" height="56" viewBox="0 0 56 56" class="-rotate-90">
                <circle cx="28" cy="28" r="22" fill="none" stroke="#e2e8f0" stroke-width="4"/>
                <circle cx="28" cy="28" r="22" fill="none" stroke="#438370" stroke-width="4"
                  stroke-dasharray="${(cs.pct/100)*(2*Math.PI*22)} ${2*Math.PI*22}" stroke-linecap="round"/>
              </svg>
              <span class="absolute text-[11px] font-black text-brand-main">${cs.pct}%</span>
            </div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">${cs.cat}</p>
            <p class="text-[11px] text-slate-400">${cs.concluidas}/${cs.total}</p>
          </div>`).join('')}
        </div>
      </div>` : ''}

      <!-- Mural da tribo -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold">Mural da Tribo</h3>
          <button onclick="changeView('atividades')" class="text-brand-main text-sm font-bold hover:underline flex items-center gap-1">
            Ver tudo <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i></button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          ${muralHTML || `<div class="col-span-2 text-center py-12 text-slate-400">
            <i data-lucide="party-popper" class="w-12 h-12 mx-auto mb-3 opacity-30"></i>
            <p class="font-medium">Tudo em dia! Nenhum evento futuro.</p></div>`}
        </div>
      </div>

      <!-- Visão geral das receitas -->
      ${DB.receitas.length > 0 ? `
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold">Receitas da Família</h3>
          <button onclick="changeView('receitas')" class="text-brand-main text-sm font-bold hover:underline">Ver todas →</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          ${DB.receitas.slice(0,2).map(r => `
          <div class="bg-panel-light dark:bg-panel-dark rounded-2xl overflow-hidden shadow-sm border border-border-light dark:border-border-dark flex">
            <img src="${r.img}" alt="${r.title}" class="w-20 h-20 object-cover flex-shrink-0">
            <div class="p-3 flex-1 min-w-0">
              <p class="font-bold text-[13px] truncate">${r.title}</p>
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <span class="text-[10px] bg-brand-main/10 text-brand-main font-bold px-1.5 py-0.5 rounded">${r.tag}</span>
                <span class="text-[10px] text-slate-400 flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i>${r.time}</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-1">${r.diff} · ${r.porcoes} porções</p>
            </div>
          </div>`).join('')}
        </div>
      </div>` : ''}
    </div>
  </div>`;
}

// =============================================================================
// 8. VIEW — CALENDÁRIO
// =============================================================================
function renderCalendar() {
  const months     = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const firstDay   = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth= new Date(calYear, calMonth+1, 0).getDate();
  const totalCells = Math.ceil((firstDay+daysInMonth)/7)*7;
  let gridHtml = '';

  for (let i=0; i<totalCells; i++) {
    const isEmpty = i<firstDay || i>=firstDay+daysInMonth;
    if (isEmpty) {
      gridHtml += `<div class="p-2 min-h-[100px] border-b border-r border-border-light dark:border-border-dark bg-slate-50/60 dark:bg-slate-800/20"></div>`;
    } else {
      const d = i-firstDay+1;
      const dataStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday = new Date().toDateString()===new Date(calYear,calMonth,d).toDateString();
      const dailyActs = DB.atividades.filter(at => {
        if (at.date!==dataStr) return false;
        if (calFilterMembro!=='Todos' && at.resp!==calFilterMembro) return false;
        if (calFilterCat!=='Todas' && at.tag!==calFilterCat.toUpperCase()) return false;
        return true;
      });
      const actsHtml = dailyActs.slice(0,3).map(at =>
        `<div class="${at.color} text-[9px] font-bold px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer hover:opacity-80 ${at.status==='concluida'?'opacity-50 line-through':''}"
           title="${at.title}" onclick="openModal('formAtividade',${at.id})">${at.time} ${at.title}</div>`
      ).join('');
      const extra = dailyActs.length>3 ? `<div class="text-[9px] text-slate-400 font-bold pl-1">+${dailyActs.length-3} mais</div>` : '';
      gridHtml += `<div class="border-b border-r border-border-light dark:border-border-dark p-1.5 min-h-[100px] flex flex-col overflow-hidden
        ${isToday?'bg-brand-main/5':''} hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer group"
        onclick="openModal('formAtividade',null,'${dataStr}')">
        <span class="text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0
          ${isToday?'bg-brand-main text-white':'text-slate-600 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}">${d}</span>
        <div class="flex-1 overflow-hidden">${actsHtml}${extra}</div></div>`;
    }
  }

  const selectClass = 'px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-medium focus:outline-none focus:border-brand-main';
  const membrosOpts = ['Todos',...DB.membros.map(m=>m.name)].map(m=>`<option ${calFilterMembro===m?'selected':''}>${m}</option>`).join('');
  const catOpts     = ['Todas','Tarefa Doméstica','Escola','Esporte','Saúde'].map(c=>`<option ${calFilterCat===c?'selected':''}>${c}</option>`).join('');

  return `<div class="flex flex-col h-full bg-panel-light dark:bg-panel-dark rounded-2xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
    <div class="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/50">
      <div class="flex items-center gap-3">
        <button onclick="mudaMes(-1)" class="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="chevron-left" class="w-5 h-5"></i></button>
        <h2 class="text-xl font-bold min-w-[180px] text-center text-brand-main">${months[calMonth]} ${calYear}</h2>
        <button onclick="mudaMes(1)" class="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="chevron-right" class="w-5 h-5"></i></button>
        <button onclick="calMonth=${new Date().getMonth()}; calYear=${new Date().getFullYear()}; renderApp()"
          class="px-3 py-1.5 text-xs font-bold bg-brand-main/10 text-brand-main rounded-lg hover:bg-brand-main/20">Hoje</button>
      </div>
      <div class="flex gap-2">
        <select onchange="calFilterMembro=this.value; renderApp()" class="${selectClass}">${membrosOpts}</select>
        <select onchange="calFilterCat=this.value; renderApp()" class="${selectClass}">${catOpts}</select>
      </div>
    </div>
    <div class="grid grid-cols-7 border-b border-border-light dark:border-border-dark text-center text-[10px] font-extrabold text-slate-400 py-2 uppercase tracking-widest">
      <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
    </div>
    <div class="grid grid-cols-7 flex-1 overflow-y-auto">${gridHtml}</div>
  </div>`;
}
function mudaMes(dir) { calMonth+=dir; if(calMonth>11){calMonth=0;calYear++;} if(calMonth<0){calMonth=11;calYear--;} renderApp(); }

// =============================================================================
// 9. VIEW — ATIVIDADES (mantida + pequenas melhorias)
// =============================================================================
function renderAtividades() {
  const hoje = new Date().toISOString().split('T')[0];
  const total     = DB.atividades.length;
  const concluidas= DB.atividades.filter(a=>a.status==='concluida').length;
  const pendentes = DB.atividades.filter(a=>a.status==='pendente').length;
  const andamento = DB.atividades.filter(a=>a.status==='andamento').length;
  const atrasadas = DB.atividades.filter(a=>a.status==='pendente'&&a.date<hoje).length;
  const pct = total>0?Math.round((concluidas/total)*100):0;

  const resumoHTML = `<div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-5 shadow-sm border border-border-light dark:border-border-dark mb-6">
    <div class="flex items-center justify-between mb-3">
      <span class="text-sm font-bold">Progresso Geral</span>
      <span class="text-sm font-black text-brand-main">${pct}% concluído</span>
    </div>
    <div class="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
      <div class="h-full bg-gradient-to-r from-brand-main to-emerald-400 rounded-full transition-all duration-700" style="width:${pct}%"></div>
    </div>
    <div class="grid grid-cols-4 gap-3">
      ${[{label:'Total',val:total,color:'text-slate-700 dark:text-slate-200',bg:'bg-slate-100 dark:bg-slate-800',icon:'list'},
         {label:'Pendentes',val:pendentes,color:'text-amber-600',bg:'bg-amber-50 dark:bg-amber-900/20',icon:'clock'},
         {label:'Andamento',val:andamento,color:'text-blue-600',bg:'bg-blue-50 dark:bg-blue-900/20',icon:'loader'},
         {label:'Concluídas',val:concluidas,color:'text-emerald-600',bg:'bg-emerald-50 dark:bg-emerald-900/20',icon:'check-circle-2'},
        ].map(s=>`<div class="flex items-center gap-2.5 p-3 ${s.bg} rounded-xl">
          <i data-lucide="${s.icon}" class="w-4 h-4 ${s.color} flex-shrink-0"></i>
          <div><p class="text-lg font-black ${s.color} leading-none">${s.val}</p>
          <p class="text-[10px] text-slate-400 font-semibold mt-0.5">${s.label}</p></div></div>`).join('')}
    </div>
    ${atrasadas>0?`<div class="mt-3 flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-900/40">
      <i data-lucide="alert-triangle" class="w-4 h-4 text-red-500 flex-shrink-0"></i>
      <p class="text-[13px] text-red-600 dark:text-red-400 font-semibold">${atrasadas} atividade${atrasadas>1?'s':''} em atraso!</p>
      <button onclick="filterAtividadesStatus='pendente'; renderApp()" class="ml-auto text-[11px] text-red-500 font-bold underline">Ver</button>
    </div>`:''}
  </div>`;

  const cats = ['Todas','Tarefa Doméstica','Escola','Esporte','Saúde'];
  const filterCatHtml = cats.map(c=>`<button onclick="filterAtividades='${c}'; renderApp()"
    class="px-4 py-1.5 rounded-full text-[12px] font-bold transition-all whitespace-nowrap
    ${filterAtividades===c?'bg-brand-main text-white shadow-md':'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-border-light dark:border-border-dark hover:border-brand-main/50'}">${c}</button>`).join('');

  const statusOpts=[{v:'Todas',l:'Todos',icon:'layers'},{v:'pendente',l:'Pendente',icon:'clock'},{v:'andamento',l:'Andamento',icon:'loader'},{v:'concluida',l:'Concluída',icon:'check-circle-2'}];
  const filterStatusHtml=statusOpts.map(s=>`<button onclick="filterAtividadesStatus='${s.v}'; renderApp()"
    class="px-4 py-1.5 rounded-full text-[12px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5
    ${filterAtividadesStatus===s.v?'bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-md':'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-border-light dark:border-border-dark'}">
    <i data-lucide="${s.icon}" class="w-3 h-3"></i> ${s.l}</button>`).join('');

  const prioOpts=['Todas','baixa','media','alta','urgente'];
  const filterPrioHtml=prioOpts.map(p=>{const cfg=p==='Todas'?{label:'Prioridade',dot:'bg-slate-300'}:priorityConfig[p]; return `<button onclick="filterAtividadesPrioridade='${p}'; renderApp()"
    class="px-4 py-1.5 rounded-full text-[12px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5
    ${filterAtividadesPrioridade===p?'bg-slate-700 text-white shadow-md':'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-border-light dark:border-border-dark'}">
    <div class="w-2 h-2 rounded-full ${cfg.dot||'bg-slate-400'}"></div> ${cfg.label||'Todas'}</button>`;}).join('');

  const selectClass='px-3 py-2 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium focus:outline-none focus:border-brand-main';
  const membrosOpts=['Todos',...DB.membros.map(m=>m.name)].map(m=>`<option ${filterAtividadesMembro===m?'selected':''}>${m}</option>`).join('');
  const sortOpts=[{v:'data',l:'Por Data'},{v:'titulo',l:'Por Título'},{v:'resp',l:'Por Responsável'},{v:'prio',l:'Por Prioridade'}].map(o=>`<option value="${o.v}" ${sortAtividades===o.v?'selected':''}>${o.l}</option>`).join('');

  let filtered = DB.atividades.filter(a => {
    if (filterAtividades!=='Todas' && a.tag!==filterAtividades.toUpperCase()) return false;
    if (filterAtividadesMembro!=='Todos' && a.resp!==filterAtividadesMembro) return false;
    if (filterAtividadesStatus!=='Todas' && a.status!==filterAtividadesStatus) return false;
    if (filterAtividadesPrioridade!=='Todas' && a.priority!==filterAtividadesPrioridade) return false;
    if (searchAtividades) {
      const q=searchAtividades.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.resp.toLowerCase().includes(q) && !(a.notes||'').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const prioOrder={urgente:0,alta:1,media:2,baixa:3};
  const sorters={data:(a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time),titulo:(a,b)=>a.title.localeCompare(b.title),resp:(a,b)=>a.resp.localeCompare(b.resp),prio:(a,b)=>(prioOrder[a.priority]??2)-(prioOrder[b.priority]??2)};
  if (sorters[sortAtividades]) filtered.sort(sorters[sortAtividades]);

  let listHtml = '';
  if (filtered.length>0) {
    const groups = filtered.reduce((acc,at) => { if(!acc[at.date])acc[at.date]=[]; acc[at.date].push(at); return acc; }, {});
    Object.keys(groups).forEach(date => {
      const {label,sub,highlight,past} = formatDateLabel(date);
      listHtml += `<div class="mb-1"><div class="flex items-center gap-3 mb-3 sticky top-0 bg-bg-light dark:bg-bg-dark py-1 z-10">
        <span class="text-[12px] font-extrabold uppercase tracking-widest ${highlight?'text-brand-main':past?'text-red-400':'text-slate-400'}">${label}</span>
        <span class="text-[11px] text-slate-400 font-medium">${sub}</span>
        <div class="flex-1 h-px bg-border-light dark:bg-border-dark"></div>
        <span class="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-bold">${groups[date].length}</span>
      </div>
      <div class="space-y-2 mb-6">
        ${groups[date].map(at => {
          const atrasada  = at.status==='pendente'&&at.date<hoje;
          const st        = statusConfig[at.status]||statusConfig.pendente;
          const p         = priorityConfig[at.priority]||priorityConfig.media;
          const isConcluida=at.status==='concluida';
          return `<div class="flex items-center gap-3 p-4 bg-panel-light dark:bg-panel-dark rounded-xl shadow-sm border
            ${isConcluida?'border-emerald-200 dark:border-emerald-900/40 opacity-70':atrasada?'border-red-200 dark:border-red-800/50':'border-border-light dark:border-border-dark'}
            group hover:border-brand-main/40 hover:shadow-md transition-all">
            <button onclick="toggleStatusAtividade(${at.id})"
              class="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
              ${isConcluida?'bg-emerald-500 border-emerald-500 text-white':atrasada?'border-red-400 hover:bg-red-50':'border-slate-300 dark:border-slate-600 hover:border-brand-main'}">
              ${isConcluida?'<i data-lucide="check" class="w-3 h-3"></i>':''}
            </button>
            <div class="w-2 h-2 rounded-full flex-shrink-0 ${p.dot}"></div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="text-[14px] font-bold ${isConcluida?'line-through text-slate-400':''}">${at.title}</h4>
                ${atrasada?'<span class="text-[9px] font-extrabold text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded uppercase">Atrasada</span>':''}
              </div>
              <div class="flex flex-wrap items-center gap-2 mt-1.5">
                <span class="text-[11px] text-slate-400 flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i>${at.time}</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded border ${at.color}">${at.tag}</span>
                <span class="text-[11px] text-slate-400 flex items-center gap-1"><i data-lucide="user" class="w-3 h-3"></i>${at.resp}</span>
                ${at.notes?`<span class="text-[11px] text-slate-400 flex items-center gap-1" title="${at.notes}"><i data-lucide="file-text" class="w-3 h-3"></i>Nota</span>`:''}
              </div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              <div class="relative group/status hidden sm:block">
                <span class="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer select-none ${st.color}">
                  <i data-lucide="${st.icon}" class="w-3 h-3"></i> ${st.label}</span>
                <div class="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-border-light dark:border-border-dark z-20 w-42 overflow-hidden opacity-0 invisible group-hover/status:opacity-100 group-hover/status:visible transition-all duration-150">
                  ${Object.entries(statusConfig).map(([key,cfg])=>`<button onclick="setStatusAtividade(${at.id},'${key}')"
                    class="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700 ${at.status===key?'text-brand-main font-bold':'text-slate-700 dark:text-slate-200'}">
                    <i data-lucide="${cfg.icon}" class="w-3.5 h-3.5"></i>${cfg.label}</button>`).join('')}
                </div>
              </div>
              <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="openModal('formAtividade',${at.id})" class="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="Editar"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i></button>
                <button onclick="deleteAtividade(${at.id})" class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Excluir"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div></div>`;
    });
  } else {
    listHtml=`<div class="text-center py-16 text-slate-400">
      <i data-lucide="inbox" class="w-14 h-14 mx-auto mb-4 opacity-25"></i>
      <p class="text-lg font-semibold">Nenhuma atividade encontrada.</p>
      <button onclick="filterAtividades='Todas'; filterAtividadesMembro='Todos'; filterAtividadesStatus='Todas'; filterAtividadesPrioridade='Todas'; searchAtividades=''; renderApp()"
        class="mt-4 px-5 py-2 rounded-xl bg-brand-main/10 text-brand-main text-sm font-bold hover:bg-brand-main/20">Limpar filtros</button>
    </div>`;
  }

  return `<div class="max-w-4xl mx-auto">${resumoHTML}
    <div class="flex flex-col gap-2 mb-5">
      <div class="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">${filterCatHtml}</div>
      <div class="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">${filterStatusHtml}</div>
      <div class="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">${filterPrioHtml}</div>
    </div>
    <div class="flex items-center gap-3 mb-6 flex-wrap">
      <div class="flex-1 min-w-[180px] relative">
        <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input type="text" placeholder="Buscar atividade..." value="${searchAtividades}"
          oninput="searchAtividades=this.value; renderApp()"
          class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-main">
        ${searchAtividades?`<button onclick="searchAtividades=''; renderApp()" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>`:''}
      </div>
      <div class="flex items-center gap-2"><i data-lucide="users" class="w-4 h-4 text-slate-400"></i>
        <select onchange="filterAtividadesMembro=this.value; renderApp()" class="${selectClass}">${membrosOpts}</select></div>
      <div class="flex items-center gap-2"><i data-lucide="arrow-up-down" class="w-4 h-4 text-slate-400"></i>
        <select onchange="sortAtividades=this.value; renderApp()" class="${selectClass}">${sortOpts}</select></div>
      ${filtered.length>0?`<span class="text-[12px] text-slate-400 font-medium">${filtered.length} resultado${filtered.length!==1?'s':''}</span>`:''}
    </div>${listHtml}</div>`;
}


// =============================================================================
// 10. VIEW — LISTAS & COMPRAS
// =============================================================================
function renderListas() {
  const colunasHTML = DB.listas.map((lista, index) => {
    const total = lista.pendentes.length + lista.carrinho.length;
    const pct   = total>0 ? Math.round((lista.carrinho.length/total)*100) : 0;
    return `<div class="bg-panel-light dark:bg-panel-dark rounded-2xl shadow-md border border-border-light dark:border-border-dark flex flex-col h-full border-t-[5px] ${lista.border}">
      <div class="p-4 border-b border-border-light dark:border-border-dark">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold text-[15px] flex items-center gap-2">
            <i data-lucide="${lista.icon||'shopping-cart'}" class="w-4 h-4 opacity-60"></i>${lista.title}</h3>
          <div class="flex items-center gap-1">
            ${lista.carrinho.length>0?`<button onclick="limparCarrinho(${index})" class="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg hover:bg-emerald-100">Limpar concluídos</button>`:''}
            <button onclick="openModal('formLista',${lista.id})" class="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg"><i data-lucide="settings-2" class="w-3.5 h-3.5"></i></button>
            <button onclick="deleteLista(${index})" class="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full bg-emerald-400 rounded-full transition-all duration-500" style="width:${pct}%"></div>
          </div>
          <span class="text-[10px] font-bold text-slate-400">${lista.carrinho.length}/${total}</span>
        </div>
      </div>
      <div class="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-2">
        ${lista.pendentes.length===0&&lista.carrinho.length>0?`<div class="text-center py-4 text-slate-400"><i data-lucide="check-circle-2" class="w-7 h-7 mx-auto mb-1.5 text-emerald-400 opacity-60"></i><p class="text-[13px] font-medium">Tudo comprado!</p></div>`:''}
        ${lista.pendentes.length===0&&lista.carrinho.length===0?`<div class="text-center py-6 text-slate-400"><i data-lucide="clipboard-list" class="w-8 h-8 mx-auto mb-2 opacity-20"></i><p class="text-[13px]">Lista vazia</p></div>`:''}
        ${lista.pendentes.map((item,i)=>`<div class="flex items-center justify-between p-2.5 rounded-xl border border-border-light dark:border-border-dark hover:border-brand-main bg-white dark:bg-slate-800 transition-all group">
          <label class="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
            <input type="checkbox" onclick="checkItem(${index},${i})" class="w-4 h-4 text-brand-main rounded border-slate-300 flex-shrink-0">
            <span class="text-[14px] font-medium truncate">${item}</span>
          </label>
          <button onclick="deleteListItem(${index},${i},false)" class="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 flex-shrink-0"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
        </div>`).join('')}
        ${lista.carrinho.length>0?`<div class="pt-4 mt-2 border-t border-dashed border-border-light dark:border-border-dark">
          <p class="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><i data-lucide="shopping-cart" class="w-3 h-3"></i> No Carrinho</p>
          <div class="space-y-1.5">${lista.carrinho.map((item,i)=>`<div class="flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-900/10 group">
            <label class="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 opacity-60 hover:opacity-90">
              <input type="checkbox" checked onclick="uncheckItem(${index},${i})" class="w-3.5 h-3.5 text-emerald-500 rounded flex-shrink-0">
              <span class="text-[13px] font-medium line-through text-slate-500 truncate">${item}</span>
            </label>
            <button onclick="deleteListItem(${index},${i},true)" class="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 p-0.5 flex-shrink-0"><i data-lucide="x" class="w-3 h-3"></i></button>
          </div>`).join('')}</div></div>`:''}
      </div>
      <div class="p-3 border-t border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
        <div class="flex items-center gap-2 relative">
          <input type="text" id="add-item-${index}" placeholder="Adicionar item..."
            class="flex-1 pl-3 pr-9 py-2.5 rounded-xl border border-border-light dark:border-border-dark text-[14px] bg-white dark:bg-slate-900 focus:outline-none focus:border-brand-main shadow-sm"
            onkeypress="if(event.key==='Enter') addListItem(${index})">
          <button onclick="addListItem(${index})" class="absolute right-2 text-brand-main hover:bg-brand-main/10 p-1.5 rounded-lg"><i data-lucide="plus" class="w-4 h-4"></i></button>
        </div>
      </div>
    </div>`;
  }).join('');
  return `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 h-[calc(100vh-160px)]">
    ${colunasHTML}
    <button onclick="openModal('formLista')" class="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:text-brand-main hover:border-brand-main hover:bg-brand-main/5 min-h-[200px] transition-all group">
      <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-brand-main/10 flex items-center justify-center mb-3"><i data-lucide="plus" class="w-6 h-6"></i></div>
      <p class="font-bold text-sm">Nova Lista</p>
    </button>
  </div>`;
}

// =============================================================================
// 11. VIEW — RECEITAS
// =============================================================================
function renderReceitas() {
  const cats=['Todas','Doces','Salgados','Bebidas'];
  const filterHtml=cats.map(c=>`<button onclick="filterReceitas='${c}'; renderApp()"
    class="px-4 py-1.5 rounded-full text-[12px] font-bold transition-all
    ${filterReceitas===c?'bg-brand-main text-white shadow-md':'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-border-light dark:border-border-dark hover:border-brand-main/50'}">${c}</button>`).join('');
  let filtered=DB.receitas.filter(r=>filterReceitas==='Todas'||r.tag===filterReceitas.toUpperCase());
  if(searchReceitas){const q=searchReceitas.toLowerCase(); filtered=filtered.filter(r=>r.title.toLowerCase().includes(q)||r.tag.toLowerCase().includes(q));}
  const diffColors={'Fácil':'text-emerald-600 bg-emerald-50','Médio':'text-amber-600 bg-amber-50','Difícil':'text-red-600 bg-red-50'};
  const cardsHtml=filtered.map(r=>`<div class="bg-panel-light dark:bg-panel-dark rounded-2xl shadow-md border border-border-light dark:border-border-dark overflow-hidden flex flex-col group relative hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
    <div class="h-44 bg-slate-200 relative overflow-hidden cursor-pointer" onclick="openModal('viewReceita',${r.id})">
      <img src="${r.img||'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=600'}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy">
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
      <div class="absolute top-3 left-3"><span class="bg-white/90 backdrop-blur-sm text-slate-900 text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase shadow-sm">${r.tag}</span></div>
      <div class="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"><span class="bg-white/90 backdrop-blur-sm text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1"><i data-lucide="eye" class="w-3 h-3"></i> Ver</span></div>
    </div>
    <div class="p-4 flex flex-col flex-1 bg-white dark:bg-slate-800">
      <h4 class="font-bold text-[15px] mb-2 leading-snug line-clamp-2">${r.title}</h4>
      <div class="flex items-center justify-between text-[11px] font-medium text-slate-500 mt-auto">
        <span class="flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5"></i>${r.time}</span>
        <span class="px-2 py-0.5 rounded-lg font-bold ${diffColors[r.diff]||'text-slate-500 bg-slate-100'}">${r.diff}</span>
        <span class="flex items-center gap-1"><i data-lucide="users" class="w-3.5 h-3.5"></i>${r.porcoes||4} porções</span>
      </div>
    </div>
    <div class="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <button onclick="openModal('formReceita',${r.id})" class="bg-white/90 backdrop-blur-sm text-slate-700 p-1.5 rounded-lg hover:text-blue-600 shadow-md"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i></button>
      <button onclick="deleteReceita(${r.id})" class="bg-white/90 backdrop-blur-sm text-slate-700 p-1.5 rounded-lg hover:text-red-600 shadow-md"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
    </div>
  </div>`).join('');
  return `<div>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div class="flex gap-2">${filterHtml}</div>
      <div class="relative"><i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input type="text" placeholder="Buscar receita..." value="${searchReceitas}" oninput="searchReceitas=this.value; renderApp()"
          class="pl-9 pr-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-main">
        ${searchReceitas?`<button onclick="searchReceitas=''; renderApp()" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>`:''}
      </div>
    </div>
    ${filtered.length>0?`<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">${cardsHtml}</div>`
      :`<div class="text-center py-16 text-slate-400"><i data-lucide="chef-hat" class="w-12 h-12 mx-auto mb-3 opacity-25"></i><p class="text-lg font-medium">Nenhuma receita encontrada.</p></div>`}
  </div>`;
}

// =============================================================================
// 12. VIEW — MEMBROS
// =============================================================================
function renderMembros() {
  const hoje = new Date().toISOString().split('T')[0];
  const cardsHtml = DB.membros.map(m => {
    const atvsTotal = DB.atividades.filter(a=>a.resp===m.name).length;
    const atvsFeitas= DB.atividades.filter(a=>a.resp===m.name&&a.status==='concluida').length;
    const atvsHoje  = DB.atividades.filter(a=>a.resp===m.name&&a.date===hoje).length;
    const pct = atvsTotal>0?Math.round((atvsFeitas/atvsTotal)*100):0;
    const pts = DB.gamification.pontos[m.name]||0;
    const level = getLevel(pts);
    return `<div class="bg-panel-light dark:bg-panel-dark p-6 rounded-2xl shadow-sm border border-border-light dark:border-border-dark flex flex-col items-center border-t-[5px] ${m.border} relative group hover:shadow-md transition-all">
      <div class="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onclick="openModal('formMembro',${m.id})" class="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg text-slate-500 hover:text-blue-500"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i></button>
        <button onclick="deleteMembro(${m.id})" class="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg text-slate-500 hover:text-red-500"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
      </div>
      <div class="relative">
        <div class="w-20 h-20 rounded-full p-0.5 border-2 mb-4" style="border-color:${m.borderHex||'#3b82f6'}">
          <img src="${m.photo||`https://ui-avatars.com/api/?name=${m.name}&background=random`}" class="w-full h-full rounded-full object-cover">
        </div>
        <div class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full ${level.bg} flex items-center justify-center text-sm border-2 border-white dark:border-slate-900" title="${level.label}">${level.icon}</div>
      </div>
      <h3 class="text-lg font-bold">${m.name}</h3>
      <p class="text-[10px] font-extrabold uppercase tracking-widest mt-0.5" style="color:${m.borderHex||'#3b82f6'}">${m.role}</p>
      <div class="flex items-center gap-2 mt-2">
        <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${level.bg} ${level.color}">${level.label}</span>
        <span class="text-[11px] font-bold text-amber-500">${pts} pts</span>
      </div>
      <div class="w-full mt-4 space-y-2">
        <div class="flex justify-between text-[11px] text-slate-500 font-medium">
          <span>${atvsFeitas} de ${atvsTotal} tarefas</span><span class="font-bold">${pct}%</span></div>
        <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500" style="width:${pct}%; background-color:${m.borderHex||'#3b82f6'}"></div>
        </div>
        ${atvsHoje>0?`<p class="text-[11px] text-center text-slate-400 font-medium">${atvsHoje} evento${atvsHoje>1?'s':''} hoje</p>`:''}
      </div>
    </div>`;
  }).join('');
  return `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
    <button onclick="openModal('formMembro')" class="bg-transparent border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-500 hover:text-brand-main hover:border-brand-main hover:bg-brand-main/5 min-h-[260px] transition-all group">
      <div class="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-brand-main/10 flex items-center justify-center mb-3"><i data-lucide="user-plus" class="w-7 h-7"></i></div>
      <h3 class="font-bold text-base">Novo Membro</h3><p class="text-xs mt-1 text-center opacity-60">Adicione alguém à tribo</p>
    </button>
    ${cardsHtml}
  </div>`;
}


// =============================================================================
// 13. VIEW — ESTATÍSTICAS (nova página)
// =============================================================================
function renderEstatisticas() {
  const hoje = new Date().toISOString().split('T')[0];
  const semanaPassada = new Date(Date.now() - 7*86400000).toISOString().split('T')[0];
  const mesPassado    = new Date(Date.now() - 30*86400000).toISOString().split('T')[0];
  const atividades    = DB.atividades;

  // ─── Métricas gerais ─────────────────────────────────────
  const total       = atividades.length;
  const concluidas  = atividades.filter(a=>a.status==='concluida').length;
  const pendentes   = atividades.filter(a=>a.status==='pendente').length;
  const andamento   = atividades.filter(a=>a.status==='andamento').length;
  const atrasadas   = atividades.filter(a=>a.status==='pendente'&&a.date<hoje).length;
  const pct         = total>0?Math.round((concluidas/total)*100):0;
  const semana      = atividades.filter(a=>a.date>=semanaPassada&&a.status==='concluida').length;
  const mes         = atividades.filter(a=>a.date>=mesPassado&&a.status==='concluida').length;

  // ─── Por categoria ───────────────────────────────────────
  const cats = ['TAREFA DOMÉSTICA','ESCOLA','ESPORTE','SAÚDE'];
  const catColors = {'TAREFA DOMÉSTICA':'bg-emerald-500','ESCOLA':'bg-blue-500','ESPORTE':'bg-orange-500','SAÚDE':'bg-red-500'};
  const catData = cats.map(cat => ({
    tag: cat,
    total: atividades.filter(a=>a.tag===cat).length,
    concluidas: atividades.filter(a=>a.tag===cat&&a.status==='concluida').length,
    color: catColors[cat]||'bg-slate-500',
  }));
  const maxCat = Math.max(...catData.map(c=>c.total), 1);

  // ─── Por membro ──────────────────────────────────────────
  const membroData = DB.membros.map(m => ({
    name: m.name, photo: m.photo, borderHex: m.borderHex,
    total:     atividades.filter(a=>a.resp===m.name).length,
    concluidas:atividades.filter(a=>a.resp===m.name&&a.status==='concluida').length,
    pendentes: atividades.filter(a=>a.resp===m.name&&a.status==='pendente').length,
    pts:       DB.gamification.pontos[m.name]||0,
    streak:    DB.gamification.streaks[m.name]||0,
    conquistas:DB.gamification.conquistas.filter(c=>c.memberId===m.name).length,
  })).sort((a,b)=>b.total-a.total);
  const maxMembro = Math.max(...membroData.map(m=>m.total), 1);

  // ─── Últimos 7 dias (atividades concluídas por dia) ──────
  const last7 = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate()-6+i);
    const ds= d.toISOString().split('T')[0];
    return {
      day: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()],
      date: ds,
      count: atividades.filter(a=>a.date===ds&&a.status==='concluida').length,
    };
  });
  const maxDay = Math.max(...last7.map(d=>d.count), 1);

  // ─── Prioridades ─────────────────────────────────────────
  const prioData = [
    { label:'Urgente', count:atividades.filter(a=>a.priority==='urgente').length, color:'bg-red-600',   dot:'bg-red-600' },
    { label:'Alta',    count:atividades.filter(a=>a.priority==='alta').length,    color:'bg-red-400',   dot:'bg-red-400' },
    { label:'Média',   count:atividades.filter(a=>a.priority==='media').length,   color:'bg-amber-400', dot:'bg-amber-400' },
    { label:'Baixa',   count:atividades.filter(a=>a.priority==='baixa').length,   color:'bg-slate-300', dot:'bg-slate-300' },
  ];
  const maxPrio = Math.max(...prioData.map(p=>p.count), 1);

  // ─── Gamificação stats ───────────────────────────────────
  const totalPts   = Object.values(DB.gamification.pontos).reduce((a,b)=>a+b, 0);
  const totalConq  = DB.gamification.conquistas.length;
  const maxStreak  = Math.max(...Object.values(DB.gamification.streaks), 0);
  const topStreakM  = Object.entries(DB.gamification.streaks).sort((a,b)=>b[1]-a[1])[0];

  // ─── Listas stats ────────────────────────────────────────
  const totalListasItens = DB.listas.reduce((s,l)=>s+l.pendentes.length+l.carrinho.length, 0);
  const totalComprados   = DB.listas.reduce((s,l)=>s+l.carrinho.length, 0);
  const pctCompras       = totalListasItens>0?Math.round((totalComprados/totalListasItens)*100):0;

  return `<div class="max-w-6xl mx-auto space-y-8 pb-10">

    <!-- ─── Hero Stats ─── -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      ${[
        {label:'Total de Tarefas', val:total,     icon:'list',         color:'text-slate-700 dark:text-white',  bg:'from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900'},
        {label:'Concluídas',       val:concluidas, icon:'check-circle-2',color:'text-emerald-600',              bg:'from-emerald-50 to-emerald-100/30 dark:from-emerald-900/30 dark:to-emerald-900/10'},
        {label:'Taxa de Conclusão',val:pct+'%',   icon:'percent',      color:'text-brand-main',                 bg:'from-teal-50 to-teal-100/30 dark:from-teal-900/30 dark:to-teal-900/10'},
        {label:'Em Atraso',        val:atrasadas,  icon:'alert-triangle',color:atrasadas>0?'text-red-500':'text-slate-400', bg:atrasadas>0?'from-red-50 to-red-100/30 dark:from-red-900/30 dark:to-red-900/10':'from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900'},
      ].map(s=>`<div class="bg-gradient-to-br ${s.bg} rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <i data-lucide="${s.icon}" class="w-5 h-5 ${s.color} mb-3"></i>
        <p class="text-3xl font-black ${s.color} leading-none">${s.val}</p>
        <p class="text-[11px] text-slate-500 font-semibold mt-1.5 uppercase tracking-wide">${s.label}</p>
      </div>`).join('')}
    </div>

    <!-- ─── Segunda linha de stats ─── -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      ${[
        {label:'Concluídas esta semana', val:semana,        icon:'calendar-check', color:'text-blue-600',   bg:'bg-blue-50 dark:bg-blue-900/20'},
        {label:'Concluídas este mês',    val:mes,           icon:'calendar',       color:'text-purple-600', bg:'bg-purple-50 dark:bg-purple-900/20'},
        {label:'Membros ativos',         val:DB.membros.length, icon:'users',      color:'text-teal-600',   bg:'bg-teal-50 dark:bg-teal-900/20'},
        {label:'Pontos totais da família',val:totalPts,     icon:'star',           color:'text-amber-600',  bg:'bg-amber-50 dark:bg-amber-900/20'},
      ].map(s=>`<div class="${s.bg} rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
        <div class="flex items-center gap-2 mb-2"><i data-lucide="${s.icon}" class="w-4 h-4 ${s.color}"></i></div>
        <p class="text-2xl font-black ${s.color}">${s.val}</p>
        <p class="text-[11px] text-slate-500 font-medium mt-0.5">${s.label}</p>
      </div>`).join('')}
    </div>

    <!-- ─── Gráfico: Atividades por dia (últimos 7 dias) ─── -->
    <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-6 shadow-sm border border-border-light dark:border-border-dark">
      <h3 class="text-base font-bold mb-1 flex items-center gap-2">
        <i data-lucide="trending-up" class="w-5 h-5 text-brand-main"></i> Tarefas Concluídas — Últimos 7 dias
      </h3>
      <p class="text-[12px] text-slate-400 mb-6">Atividades marcadas como concluídas por dia</p>
      <div class="flex items-end gap-3 h-40">
        ${last7.map(d=>{
          const heightPct = maxDay > 0 ? Math.round((d.count/maxDay)*100) : 0;
          const isToday = d.date===hoje;
          return `<div class="flex-1 flex flex-col items-center gap-2">
            <span class="text-[11px] font-bold ${d.count>0?'text-brand-main':'text-slate-400'}">${d.count||''}</span>
            <div class="w-full rounded-t-xl transition-all duration-700 ${isToday?'bg-brand-main':'bg-slate-200 dark:bg-slate-700'}"
              style="height:${Math.max(heightPct,4)}%; min-height:4px; max-height:100%"></div>
            <span class="text-[10px] font-bold ${isToday?'text-brand-main':'text-slate-400'}">${d.day}</span>
          </div>`;}).join('')}
      </div>
    </div>

    <!-- ─── Duas colunas ─── -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- Atividades por categoria -->
      <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-6 shadow-sm border border-border-light dark:border-border-dark">
        <h3 class="text-base font-bold mb-5 flex items-center gap-2">
          <i data-lucide="tag" class="w-5 h-5 text-brand-main"></i> Por Categoria
        </h3>
        <div class="space-y-4">
          ${catData.map(c=>{
            const pctCat = c.total>0?Math.round((c.concluidas/c.total)*100):0;
            const barWidth = Math.round((c.total/maxCat)*100);
            return `<div>
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-[13px] font-semibold">${c.tag}</span>
                <div class="flex items-center gap-2">
                  <span class="text-[11px] text-slate-400">${c.concluidas}/${c.total}</span>
                  <span class="text-[11px] font-bold text-brand-main">${pctCat}%</span>
                </div>
              </div>
              <div class="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div class="${c.color} h-full rounded-full transition-all duration-700" style="width:${barWidth}%"></div>
              </div>
            </div>`;}).join('')}
          ${catData.every(c=>c.total===0)?`<div class="text-center py-8 text-slate-400 text-sm">Sem atividades ainda.</div>`:''}
        </div>
      </div>

      <!-- Atividades por membro -->
      <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-6 shadow-sm border border-border-light dark:border-border-dark">
        <h3 class="text-base font-bold mb-5 flex items-center gap-2">
          <i data-lucide="users" class="w-5 h-5 text-brand-main"></i> Por Membro
        </h3>
        <div class="space-y-4">
          ${membroData.map(m=>{
            const pctM = m.total>0?Math.round((m.concluidas/m.total)*100):0;
            const barWidth = Math.round((m.total/maxMembro)*100);
            return `<div>
              <div class="flex items-center gap-3 mb-1.5">
                <img src="${m.photo||'https://ui-avatars.com/api/?name='+encodeURIComponent(m.name)}" class="w-7 h-7 rounded-full object-cover border-2" style="border-color:${m.borderHex}">
                <span class="text-[13px] font-semibold flex-1">${m.name}</span>
                <span class="text-[11px] text-slate-400">${m.concluidas}/${m.total}</span>
                <span class="text-[11px] font-bold" style="color:${m.borderHex}">${pctM}%</span>
              </div>
              <div class="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-700" style="width:${barWidth}%; background-color:${m.borderHex}"></div>
              </div>
            </div>`;}).join('')}
          ${membroData.length===0?`<div class="text-center py-8 text-slate-400 text-sm">Adicione membros para ver a análise.</div>`:''}
        </div>
      </div>
    </div>

    <!-- ─── Prioridades + Gamificação ─── -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- Distribuição de prioridades -->
      <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-6 shadow-sm border border-border-light dark:border-border-dark">
        <h3 class="text-base font-bold mb-5 flex items-center gap-2">
          <i data-lucide="signal" class="w-5 h-5 text-brand-main"></i> Distribuição de Prioridades
        </h3>
        <div class="space-y-3">
          ${prioData.map(p=>{
            const bar = Math.round((p.count/maxPrio)*100);
            return `<div class="flex items-center gap-3">
              <div class="w-2 h-2 rounded-full ${p.dot} flex-shrink-0"></div>
              <span class="text-[13px] font-medium w-20">${p.label}</span>
              <div class="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div class="${p.color} h-full rounded-full transition-all duration-700" style="width:${bar}%"></div>
              </div>
              <span class="text-[12px] font-bold text-slate-600 dark:text-slate-400 w-6 text-right">${p.count}</span>
            </div>`;}).join('')}
        </div>
      </div>

      <!-- Stats de gamificação -->
      <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-6 shadow-sm border border-border-light dark:border-border-dark">
        <h3 class="text-base font-bold mb-5 flex items-center gap-2">
          <i data-lucide="trophy" class="w-5 h-5 text-amber-500"></i> Gamificação
        </h3>
        <div class="grid grid-cols-2 gap-4 mb-4">
          ${[
            {label:'Pontos totais',    val:totalPts,  icon:'star',    color:'text-amber-500',   bg:'bg-amber-50 dark:bg-amber-900/20'},
            {label:'Conquistas',       val:totalConq, icon:'award',   color:'text-purple-500',  bg:'bg-purple-50 dark:bg-purple-900/20'},
            {label:'Maior sequência',  val:maxStreak, icon:'flame',   color:'text-orange-500',  bg:'bg-orange-50 dark:bg-orange-900/20'},
            {label:'Prêmios resgatados',val:DB.gamification.premios_resgatados.length, icon:'gift', color:'text-rose-500', bg:'bg-rose-50 dark:bg-rose-900/20'},
          ].map(s=>`<div class="${s.bg} rounded-xl p-3">
            <i data-lucide="${s.icon}" class="w-4 h-4 ${s.color} mb-1.5"></i>
            <p class="text-xl font-black ${s.color}">${s.val}</p>
            <p class="text-[10px] text-slate-500 font-medium mt-0.5">${s.label}</p>
          </div>`).join('')}
        </div>
        ${topStreakM?`<div class="bg-amber-50/50 dark:bg-amber-900/10 rounded-xl p-3 border border-amber-100 dark:border-amber-900/20">
          <p class="text-[11px] text-amber-500 font-bold uppercase tracking-widest mb-1">🔥 Maior sequência ativa</p>
          <p class="font-bold text-[14px]">${topStreakM[0]} — ${topStreakM[1]} dias seguidos</p>
        </div>`:''}
      </div>
    </div>

    <!-- ─── Listas de Compras ─── -->
    <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-6 shadow-sm border border-border-light dark:border-border-dark">
      <h3 class="text-base font-bold mb-5 flex items-center gap-2">
        <i data-lucide="shopping-cart" class="w-5 h-5 text-brand-main"></i> Listas de Compras
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        ${[
          {label:'Total de listas',   val:DB.listas.length,       icon:'clipboard-list', color:'text-slate-600 dark:text-slate-300'},
          {label:'Itens pendentes',   val:DB.listas.reduce((s,l)=>s+l.pendentes.length,0), icon:'clock', color:'text-amber-600'},
          {label:'Itens comprados',   val:totalComprados,         icon:'check-circle',   color:'text-emerald-600'},
        ].map(s=>`<div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex items-center gap-3">
          <div class="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm"><i data-lucide="${s.icon}" class="w-4 h-4 ${s.color}"></i></div>
          <div><p class="text-xl font-black ${s.color}">${s.val}</p><p class="text-[11px] text-slate-400 font-medium">${s.label}</p></div>
        </div>`).join('')}
      </div>
      <div class="flex items-center gap-3">
        <span class="text-[13px] text-slate-600 dark:text-slate-300 font-medium">Progresso geral das compras:</span>
        <div class="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div class="h-full bg-emerald-400 rounded-full transition-all" style="width:${pctCompras}%"></div>
        </div>
        <span class="text-[13px] font-black text-emerald-600">${pctCompras}%</span>
      </div>
    </div>

    <!-- ─── Resumo de membros detalhado ─── -->
    <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-6 shadow-sm border border-border-light dark:border-border-dark">
      <h3 class="text-base font-bold mb-5 flex items-center gap-2">
        <i data-lucide="user-check" class="w-5 h-5 text-brand-main"></i> Desempenho dos Membros
      </h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border-light dark:border-border-dark">
              <th class="text-left py-2 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Membro</th>
              <th class="text-center py-2 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total</th>
              <th class="text-center py-2 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Concluídas</th>
              <th class="text-center py-2 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pendentes</th>
              <th class="text-center py-2 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pontos</th>
              <th class="text-center py-2 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Seq.</th>
              <th class="text-center py-2 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Conquistas</th>
            </tr>
          </thead>
          <tbody>
            ${membroData.map(m=>{
              const pctM=m.total>0?Math.round((m.concluidas/m.total)*100):0;
              return `<tr class="border-b border-border-light dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="py-3 px-3"><div class="flex items-center gap-2">
                  <img src="${m.photo||'https://ui-avatars.com/api/?name='+encodeURIComponent(m.name)}" class="w-7 h-7 rounded-full object-cover">
                  <span class="font-semibold">${m.name}</span></div></td>
                <td class="text-center py-3 px-3 font-bold">${m.total}</td>
                <td class="text-center py-3 px-3"><span class="text-emerald-600 font-bold">${m.concluidas}</span>
                  <span class="text-[10px] text-slate-400 ml-1">${pctM}%</span></td>
                <td class="text-center py-3 px-3 text-amber-600 font-bold">${m.pendentes}</td>
                <td class="text-center py-3 px-3 text-amber-500 font-black">${m.pts}</td>
                <td class="text-center py-3 px-3">${m.streak>=3?`<span class="text-orange-500 font-bold">🔥 ${m.streak}</span>`:`<span class="text-slate-400">${m.streak}</span>`}</td>
                <td class="text-center py-3 px-3 text-purple-500 font-bold">${m.conquistas}</td>
              </tr>`;}).join('')}
            ${membroData.length===0?`<tr><td colspan="7" class="text-center py-8 text-slate-400">Nenhum membro cadastrado.</td></tr>`:''}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}


// =============================================================================
// 14. VIEW — CONFIGURAÇÕES
// =============================================================================
function renderConfiguracoes() {
  const totalAtv = DB.atividades.length;
  const totalRec = DB.receitas.length;
  const totalMem = DB.membros.length;
  const dbSize   = Math.round(JSON.stringify(DB).length/1024*10)/10;
  return `<div class="max-w-3xl space-y-6 pb-10">
    <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-7 shadow-sm border border-border-light dark:border-border-dark">
      <h3 class="text-base font-bold mb-5 border-b border-border-light dark:border-border-dark pb-4 flex items-center gap-2">
        <i data-lucide="home" class="w-5 h-5 text-brand-main"></i> Conta da Família</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome da Família</label>
          <input type="text" id="cfg-name" value="${DB.settings.familyName}"
            class="w-full px-4 py-3 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-slate-900 focus:border-brand-main focus:ring-1 focus:ring-brand-main outline-none text-sm"></div>
        <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">E-mail Principal</label>
          <input type="email" id="cfg-email" value="${DB.settings.email}"
            class="w-full px-4 py-3 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-slate-900 focus:border-brand-main focus:ring-1 focus:ring-brand-main outline-none text-sm"></div>
      </div>
      <div class="mb-6">
        <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Foto da Família</label>
        <div class="flex items-center gap-5">
          <div class="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border-2 border-border-light flex-shrink-0">
            <img id="cfg-photo-preview" src="${DB.settings.photo||'https://via.placeholder.com/150'}" class="w-full h-full object-cover"></div>
          <div><input type="file" id="cfg-photo-file" accept="image/png, image/jpeg"
            class="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-main/10 file:text-brand-main hover:file:bg-brand-main/20 cursor-pointer"
            onchange="handleImageUpload('cfg-photo-file', b => document.getElementById('cfg-photo-preview').src = b)">
          <p class="text-[11px] text-slate-400 mt-1.5">JPG ou PNG, máx 2MB</p></div>
        </div>
      </div>
      <button onclick="saveSettings()" class="bg-brand-main text-white px-6 py-2.5 rounded-xl font-bold hover:bg-brand-dark transition-colors shadow-md text-sm">Salvar Configurações</button>
    </div>
    <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-7 shadow-sm border border-border-light dark:border-border-dark flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <i data-lucide="${isDarkMode?'moon':'sun'}" class="w-5 h-5 text-slate-600 dark:text-slate-300"></i></div>
        <div><h3 class="font-bold">Modo ${isDarkMode?'Escuro':'Claro'}</h3>
          <p class="text-xs text-slate-500 mt-0.5">${isDarkMode?'Descansa os olhos à noite.':'Interface clara e limpa.'}</p></div>
      </div>
      <button onclick="toggleDarkMode()" class="w-12 h-6 rounded-full ${isDarkMode?'bg-brand-main':'bg-slate-300'} relative transition-colors duration-300 shadow-inner flex-shrink-0">
        <div class="w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 ${isDarkMode?'left-7':'left-1'} shadow"></div>
      </button>
    </div>
    <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-7 shadow-sm border border-border-light dark:border-border-dark">
      <h3 class="text-base font-bold mb-5 border-b border-border-light dark:border-border-dark pb-4 flex items-center gap-2">
        <i data-lucide="bar-chart-2" class="w-5 h-5 text-brand-main"></i> Dados do Sistema</h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        ${[{icon:'check-square',label:'Atividades',val:totalAtv,color:'text-brand-main'},{icon:'users',label:'Membros',val:totalMem,color:'text-blue-500'},{icon:'chef-hat',label:'Receitas',val:totalRec,color:'text-orange-500'},{icon:'database',label:'Armazenado',val:`${dbSize}kb`,color:'text-purple-500'}]
          .map(s=>`<div class="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <i data-lucide="${s.icon}" class="w-5 h-5 mx-auto mb-2 ${s.color}"></i>
            <p class="text-xl font-black ${s.color}">${s.val}</p>
            <p class="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">${s.label}</p>
          </div>`).join('')}
      </div>
      <div class="flex flex-wrap gap-3">
        <button onclick="exportarDados()" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-sm hover:bg-blue-100">
          <i data-lucide="download" class="w-4 h-4"></i> Exportar Backup</button>
        <label class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm hover:bg-emerald-100 cursor-pointer">
          <i data-lucide="upload" class="w-4 h-4"></i> Importar Backup
          <input type="file" accept=".json" class="hidden" onchange="importarDados(this)"></label>
        <button onclick="changeView('estatisticas')" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-bold text-sm hover:bg-purple-100">
          <i data-lucide="bar-chart-2" class="w-4 h-4"></i> Ver Estatísticas</button>
      </div>
    </div>
    <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-7 shadow-sm border border-red-200 dark:border-red-900/40">
      <h3 class="text-base font-bold mb-4 flex items-center gap-2 text-red-600">
        <i data-lucide="triangle-alert" class="w-5 h-5"></i> Zona de Perigo</h3>
      <div class="flex flex-wrap gap-3">
        <button onclick="limparAtividades()" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 font-bold text-sm hover:bg-red-100">
          <i data-lucide="check-circle" class="w-4 h-4"></i> Limpar Atividades Concluídas</button>
        <button onclick="resetarSistema()" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">
          <i data-lucide="rotate-ccw" class="w-4 h-4"></i> Resetar Sistema</button>
      </div>
    </div>
  </div>`;
}


// =============================================================================
// 15. CRUD — ATIVIDADES
// =============================================================================
function deleteAtividade(id) {
  confirmDialog('Excluir esta atividade?', () => { DB.atividades=DB.atividades.filter(a=>a.id!==id); saveDB(); renderApp(); toast('Atividade excluída.'); });
}
function toggleStatusAtividade(id) {
  const at = DB.atividades.find(a=>a.id===id);
  if (!at) return;
  at.status = at.status==='concluida'?'pendente':'concluida';
  saveDB(); renderApp();
}
function setStatusAtividade(id, status) {
  const at = DB.atividades.find(a=>a.id===id);
  if (!at) return;
  at.status = status;
  saveDB(); renderApp();
  toast(`Status: ${statusConfig[status].label}`, 'info');
}

// =============================================================================
// 16. CRUD — LISTAS DE COMPRAS
// =============================================================================
function addListItem(lIdx) {
  const input = document.getElementById(`add-item-${lIdx}`);
  if (!input.value.trim()) return;
  DB.listas[lIdx].pendentes.push(input.value.trim()); input.value='';
  saveDB(); renderApp();
}
function checkItem(lIdx, iIdx) { const item=DB.listas[lIdx].pendentes.splice(iIdx,1)[0]; DB.listas[lIdx].carrinho.push(item); saveDB(); setTimeout(renderApp,100); }
function uncheckItem(lIdx, iIdx) { const item=DB.listas[lIdx].carrinho.splice(iIdx,1)[0]; DB.listas[lIdx].pendentes.push(item); saveDB(); setTimeout(renderApp,100); }
function deleteListItem(lIdx, iIdx, isCarrinho) { if(isCarrinho)DB.listas[lIdx].carrinho.splice(iIdx,1); else DB.listas[lIdx].pendentes.splice(iIdx,1); saveDB(); renderApp(); }
function limparCarrinho(lIdx) { const count=DB.listas[lIdx].carrinho.length; DB.listas[lIdx].carrinho=[]; saveDB(); renderApp(); toast(`${count} item${count>1?'ns':''} removido${count>1?'s':''}.`); }
function deleteLista(lIdx) { confirmDialog(`Remover a lista "${DB.listas[lIdx].title}"?`, ()=>{ DB.listas.splice(lIdx,1); saveDB(); renderApp(); toast('Lista removida.'); }); }

// =============================================================================
// 17. CRUD — RECEITAS E MEMBROS
// =============================================================================
function deleteReceita(id) { confirmDialog('Excluir esta receita?', ()=>{ DB.receitas=DB.receitas.filter(r=>r.id!==id); saveDB(); renderApp(); toast('Receita excluída.'); }); }
function deleteMembro(id)  { confirmDialog('Remover este membro?', ()=>{ DB.membros=DB.membros.filter(m=>m.id!==id); saveDB(); renderApp(); toast('Membro removido.'); }); }

// =============================================================================
// 18. CONFIGURAÇÕES — Ações
// =============================================================================
function saveSettings() {
  DB.settings.familyName = document.getElementById('cfg-name').value;
  DB.settings.email      = document.getElementById('cfg-email').value;
  const imgSrc = document.getElementById('cfg-photo-preview').src;
  if (!imgSrc.includes('via.placeholder')) DB.settings.photo = imgSrc;
  saveDB(); toast('Configurações salvas com sucesso!');
}
function exportarDados() {
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(DB,null,2)],{type:'application/json'}));
  a.download=`familyhub-backup-${new Date().toISOString().split('T')[0]}.json`; a.click();
  toast('Backup exportado!','success');
}
function importarDados(input) {
  const file=input.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{ try { const data=JSON.parse(e.target.result);
    if(!data.atividades||!data.membros) throw new Error('inválido');
    confirmDialog('Substituir todos os dados pelo backup?', ()=>{ DB=data; saveDB(); renderApp(); toast('Backup importado!','success'); });
  } catch { toast('Arquivo inválido ou corrompido.','error'); }};
  reader.readAsText(file); input.value='';
}
function limparAtividades() {
  const count=DB.atividades.filter(a=>a.status==='concluida').length;
  if(count===0){toast('Nenhuma atividade concluída.','info');return;}
  confirmDialog(`Remover ${count} atividade${count>1?'s':''} concluída${count>1?'s':''}?`, ()=>{ DB.atividades=DB.atividades.filter(a=>a.status!=='concluida'); saveDB(); renderApp(); toast(`${count} removida${count>1?'s':''}.`); });
}
function resetarSistema() {
  confirmDialog('ATENÇÃO: Isso apagará TODOS os dados. Tem certeza?', ()=>{ localStorage.removeItem('familyHubDB'); DB=JSON.parse(JSON.stringify(defaultDB)); saveDB(); renderApp(); toast('Sistema resetado.','warning'); });
}


// =============================================================================
// 19. MODAIS
// =============================================================================
function openModal(type, id=null, extraData=null) {
  const content = document.getElementById('modal-content');
  const isWide  = type==='viewReceita';
  content.className = `bg-panel-light dark:bg-panel-dark rounded-2xl shadow-2xl w-full ${isWide?'max-w-4xl p-0':'max-w-lg p-6'} transform scale-95 transition-transform duration-300 overflow-hidden`;
  let html = '';

  if (type==='formAtividade') {
    const at=id?DB.atividades.find(a=>a.id===id):null; const preDate=extraData||(at?at.date:'');
    html=`<h3 class="text-lg font-bold mb-5 flex items-center gap-2"><i data-lucide="check-square" class="w-5 h-5 text-brand-main"></i>${at?'Editar Atividade':'Nova Atividade'}</h3>
    <div class="space-y-4">
      <input type="hidden" id="mod-at-id" value="${at?at.id:''}">
      <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Título *</label>
        <input type="text" id="mod-title" value="${at?at.title:''}" placeholder="Ex: Natação do Lucas"
          class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm"></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data *</label>
          <input type="date" id="mod-date" value="${preDate}" class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm"></div>
        <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Hora</label>
          <input type="time" id="mod-time" value="${at?at.time:''}" class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm"></div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Categoria</label>
          <select id="mod-cat" class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm">
            ${['Tarefa Doméstica','Escola','Esporte','Saúde'].map(c=>`<option ${at&&at.tag===c.toUpperCase()?'selected':''}>${c}</option>`).join('')}
          </select></div>
        <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Responsável</label>
          <select id="mod-resp" class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm">
            ${DB.membros.map(m=>`<option ${at&&at.resp===m.name?'selected':''}>${m.name}</option>`).join('')}
          </select></div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Prioridade</label>
          <select id="mod-prio" class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm">
            ${['baixa','media','alta','urgente'].map(p=>`<option value="${p}" ${at&&at.priority===p?'selected':''}>${priorityConfig[p].label}</option>`).join('')}
          </select></div>
        <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Status</label>
          <select id="mod-status" class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm">
            <option value="pendente" ${!at||at.status==='pendente'?'selected':''}>⏳ Pendente</option>
            <option value="andamento" ${at&&at.status==='andamento'?'selected':''}>🔄 Andamento</option>
            <option value="concluida" ${at&&at.status==='concluida'?'selected':''}>✅ Concluída</option>
          </select></div>
      </div>
      <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Notas</label>
        <textarea id="mod-notes" rows="2" class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm resize-none">${at?at.notes||'':''}</textarea></div>
      <div class="flex justify-end gap-3 pt-4 border-t border-border-light dark:border-border-dark">
        <button onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm">Cancelar</button>
        <button onclick="saveFormAtividade()" class="px-5 py-2.5 rounded-xl font-bold bg-brand-main text-white hover:bg-brand-dark shadow-sm text-sm">Salvar</button>
      </div>
    </div>`;
  }

  else if (type==='formLista') {
    const lista=id?DB.listas.find(l=>l.id===id):null;
    const borderOpts=[{cls:'border-blue-500',hex:'#3b82f6',name:'Azul'},{cls:'border-emerald-500',hex:'#10b981',name:'Verde'},{cls:'border-purple-500',hex:'#8b5cf6',name:'Roxo'},{cls:'border-rose-500',hex:'#f43f5e',name:'Rosa'},{cls:'border-amber-500',hex:'#f59e0b',name:'Amarelo'},{cls:'border-cyan-500',hex:'#06b6d4',name:'Ciano'}];
    const iconOpts=['shopping-cart','leaf','pill','home','package','coffee','gift','heart','star','zap'];
    html=`<h3 class="text-lg font-bold mb-5">${lista?'Editar Lista':'Nova Lista'}</h3>
    <div class="space-y-4">
      <input type="hidden" id="mod-l-id" value="${lista?lista.id:''}">
      <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome da Lista</label>
        <input type="text" id="mod-l-title" value="${lista?lista.title:''}" placeholder="Ex: Compras da Semana"
          class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm"></div>
      <div><label class="block text-xs font-bold text-slate-500 uppercase mb-2">Cor</label>
        <div class="flex flex-wrap gap-2">
          ${borderOpts.map(b=>`<button type="button" id="cor-${b.cls.replace(/[^a-z0-9]/g,'-')}"
            onclick="document.querySelectorAll('[id^=cor-]').forEach(x=>x.classList.remove('ring-2','ring-offset-2')); this.classList.add('ring-2','ring-offset-2'); document.getElementById('mod-l-border').value='${b.cls}'"
            class="w-8 h-8 rounded-full border-4 ${b.cls} ${lista&&lista.border===b.cls?'ring-2 ring-offset-2':''} transition-all hover:scale-110"
            style="background:${b.hex}" title="${b.name}"></button>`).join('')}
        </div>
        <input type="hidden" id="mod-l-border" value="${lista?lista.border:'border-blue-500'}"></div>
      <div><label class="block text-xs font-bold text-slate-500 uppercase mb-2">Ícone</label>
        <div class="flex flex-wrap gap-2">
          ${iconOpts.map(ico=>`<button type="button"
            onclick="document.querySelectorAll('[data-ico]').forEach(x=>x.classList.remove('bg-brand-main','text-white')); this.classList.add('bg-brand-main','text-white'); document.getElementById('mod-l-icon').value='${ico}'"
            data-ico="${ico}" class="p-2.5 rounded-xl border border-border-light dark:border-border-dark hover:border-brand-main transition-all ${lista&&lista.icon===ico?'bg-brand-main text-white':'bg-white dark:bg-slate-800'}">
            <i data-lucide="${ico}" class="w-4 h-4"></i></button>`).join('')}
        </div>
        <input type="hidden" id="mod-l-icon" value="${lista?lista.icon:'shopping-cart'}"></div>
      <div class="flex justify-end gap-3 pt-4 border-t border-border-light dark:border-border-dark">
        <button onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-medium text-slate-500 text-sm">Cancelar</button>
        <button onclick="saveFormLista()" class="px-5 py-2.5 rounded-xl font-bold bg-brand-main text-white text-sm">Salvar</button>
      </div>
    </div>`;
  }

  else if (type==='formMembro') {
    const mem=id?DB.membros.find(m=>m.id===id):null;
    const colorOpts=[{cls:'border-blue-500',hex:'#3b82f6'},{cls:'border-pink-400',hex:'#f472b6'},{cls:'border-orange-400',hex:'#fb923c'},{cls:'border-emerald-500',hex:'#10b981'},{cls:'border-purple-500',hex:'#8b5cf6'},{cls:'border-red-500',hex:'#ef4444'},{cls:'border-amber-500',hex:'#f59e0b'}];
    html=`<h3 class="text-lg font-bold mb-5">${mem?'Editar Membro':'Novo Membro'}</h3>
    <div class="space-y-4">
      <input type="hidden" id="mod-m-id" value="${mem?mem.id:''}">
      <div class="flex items-center gap-4 mb-2">
        <img id="mod-m-preview" src="${mem&&mem.photo?mem.photo:'https://via.placeholder.com/150'}" class="w-16 h-16 rounded-full object-cover border-2 border-slate-200 flex-shrink-0">
        <div class="flex-1"><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Foto de Perfil</label>
          <input type="file" id="mod-m-file" accept="image/png, image/jpeg" class="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-main/10 file:text-brand-main hover:file:bg-brand-main/20 cursor-pointer"
            onchange="handleImageUpload('mod-m-file', b => document.getElementById('mod-m-preview').src = b)"></div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome *</label>
          <input type="text" id="mod-m-name" value="${mem?mem.name:''}" class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm"></div>
        <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Parentesco</label>
          <input type="text" id="mod-m-role" value="${mem?mem.role:''}" placeholder="Ex: Pai, Filho..." class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm"></div>
      </div>
      <div><label class="block text-xs font-bold text-slate-500 uppercase mb-2">Cor do Perfil</label>
        <div class="flex flex-wrap gap-2">
          ${colorOpts.map(c=>`<button type="button"
            onclick="document.querySelectorAll('[data-mbrcor]').forEach(x=>x.classList.remove('scale-125','ring-2')); this.classList.add('scale-125','ring-2'); document.getElementById('mod-m-border').value='${c.cls}'; document.getElementById('mod-m-borderhex').value='${c.hex}'"
            data-mbrcor="${c.cls}" class="w-7 h-7 rounded-full border-4 ${c.cls} ${mem&&mem.border===c.cls?'scale-125 ring-2':''} transition-all hover:scale-110" style="background:${c.hex}"></button>`).join('')}
        </div>
        <input type="hidden" id="mod-m-border" value="${mem?mem.border:'border-blue-500'}">
        <input type="hidden" id="mod-m-borderhex" value="${mem?mem.borderHex:'#3b82f6'}"></div>
      <div class="flex justify-end gap-3 pt-4 border-t border-border-light dark:border-border-dark">
        <button onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-medium text-slate-500 text-sm">Cancelar</button>
        <button onclick="saveFormMembro()" class="px-5 py-2.5 rounded-xl font-bold bg-brand-main text-white text-sm">Salvar</button>
      </div>
    </div>`;
  }

  else if (type==='formReceita') {
    const rec=id?DB.receitas.find(r=>r.id===id):null;
    html=`<h3 class="text-lg font-bold mb-4">${rec?'Editar Receita':'Nova Receita'}</h3>
    <div class="space-y-4 max-h-[72vh] overflow-y-auto pr-1 custom-scrollbar">
      <input type="hidden" id="mod-r-id" value="${rec?rec.id:''}">
      <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome *</label>
        <input type="text" id="mod-r-title" value="${rec?rec.title:''}" class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light outline-none focus:border-brand-main text-sm"></div>
      <div class="grid grid-cols-4 gap-3">
        <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Categoria</label>
          <select id="mod-r-tag" class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light text-sm">
            ${['Doces','Salgados','Bebidas'].map(c=>`<option ${rec&&rec.tag===c.toUpperCase()?'selected':''}>${c}</option>`).join('')}</select></div>
        <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tempo</label>
          <input type="text" id="mod-r-time" value="${rec?rec.time:''}" placeholder="40 min" class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light text-sm"></div>
        <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Dific.</label>
          <select id="mod-r-diff" class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light text-sm">
            ${['Fácil','Médio','Difícil'].map(d=>`<option ${rec&&rec.diff===d?'selected':''}>${d}</option>`).join('')}</select></div>
        <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Porções</label>
          <input type="number" id="mod-r-porcoes" value="${rec?rec.porcoes||4:4}" min="1" class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light text-sm"></div>
      </div>
      <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Foto do Prato</label>
        <img id="mod-r-preview" src="${rec&&rec.img?rec.img:'https://via.placeholder.com/400x150'}" class="w-full h-28 object-cover rounded-xl border border-slate-200 mb-2">
        <input type="file" id="mod-r-file" accept="image/png, image/jpeg" class="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:bg-brand-main/10 file:text-brand-main cursor-pointer"
          onchange="handleImageUpload('mod-r-file', b => document.getElementById('mod-r-preview').src = b)"></div>
      <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ingredientes (um por linha)</label>
        <textarea id="mod-r-ing" rows="4" class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light text-sm leading-relaxed">${rec?rec.ingredients.join('\n'):''}</textarea></div>
      <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Modo de Preparo</label>
        <textarea id="mod-r-steps" rows="5" class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light text-sm leading-relaxed">${rec?rec.steps:''}</textarea></div>
      <div class="flex justify-end gap-3 pt-4 border-t border-border-light">
        <button onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-medium text-slate-500 text-sm">Cancelar</button>
        <button onclick="saveFormReceita()" class="px-5 py-2.5 rounded-xl font-bold bg-brand-main text-white text-sm">Salvar Receita</button>
      </div>
    </div>`;
  }

  else if (type==='viewReceita') {
    const rec=DB.receitas.find(r=>r.id===id);
    html=`<div class="flex flex-col md:flex-row h-full max-h-[88vh]">
      <div class="w-full md:w-2/5 h-56 md:h-auto relative bg-slate-900 flex-shrink-0">
        <img src="${rec.img}" class="w-full h-full object-cover opacity-90">
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40"></div>
        <button onclick="closeModal()" class="absolute top-4 left-4 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-full"><i data-lucide="x" class="w-4 h-4"></i></button>
        <button onclick="openModal('formReceita',${rec.id})" class="absolute top-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-full"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
        <div class="absolute bottom-6 left-6 right-6 text-white">
          <span class="inline-block px-2.5 py-1 bg-brand-main rounded-lg text-[10px] font-bold uppercase tracking-widest mb-3">${rec.tag}</span>
          <h2 class="text-2xl font-bold leading-snug">${rec.title}</h2>
        </div>
      </div>
      <div class="w-full md:w-3/5 p-7 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
        <div class="flex flex-wrap gap-3 mb-7 border-b border-border-light dark:border-border-dark pb-5">
          ${[{icon:'clock',label:rec.time},{icon:'chef-hat',label:rec.diff},{icon:'users',label:`${rec.porcoes||4} porções`}]
            .map(i=>`<span class="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-300 font-medium">
              <i data-lucide="${i.icon}" class="w-3.5 h-3.5 text-brand-main"></i>${i.label}</span>`).join('')}
        </div>
        <div class="mb-7">
          <h3 class="text-base font-bold mb-4 flex items-center gap-2"><i data-lucide="shopping-basket" class="w-4 h-4 text-brand-main"></i>Ingredientes</h3>
          <div class="space-y-1.5">
            ${rec.ingredients.map(i=>`<label class="flex items-center gap-3 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer group">
              <input type="checkbox" class="w-4 h-4 text-brand-main rounded border-slate-300 flex-shrink-0">
              <span class="text-[14px] text-slate-700 dark:text-slate-300 group-has-[:checked]:line-through group-has-[:checked]:opacity-50">${i}</span>
            </label>`).join('')}
          </div>
        </div>
        <div>
          <h3 class="text-base font-bold mb-4 flex items-center gap-2"><i data-lucide="list-ordered" class="w-4 h-4 text-brand-main"></i>Modo de Preparo</h3>
          <div class="text-[14px] text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed pl-3 border-l-2 border-brand-main/30">${rec.steps}</div>
        </div>
      </div>
    </div>`;
  }

  content.innerHTML = html; lucide.createIcons();
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ overlay.classList.remove('opacity-0','pointer-events-none'); content.classList.remove('scale-95'); }));
}

function closeModal() {
  const overlay=document.getElementById('modal-overlay'); const content=document.getElementById('modal-content');
  overlay.classList.add('opacity-0','pointer-events-none'); content.classList.add('scale-95');
  setTimeout(()=>overlay.classList.add('hidden'), 300);
}


// =============================================================================
// 20. SALVAR FORMULÁRIOS
// =============================================================================
function saveFormAtividade() {
  const idVal=document.getElementById('mod-at-id').value;
  const title=document.getElementById('mod-title').value.trim();
  const date =document.getElementById('mod-date').value;
  if (!title){toast('Informe o título!','error');return;} if(!date){toast('Informe a data!','error');return;}
  const cat=document.getElementById('mod-cat').value;
  const atData={title,date,time:document.getElementById('mod-time').value,tag:cat.toUpperCase(),resp:document.getElementById('mod-resp').value,priority:document.getElementById('mod-prio').value,status:document.getElementById('mod-status').value,notes:document.getElementById('mod-notes').value,color:getTagColor(cat.toUpperCase())};
  if(idVal){const idx=DB.atividades.findIndex(a=>a.id==idVal); DB.atividades[idx]={...DB.atividades[idx],...atData}; toast('Atividade atualizada!');}
  else{DB.atividades.push({id:Date.now(),...atData}); toast('Atividade criada!');}
  saveDB(); closeModal(); renderApp();
}
function saveFormLista() {
  const idVal=document.getElementById('mod-l-id').value;
  const title=document.getElementById('mod-l-title').value.trim();
  if(!title){toast('Informe o nome!','error');return;}
  const listData={title,border:document.getElementById('mod-l-border').value,icon:document.getElementById('mod-l-icon').value};
  if(idVal){const idx=DB.listas.findIndex(l=>l.id==idVal); DB.listas[idx]={...DB.listas[idx],...listData}; toast('Lista atualizada!');}
  else{DB.listas.push({id:Date.now(),pendentes:[],carrinho:[],...listData}); toast('Lista criada!');}
  saveDB(); closeModal(); renderApp();
}
function saveFormMembro() {
  const idVal=document.getElementById('mod-m-id').value;
  const name=document.getElementById('mod-m-name').value.trim();
  if(!name){toast('Informe o nome!','error');return;}
  const imgSrc=document.getElementById('mod-m-preview').src;
  const photo=imgSrc.includes('via.placeholder')?`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`:imgSrc;
  const memData={name,role:(document.getElementById('mod-m-role').value||'').toUpperCase(),photo,border:document.getElementById('mod-m-border').value,borderHex:document.getElementById('mod-m-borderhex').value};
  if(idVal){const idx=DB.membros.findIndex(m=>m.id==idVal); DB.membros[idx]={...DB.membros[idx],...memData}; toast('Membro atualizado!');}
  else{DB.membros.push({id:Date.now(),...memData}); toast('Membro adicionado!');}
  saveDB(); closeModal(); renderApp();
}
function saveFormReceita() {
  const idVal=document.getElementById('mod-r-id').value;
  const title=document.getElementById('mod-r-title').value.trim();
  if(!title){toast('Informe o título!','error');return;}
  const imgSrc=document.getElementById('mod-r-preview').src;
  const recData={title,tag:document.getElementById('mod-r-tag').value.toUpperCase(),time:document.getElementById('mod-r-time').value,diff:document.getElementById('mod-r-diff').value,porcoes:parseInt(document.getElementById('mod-r-porcoes').value)||4,img:imgSrc.includes('via.placeholder')?'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800':imgSrc,steps:document.getElementById('mod-r-steps').value,ingredients:document.getElementById('mod-r-ing').value.split('\n').filter(i=>i.trim())};
  if(idVal){const idx=DB.receitas.findIndex(r=>r.id==idVal); DB.receitas[idx]={...DB.receitas[idx],...recData}; toast('Receita atualizada!');}
  else{DB.receitas.push({id:Date.now(),...recData}); toast('Receita criada!');}
  saveDB(); closeModal(); renderApp();
}

// =============================================================================
// 21. TEMA E INICIALIZAÇÃO
// =============================================================================
function toggleDarkMode() { isDarkMode=!isDarkMode; localStorage.setItem('familyHubDarkMode',isDarkMode); applyDarkMode(); if(currentView==='configuracoes')renderApp(); }
function applyDarkMode()  { document.documentElement.classList.toggle('dark',isDarkMode); }

function updateNextEventWidget() {
  const hoje=new Date().toISOString().split('T')[0];
  const proximo=DB.atividades.filter(a=>a.date>=hoje&&a.status!=='concluida').sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time))[0];
  const titleEl=document.getElementById('next-event-title'); const dateEl=document.getElementById('next-event-date');
  if(!titleEl||!dateEl) return;
  if(proximo){titleEl.textContent=proximo.title; const {label}=formatDateLabel(proximo.date); dateEl.textContent=`${label} · ${proximo.time}`;}
  else{titleEl.textContent='Nenhum evento futuro'; dateEl.textContent='Tudo em dia! 🎉';}
}

function renderApp() {
  renderSidebar(); updateHeader(); updateSidebarSettings(); updateNextEventWidget();
  const content=document.getElementById('page-content');
  const views={dashboard:renderDashboard,calendario:renderCalendar,atividades:renderAtividades,compras:renderListas,receitas:renderReceitas,membros:renderMembros,ranking:renderRanking,estatisticas:renderEstatisticas,configuracoes:renderConfiguracoes};
  content.innerHTML = views[currentView]?views[currentView]():'';
  lucide.createIcons();
}

// =============================================================================
// 22. EVENTOS GLOBAIS
// =============================================================================
document.addEventListener('keydown', e => {
  if(e.key!=='Escape') return;
  const overlay=document.getElementById('modal-overlay');
  if(overlay&&!overlay.classList.contains('hidden')){closeModal();return;}
  const confirmOverlay=document.getElementById('confirm-overlay');
  if(confirmOverlay&&!confirmOverlay.classList.contains('hidden'))closeConfirm();
  closeSearchDropdown();
});

document.addEventListener('DOMContentLoaded', async () => {
  applyDarkMode(); updateUserInfo(); checkAutoNotificacoes();
  if(Auth.isLoggedIn()) API.loadNotifications().catch(()=>{});
  renderApp();
  initGlobalSearch(); // Inicializa a busca global APÓS renderApp
  if(!localStorage.getItem('fh_welcomed')){
    const user=Auth.getUser(); const nome=user?user.name:DB.settings.familyName;
    addNotificacao('Bem-vindo de volta, '+nome+'! 👋','Seu FamilyHub está pronto. Verifique as atividades de hoje!','success','smile');
    localStorage.setItem('fh_welcomed','1'); saveDB(false);
  }
  updateNotifBadge();

  // Toggle sidebar mobile
  document.getElementById('btn-menu')?.addEventListener('click', ()=>{
    const sidebar=document.getElementById('sidebar');
    const overlay=document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
  });
  document.getElementById('sidebar-overlay')?.addEventListener('click', ()=>{
    document.getElementById('sidebar').classList.add('-translate-x-full');
    document.getElementById('sidebar-overlay').classList.add('hidden');
  });
  document.getElementById('btn-theme')?.addEventListener('click', toggleDarkMode);
});


// =============================================================================
// 23. GAMIFICAÇÃO — Sistema de Níveis, Conquistas e PRÊMIOS
// =============================================================================

const LEVELS = [
  { min:0,    max:99,   label:'Iniciante', icon:'🌱', color:'text-slate-500',  bg:'bg-slate-100 dark:bg-slate-800'     },
  { min:100,  max:299,  label:'Ativo',     icon:'⭐', color:'text-blue-500',   bg:'bg-blue-50 dark:bg-blue-900/30'     },
  { min:300,  max:599,  label:'Dedicado',  icon:'🔥', color:'text-amber-500',  bg:'bg-amber-50 dark:bg-amber-900/30'   },
  { min:600,  max:999,  label:'Expert',    icon:'💎', color:'text-purple-500', bg:'bg-purple-50 dark:bg-purple-900/30' },
  { min:1000, max:9999, label:'Mestre',    icon:'👑', color:'text-brand-main', bg:'bg-brand-main/10'                   },
];

// Conquistas — 16 no total
const CONQUISTAS_DEF = [
  { id:'first_task',    icon:'🎯', title:'Primeiro Passo',    desc:'Completou a primeira tarefa!',         check:(m,db)=>db.atividades.filter(a=>a.resp===m&&a.status==='concluida').length>=1 },
  { id:'five_tasks',    icon:'🏅', title:'Mãos à Obra',       desc:'Completou 5 tarefas.',                 check:(m,db)=>db.atividades.filter(a=>a.resp===m&&a.status==='concluida').length>=5 },
  { id:'twenty_tasks',  icon:'🚀', title:'Dedicado',           desc:'Completou 20 tarefas.',                check:(m,db)=>db.atividades.filter(a=>a.resp===m&&a.status==='concluida').length>=20 },
  { id:'fifty_tasks',   icon:'💯', title:'Implacável',         desc:'Completou 50 tarefas!',                check:(m,db)=>db.atividades.filter(a=>a.resp===m&&a.status==='concluida').length>=50 },
  { id:'streak_3',      icon:'🔥', title:'Em Chamas',          desc:'3 dias seguidos concluindo tarefas.',  check:(m,db)=>(db.gamification.streaks[m]||0)>=3 },
  { id:'streak_7',      icon:'⚡', title:'Imparável',          desc:'7 dias seguidos!',                     check:(m,db)=>(db.gamification.streaks[m]||0)>=7 },
  { id:'streak_14',     icon:'🌟', title:'Lendário',           desc:'14 dias seguidos!',                    check:(m,db)=>(db.gamification.streaks[m]||0)>=14 },
  { id:'all_urgent',    icon:'🚨', title:'Apagador de Fogo',   desc:'Concluiu uma tarefa urgente.',         check:(m,db)=>db.atividades.some(a=>a.resp===m&&a.status==='concluida'&&a.priority==='urgente') },
  { id:'health_master', icon:'❤️', title:'Saúde em Dia',       desc:'Completou 5 tarefas de saúde.',        check:(m,db)=>db.atividades.filter(a=>a.resp===m&&a.status==='concluida'&&a.tag==='SAÚDE').length>=5 },
  { id:'sport_fan',     icon:'⚽', title:'Esportista',         desc:'Completou 5 tarefas de esporte.',      check:(m,db)=>db.atividades.filter(a=>a.resp===m&&a.status==='concluida'&&a.tag==='ESPORTE').length>=5 },
  { id:'home_hero',     icon:'🏠', title:'Herói do Lar',       desc:'Completou 10 tarefas domésticas.',     check:(m,db)=>db.atividades.filter(a=>a.resp===m&&a.status==='concluida'&&a.tag==='TAREFA DOMÉSTICA').length>=10 },
  { id:'early_bird',    icon:'🌅', title:'Madrugador',         desc:'Concluiu tarefa antes do prazo.',      check:(m,db)=>{ const hoje=new Date().toISOString().split('T')[0]; return db.atividades.some(a=>a.resp===m&&a.status==='concluida'&&a.date>hoje); }},
  { id:'leader',        icon:'👑', title:'Líder da Família',   desc:'Maior pontuação da família!',          check:(m,db)=>{ const pts=db.gamification.pontos; const myPts=pts[m]||0; if(!myPts)return false; return Object.keys(pts).every(k=>k===m||(pts[k]||0)<=myPts); }},
  { id:'shopper',       icon:'🛒', title:'Comprador Mestre',   desc:'Marcou 20 itens como comprados.',      check:(m,db)=>{ return (db.gamification.pontos[m]||0)>=40; /* aproximação via pontos de compras */}},
  { id:'century',       icon:'💰', title:'Centenário',         desc:'Acumulou 100 pontos.',                 check:(m,db)=>(db.gamification.pontos[m]||0)>=100 },
  { id:'millionaire',   icon:'💎', title:'Colecionador',       desc:'Acumulou 500 pontos!',                 check:(m,db)=>(db.gamification.pontos[m]||0)>=500 },
];

// ── Prêmios resgatáveis ─────────────────────────────────────
const PREMIOS_DEF = [
  { id:'sorvete',     icon:'🍦', title:'Sorvete Especial',     custo:50,  desc:'Peça um sorvete do sabor que quiser!',           tier:1 },
  { id:'filme',       icon:'🎬', title:'Escolhe o Filme',      custo:100, desc:'Você escolhe o próximo filme da família.',       tier:1 },
  { id:'videogame',   icon:'🎮', title:'1h Extra de Videogame',custo:150, desc:'Ganhe 1 hora extra de tela.',                   tier:2 },
  { id:'restaurante', icon:'🍕', title:'Pizza em Família',     custo:200, desc:'Uma pizza no restaurante da sua escolha!',      tier:2 },
  { id:'passeio',     icon:'🎡', title:'Passeio Surpresa',     custo:300, desc:'Um passeio especial escolhido pelos pais.',     tier:3 },
  { id:'presente',    icon:'🎁', title:'Presente Surpresa',    custo:500, desc:'Um presente surpresa por atingir 500 pontos!', tier:3 },
];

function getLevel(pts) { return LEVELS.slice().reverse().find(l=>pts>=l.min)||LEVELS[0]; }

function addPontos(membroName, pts, reason) {
  if(!DB.gamification.pontos[membroName]) DB.gamification.pontos[membroName]=0;
  const before=DB.gamification.pontos[membroName];
  DB.gamification.pontos[membroName]+=pts;
  const after=DB.gamification.pontos[membroName];
  const lvlBefore=getLevel(before); const lvlAfter=getLevel(after);
  if(lvlBefore.label!==lvlAfter.label) {
    addNotificacao(`${membroName} subiu de nível! ${lvlAfter.icon}`,`Parabéns! ${membroName} alcançou o nível **${lvlAfter.label}** com ${after} pontos!`,'achievement','trending-up');
  }
  // Verifica prêmios desbloqueados
  PREMIOS_DEF.forEach(p=>{
    const jaResgatou=DB.gamification.premios_resgatados.some(r=>r.id===p.id&&r.memberId===membroName);
    if(!jaResgatou && DB.gamification.pontos[membroName]>=p.custo) {
      // Não resgata automaticamente — só notifica que está disponível
    }
  });
  if(reason) toast(`+${pts} pts para ${membroName}! ${reason}`,'success',2500);
  checkConquistas(membroName);
}

function checkConquistas(membroName) {
  CONQUISTAS_DEF.forEach(def=>{
    const jatem=DB.gamification.conquistas.some(c=>c.id===def.id&&c.memberId===membroName);
    if(!jatem&&def.check(membroName,DB)){
      DB.gamification.conquistas.push({id:def.id,memberId:membroName,date:new Date().toISOString().split('T')[0]});
      addNotificacao(`${membroName} desbloqueou: ${def.icon} ${def.title}`,def.desc,'achievement','award');
      toast(`${def.icon} ${membroName} desbloqueou: ${def.title}!`,'success',4000);
      if(Auth.isLoggedIn())API.post('achievements',{achievement_id:def.id,member_name:membroName});
    }
  });
}

function updateStreak(membroName) {
  const hoje=new Date().toISOString().split('T')[0];
  const ontem=new Date(Date.now()-86400000).toISOString().split('T')[0];
  const last=DB.gamification.lastActivityDate[membroName];
  if(last===hoje)return;
  DB.gamification.streaks[membroName]=(last===ontem)?(DB.gamification.streaks[membroName]||0)+1:1;
  DB.gamification.lastActivityDate[membroName]=hoje;
}

function resgatarPremio(premioId, membroName) {
  const premio = PREMIOS_DEF.find(p=>p.id===premioId);
  const membro = DB.membros.find(m=>m.name===membroName);
  if (!premio||!membro) return;
  const pts = DB.gamification.pontos[membroName]||0;
  if (pts < premio.custo) { toast(`Pontos insuficientes! Precisa de ${premio.custo} pts.`,'error'); return; }
  confirmDialog(`Resgatar "${premio.title}" por ${premio.custo} pontos para ${membroName}?`, ()=>{
    DB.gamification.pontos[membroName] -= premio.custo;
    DB.gamification.premios_resgatados.push({id:premioId, memberId:membroName, date:new Date().toISOString().split('T')[0], titulo:premio.title});
    addNotificacao(`${membroName} resgatou: ${premio.icon} ${premio.title}`,`Parabéns! ${premio.desc}`,'achievement','gift');
    saveDB(); renderApp();
    toast(`${premio.icon} Prêmio resgatado! ${premio.desc}`,'success',5000);
  });
}

function renderLeaderboard() {
  const pts=DB.gamification.pontos;
  const membros=DB.membros.map(m=>({
    name:m.name, photo:m.photo, borderHex:m.borderHex,
    pts:pts[m.name]||0, level:getLevel(pts[m.name]||0),
    conquistas:DB.gamification.conquistas.filter(c=>c.memberId===m.name),
    streak:DB.gamification.streaks[m.name]||0,
  })).sort((a,b)=>b.pts-a.pts);
  if(!membros.length) return '<p class="text-slate-400 text-sm text-center py-4">Adicione membros para ver o ranking.</p>';
  return membros.map((m,i)=>{
    const medals=['🥇','🥈','🥉']; const medal=medals[i]||`#${i+1}`;
    const next=LEVELS.find(l=>l.min>m.pts)||m.level;
    const pctNext=next.min>m.level.min?Math.round(((m.pts-m.level.min)/(next.min-m.level.min))*100):100;
    const avatarFallback=`https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=fff`;
    return `<div class="flex items-center gap-4 p-4 bg-panel-light dark:bg-panel-dark rounded-2xl border border-border-light dark:border-border-dark shadow-sm hover:shadow-md transition-all">
      <div class="text-2xl w-8 text-center flex-shrink-0">${medal}</div>
      <div class="relative flex-shrink-0">
        <img src="${m.photo||avatarFallback}" class="w-12 h-12 rounded-full object-cover border-2" style="border-color:${m.borderHex}">
        <div class="absolute -bottom-1 -right-1 text-sm leading-none">${m.level.icon}</div>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="font-bold text-slate-800 dark:text-slate-100">${m.name}</p>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${m.level.bg} ${m.level.color}">${m.level.label}</span>
          ${m.streak>=3?`<span class="text-[10px] font-bold text-amber-500">🔥 ${m.streak} dias</span>`:''}
        </div>
        <div class="flex items-center gap-2 mt-1.5">
          <div class="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-brand-main to-emerald-400" style="width:${pctNext}%"></div>
          </div>
          <span class="text-[10px] font-bold text-brand-main whitespace-nowrap">${m.pts} pts</span>
        </div>
        ${m.conquistas.length>0?`<div class="flex gap-1 mt-1.5 flex-wrap">${m.conquistas.slice(0,6).map(c=>{const def=CONQUISTAS_DEF.find(d=>d.id===c.id);return def?`<span title="${def.title}" class="text-base cursor-default">${def.icon}</span>`:''}).join('')}${m.conquistas.length>6?`<span class="text-[10px] text-slate-400 font-bold">+${m.conquistas.length-6}</span>`:''}</div>`:''}
      </div>
    </div>`;
  }).join('');
}

// =============================================================================
// 24. VIEW — RANKING (aprimorado com prêmios)
// =============================================================================
function renderRanking() {
  const pts=DB.gamification.pontos;
  const totalPts=Object.values(pts).reduce((a,b)=>a+b,0);
  const totalConq=DB.gamification.conquistas.length;
  const totalResgatados=DB.gamification.premios_resgatados.length;
  const hoje = new Date().toISOString().split('T')[0];

  const membrosStats = DB.membros.map(m => {
    const mPts = pts[m.name]||0;
    const concluidas = DB.atividades.filter(a=>a.resp===m.name&&a.status==='concluida').length;
    const pendentes = DB.atividades.filter(a=>a.resp===m.name&&a.status==='pendente').length;
    const atrasadas = DB.atividades.filter(a=>a.resp===m.name&&a.status==='pendente'&&a.date<hoje).length;
    const streak = DB.gamification.streaks[m.name]||0;
    const conquistas = DB.gamification.conquistas.filter(c=>c.memberId===m.name);
    const lv = getLevel(mPts);
    const nextLv = LEVELS.find(l=>l.min>mPts)||lv;
    const pctNext = nextLv.min>lv.min ? Math.round(((mPts-lv.min)/(nextLv.min-lv.min))*100) : 100;
    return {...m, pts:mPts, concluidas, pendentes, atrasadas, streak, conquistas, lv, nextLv, pctNext};
  }).sort((a,b)=>b.pts-a.pts);

  const podiumColors = ['from-amber-400 to-amber-600','from-slate-300 to-slate-500','from-orange-400 to-orange-600'];
  const podiumBg = ['bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40','bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700','bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40'];
  const medals=['🥇','🥈','🥉'];

  // Selector de membro para resgatar prêmio
  const membrosOpts=DB.membros.map(m=>`<option value="${m.name}">${m.name} (${pts[m.name]||0} pts)</option>`).join('');

  // Top 3 podium HTML
  const podiumHTML = membrosStats.length > 0 ? `
  <div class="flex items-end justify-center gap-4 mb-2">
    ${membrosStats.slice(0,3).map((m,i) => {
      const heights = ['h-32','h-24','h-20'];
      const sizes = ['w-16 h-16','w-12 h-12','w-11 h-11'];
      const positions = [1,0,2]; // 2nd, 1st, 3rd
      const reordered = membrosStats.slice(0,3);
      const display = [reordered[1],reordered[0],reordered[2]].filter(Boolean);
      const displayIdx = [1,0,2];
      return '';
    }).join('')}
    ${(() => {
      const display = [membrosStats[1],membrosStats[0],membrosStats[2]].filter(Boolean);
      const origIdx = [1,0,2];
      const heights = ['h-24','h-32','h-20'];
      return display.map((m,i) => {
        const idx = origIdx[i];
        const avatarFallback=`https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=fff`;
        return `<div class="flex flex-col items-center gap-2">
          <div class="text-xl">${medals[idx]||''}</div>
          <img src="${m.photo||avatarFallback}" class="w-${idx===0?'16':'12'} h-${idx===0?'16':'12'} rounded-full object-cover border-4 shadow-lg" style="border-color:${m.borderHex}">
          <p class="text-[12px] font-bold text-center max-w-[80px] truncate">${m.name}</p>
          <p class="text-[11px] font-black text-brand-main">${m.pts} pts</p>
          <div class="${heights[i]} ${podiumBg[idx]} border rounded-t-xl w-20 flex items-end justify-center pb-2">
            <span class="text-2xl">${m.lv.icon}</span>
          </div>
        </div>`;
      }).join('');
    })()}
  </div>` : '';

  // Atividade recente por membro
  const atividadesRecentes = DB.atividades
    .filter(a=>a.status==='concluida')
    .sort((a,b)=>b.date.localeCompare(a.date))
    .slice(0,5);

  return `<div class="max-w-4xl mx-auto space-y-6">

    <!-- Hero banner -->
    <div class="bg-gradient-to-br from-brand-main to-[#2c5c4e] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
      <div class="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full blur-2xl"></div>
      <div class="absolute -left-4 bottom-0 w-48 h-48 bg-black/10 rounded-full blur-2xl"></div>
      <div class="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p class="text-emerald-200 text-[11px] font-bold uppercase tracking-widest mb-1">Sistema de Gamificação</p>
          <h2 class="text-2xl font-bold mb-3">Ranking da Família 🏆</h2>
          <p class="text-emerald-100 text-sm max-w-xs">Complete tarefas, ganhe pontos e suba no ranking familiar!</p>
        </div>
        <div class="flex gap-4 flex-wrap">
          <div class="text-center"><p class="text-2xl font-black">${totalPts}</p><p class="text-emerald-200 text-[10px] font-bold uppercase tracking-wide">Pontos Totais</p></div>
          <div class="text-center"><p class="text-2xl font-black">${totalConq}</p><p class="text-emerald-200 text-[10px] font-bold uppercase tracking-wide">Conquistas</p></div>
          <div class="text-center"><p class="text-2xl font-black">${totalResgatados}</p><p class="text-emerald-200 text-[10px] font-bold uppercase tracking-wide">Prêmios</p></div>
          <div class="text-center"><p class="text-2xl font-black">${DB.membros.length}</p><p class="text-emerald-200 text-[10px] font-bold uppercase tracking-wide">Membros</p></div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- Coluna esquerda: pódio + leaderboard -->
      <div class="lg:col-span-2 space-y-5">

        <!-- Pódio visual -->
        ${membrosStats.length >= 2 ? `
        <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-5 border border-border-light dark:border-border-dark shadow-sm">
          <h3 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2"><i data-lucide="trophy" class="w-4 h-4 text-amber-500"></i> Pódio</h3>
          ${podiumHTML}
        </div>` : ''}

        <!-- Leaderboard completo -->
        <div>
          <h3 class="text-base font-bold mb-4 flex items-center gap-2"><i data-lucide="list-ordered" class="w-5 h-5 text-brand-main"></i> Placar Geral</h3>
          <div class="space-y-3">${renderLeaderboard()}</div>
        </div>

        <!-- Stats por membro em cards -->
        ${membrosStats.length > 0 ? `
        <div>
          <h3 class="text-base font-bold mb-4 flex items-center gap-2"><i data-lucide="bar-chart-2" class="w-5 h-5 text-blue-500"></i> Estatísticas por Membro</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${membrosStats.map((m,i) => {
              const avatarFallback=`https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=fff`;
              return `<div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-4 border border-border-light dark:border-border-dark shadow-sm">
                <div class="flex items-center gap-3 mb-4">
                  <div class="relative">
                    <img src="${m.photo||avatarFallback}" class="w-11 h-11 rounded-full object-cover border-2" style="border-color:${m.borderHex}">
                    <span class="absolute -top-1 -right-1 text-sm">${medals[i]||''}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-bold truncate">${m.name}</p>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${m.lv.bg} ${m.lv.color}">${m.lv.icon} ${m.lv.label}</span>
                  </div>
                  <div class="text-right">
                    <p class="text-lg font-black text-brand-main">${m.pts}</p>
                    <p class="text-[9px] text-slate-400 font-bold">pontos</p>
                  </div>
                </div>
                <div class="grid grid-cols-3 gap-2 text-center mb-3">
                  <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl py-2">
                    <p class="text-sm font-black text-emerald-600">${m.concluidas}</p>
                    <p class="text-[9px] text-slate-400 font-bold">Concluídas</p>
                  </div>
                  <div class="bg-amber-50 dark:bg-amber-900/20 rounded-xl py-2">
                    <p class="text-sm font-black text-amber-600">${m.pendentes}</p>
                    <p class="text-[9px] text-slate-400 font-bold">Pendentes</p>
                  </div>
                  <div class="bg-orange-50 dark:bg-orange-900/20 rounded-xl py-2">
                    <p class="text-sm font-black text-orange-500">🔥${m.streak}</p>
                    <p class="text-[9px] text-slate-400 font-bold">Streak</p>
                  </div>
                </div>
                ${m.conquistas.length>0?`<div class="flex gap-1 flex-wrap"><p class="text-[9px] text-slate-400 font-bold uppercase tracking-wide w-full mb-1">Conquistas</p>${m.conquistas.slice(0,8).map(c=>{const def=CONQUISTAS_DEF.find(d=>d.id===c.id);return def?`<span title="${def.title}" class="text-base cursor-default">${def.icon}</span>`:''}).join('')}${m.conquistas.length>8?`<span class="text-[10px] text-slate-400 font-bold ml-1">+${m.conquistas.length-8}</span>`:''}</div>`:'<p class="text-[11px] text-slate-400 italic">Nenhuma conquista ainda</p>'}
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

        <!-- Atividade recente concluída -->
        ${atividadesRecentes.length > 0 ? `
        <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-5 border border-border-light dark:border-border-dark shadow-sm">
          <h3 class="font-bold mb-4 flex items-center gap-2"><i data-lucide="activity" class="w-5 h-5 text-emerald-500"></i> Atividade Recente</h3>
          <div class="space-y-2">
            ${atividadesRecentes.map(a=>`
            <div class="flex items-center gap-3 p-2.5 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl">
              <div class="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></div>
              <div class="flex-1 min-w-0">
                <p class="text-[13px] font-semibold truncate">${a.title}</p>
                <p class="text-[11px] text-slate-400">${a.resp} · ${a.date.split('-').reverse().join('/')}</p>
              </div>
              <span class="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">✓ Concluída</span>
            </div>`).join('')}
          </div>
        </div>` : ''}
      </div>

      <!-- Coluna direita: como ganhar pontos + prêmios + conquistas -->
      <div class="space-y-5">

        <!-- Como ganhar pontos -->
        <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-5 border border-border-light dark:border-border-dark shadow-sm">
          <h3 class="font-bold mb-4 flex items-center gap-2"><i data-lucide="zap" class="w-5 h-5 text-brand-main"></i> Como Ganhar Pontos</h3>
          <div class="space-y-2">
            ${[
              {pts:'+10',label:'Concluir qualquer tarefa',color:'text-brand-main',bg:'bg-brand-main/10'},
              {pts:'+5', label:'Tarefa de prioridade Alta',color:'text-amber-500',bg:'bg-amber-50 dark:bg-amber-900/20'},
              {pts:'+15',label:'Tarefa Urgente concluída',color:'text-red-500',bg:'bg-red-50 dark:bg-red-900/20'},
              {pts:'+5', label:'Concluir no prazo',color:'text-blue-500',bg:'bg-blue-50 dark:bg-blue-900/20'},
              {pts:'+N', label:'Bônus de sequência',color:'text-orange-500',bg:'bg-orange-50 dark:bg-orange-900/20'},
              {pts:'+2', label:'Item de compra comprado',color:'text-emerald-500',bg:'bg-emerald-50 dark:bg-emerald-900/20'},
            ].map(r=>`<div class="flex items-center gap-2.5 p-2.5 ${r.bg} rounded-xl">
              <span class="font-black w-10 text-center text-sm flex-shrink-0 ${r.color}">${r.pts}</span>
              <span class="text-[12px] text-slate-600 dark:text-slate-300">${r.label}</span>
            </div>`).join('')}
          </div>
        </div>

        <!-- Níveis -->
        <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-5 border border-border-light dark:border-border-dark shadow-sm">
          <h3 class="font-bold mb-4 flex items-center gap-2"><i data-lucide="layers" class="w-5 h-5 text-purple-500"></i> Níveis</h3>
          <div class="space-y-2">
            ${LEVELS.map(l=>`<div class="flex items-center gap-2.5 p-2.5 ${l.bg} rounded-xl">
              <span class="text-lg flex-shrink-0">${l.icon}</span>
              <div class="flex-1 min-w-0">
                <p class="text-[12px] font-bold ${l.color}">${l.label}</p>
                <p class="text-[10px] text-slate-400">${l.min}+ pontos</p>
              </div>
            </div>`).join('')}
          </div>
        </div>

        <!-- Prêmios -->
        <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-5 border border-border-light dark:border-border-dark shadow-sm">
          <h3 class="font-bold mb-1 flex items-center gap-2"><i data-lucide="gift" class="w-5 h-5 text-rose-500"></i> Prêmios & Recompensas</h3>
          <p class="text-[12px] text-slate-400 mb-4">Acumule pontos e troque por recompensas reais!</p>
          ${DB.membros.length>0?`<div class="flex items-center gap-2 mb-4">
            <span class="text-[12px] text-slate-500 font-medium">Resgatar como:</span>
            <select id="premios-membro" class="px-3 py-1.5 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-slate-800 text-sm font-medium flex-1">${membrosOpts}</select>
          </div>`:''}
          <div class="space-y-3">
            ${PREMIOS_DEF.map(p=>{
              const tierColors={1:'border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-900/10',2:'border-blue-200 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-900/10',3:'border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-900/10'};
              const tierBadge={1:'bg-emerald-100 text-emerald-700',2:'bg-blue-100 text-blue-700',3:'bg-amber-100 text-amber-700'};
              const tierLabels={1:'Básico',2:'Médio',3:'Premium'};
              const resgatados=DB.gamification.premios_resgatados.filter(r=>r.id===p.id).length;
              return `<div class="p-3.5 rounded-xl border ${tierColors[p.tier]||'border-border-light'}">
                <div class="flex items-start justify-between gap-2 mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-2xl">${p.icon}</span>
                    <div>
                      <p class="font-bold text-[13px]">${p.title}</p>
                      <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tierBadge[p.tier]}">${tierLabels[p.tier]}</span>
                    </div>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <p class="text-base font-black text-brand-main">${p.custo}</p>
                    <p class="text-[9px] text-slate-400 font-bold">pts</p>
                  </div>
                </div>
                <p class="text-[11px] text-slate-500 mb-2.5">${p.desc}</p>
                <div class="flex items-center justify-between">
                  ${resgatados>0?`<span class="text-[10px] text-slate-400">${resgatados}x resgatado</span>`:'<span></span>'}
                  <button onclick="resgatarPremio('${p.id}', document.getElementById('premios-membro')?.value || '${DB.membros[0]?.name||''}')"
                    class="px-3 py-1.5 rounded-lg bg-brand-main text-white text-[11px] font-bold hover:bg-brand-dark transition-colors shadow-sm">
                    Resgatar</button>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Conquistas disponíveis -->
        <div>
          <h3 class="text-base font-bold mb-4 flex items-center gap-2"><i data-lucide="award" class="w-5 h-5 text-purple-500"></i> Conquistas</h3>
          <div class="space-y-2">
            ${CONQUISTAS_DEF.map(def=>{
              const membrosComConq=DB.gamification.conquistas.filter(c=>c.id===def.id).map(c=>c.memberId);
              const ok=membrosComConq.length>0;
              return `<div class="flex items-center gap-3 p-3.5 rounded-2xl border transition-all
                ${ok?'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40':'bg-panel-light dark:bg-panel-dark border-border-light dark:border-border-dark opacity-60'}">
                <div class="text-2xl flex-shrink-0">${ok?def.icon:'🔒'}</div>
                <div class="flex-1 min-w-0">
                  <p class="font-bold text-[13px]">${def.title}</p>
                  <p class="text-[11px] text-slate-500 mt-0.5">${def.desc}</p>
                  ${ok?`<p class="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1">🏅 ${membrosComConq.slice(0,3).join(', ')}</p>`:''}
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Histórico de prêmios -->
        ${DB.gamification.premios_resgatados.length>0?`
        <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-5 border border-border-light dark:border-border-dark shadow-sm">
          <h3 class="font-bold mb-4 flex items-center gap-2"><i data-lucide="history" class="w-5 h-5 text-slate-500"></i> Histórico de Resgates</h3>
          <div class="space-y-2">
            ${DB.gamification.premios_resgatados.slice(-8).reverse().map(r=>{
              const p=PREMIOS_DEF.find(p=>p.id===r.id);
              return `<div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span class="text-xl">${p?p.icon:'🎁'}</span>
                <div class="flex-1"><p class="text-[13px] font-semibold">${r.titulo||p?.title||r.id}</p><p class="text-[11px] text-slate-400">${r.memberId} · ${r.date}</p></div>
              </div>`;
            }).join('')}
          </div>
        </div>`:``}
      </div>
    </div>
  </div>`;
}

// =============================================================================
// 25. NOTIFICAÇÕES
// =============================================================================
function addNotificacao(title,msg,type='info',icon='bell') {
  DB.notificacoes.unshift({id:Date.now(),title,msg,type,icon,read:false,date:new Date().toISOString()});
  if(DB.notificacoes.length>50) DB.notificacoes=DB.notificacoes.slice(0,50);
  updateNotifBadge();
  if(Auth.isLoggedIn())API.post('notifications/create',{title,message:msg,type,icon}).catch(()=>{});
}
function updateNotifBadge() {
  const badge=document.getElementById('notif-badge'); if(!badge)return;
  const count=DB.notificacoes.filter(n=>!n.read).length;
  badge.textContent=count>9?'9+':String(count); badge.style.display=count>0?'flex':'none';
}
function toggleNotifPanel() { const panel=document.getElementById('notif-panel'); if(!panel)return; panel.classList.contains('translate-x-full')?openNotifPanel():closeNotifPanel(); }
function openNotifPanel() {
  const panel=document.getElementById('notif-panel'); const overlay=document.getElementById('notif-overlay'); if(!panel)return;
  renderNotifPanel(); panel.classList.remove('translate-x-full'); overlay.classList.remove('hidden');
  DB.notificacoes.forEach(n=>n.read=true); updateNotifBadge(); saveDB(false);
  if(Auth.isLoggedIn())API.markAllRead();
}
function closeNotifPanel() { document.getElementById('notif-panel')?.classList.add('translate-x-full'); document.getElementById('notif-overlay')?.classList.add('hidden'); }
function renderNotifPanel() {
  const list=document.getElementById('notif-list'); if(!list)return;
  const typeConfig={achievement:{bg:'bg-amber-50 dark:bg-amber-900/20',border:'border-amber-200 dark:border-amber-800/40',iconColor:'text-amber-500'},success:{bg:'bg-emerald-50 dark:bg-emerald-900/20',border:'border-emerald-200 dark:border-emerald-800/40',iconColor:'text-emerald-500'},warning:{bg:'bg-red-50 dark:bg-red-900/20',border:'border-red-200 dark:border-red-800/40',iconColor:'text-red-500'},info:{bg:'bg-blue-50 dark:bg-blue-900/20',border:'border-blue-200 dark:border-blue-800/40',iconColor:'text-blue-500'}};
  if(!DB.notificacoes.length){list.innerHTML=`<div class="text-center py-16 text-slate-400"><i data-lucide="bell-off" class="w-10 h-10 mx-auto mb-3 opacity-30"></i><p class="font-medium text-sm">Nenhuma notificação</p></div>`;lucide.createIcons({nodes:[list]});return;}
  list.innerHTML=DB.notificacoes.map(n=>{const cfg=typeConfig[n.type]||typeConfig.info; return `<div class="p-3 rounded-xl border ${cfg.bg} ${cfg.border} mb-2">
    <div class="flex gap-3"><i data-lucide="${n.icon||'bell'}" class="w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.iconColor}"></i>
      <div class="flex-1 min-w-0">
        <p class="text-[13px] font-bold leading-snug">${n.title}</p>
        <p class="text-[12px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">${n.msg}</p>
        <p class="text-[10px] text-slate-400 mt-1.5 font-medium">${getTimeAgo(n.date)}</p>
      </div></div></div>`;}).join('');
  lucide.createIcons({nodes:[list]});
}
function getTimeAgo(dateStr) {
  const diff=Math.floor((Date.now()-new Date(dateStr).getTime())/1000);
  if(diff<60)return 'agora mesmo'; if(diff<3600)return `há ${Math.floor(diff/60)} min`;
  if(diff<86400)return `há ${Math.floor(diff/3600)}h`;
  if(diff<604800)return `há ${Math.floor(diff/86400)} dia${Math.floor(diff/86400)>1?'s':''}`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}
function checkAutoNotificacoes() {
  const hoje=new Date().toISOString().split('T')[0];
  const ontem=new Date(Date.now()-86400000).toISOString().split('T')[0];
  DB.atividades.filter(a=>a.status==='pendente'&&a.date===ontem).forEach(a=>{
    const jaNotif=DB.notificacoes.some(n=>n.msg&&n.msg.includes(a.title)&&n.type==='warning');
    if(!jaNotif)addNotificacao(`⚠️ Tarefa em atraso: ${a.title}`,`Atribuída a ${a.resp} — venceu ontem!`,'warning','alert-triangle');
  });
  const taskHoje=DB.atividades.filter(a=>a.date===hoje&&a.status!=='concluida');
  if(taskHoje.length>0){
    const jaViu=DB.notificacoes.some(n=>n.type==='info'&&n.date&&n.date.startsWith(hoje)&&n.icon==='calendar');
    if(!jaViu)addNotificacao(`📅 ${taskHoje.length} tarefa${taskHoje.length>1?'s':''} para hoje`,taskHoje.slice(0,3).map(t=>`• ${t.title} (${t.resp})`).join('\n')+(taskHoje.length>3?`\n• e mais ${taskHoje.length-3}...`:''),'info','calendar');
  }
}

// =============================================================================
// 26. INTERCEPTORS DE GAMIFICAÇÃO
// =============================================================================
const _origToggle=window.toggleStatusAtividade;
window.toggleStatusAtividade=function(id){
  const at=DB.atividades.find(a=>a.id===id); const wasNotConcluida=at&&at.status!=='concluida';
  _origToggle(id);
  const atU=DB.atividades.find(a=>a.id===id);
  if(atU&&atU.status==='concluida'&&wasNotConcluida){
    const hoje=new Date().toISOString().split('T')[0];
    let pts=10;
    if(atU.priority==='alta')     pts+=5;
    if(atU.priority==='urgente')  pts+=15;
    if(atU.date>=hoje)            pts+=5;
    if(atU.priority==='urgente'&&atU.date>=hoje) pts+=5; // bônus urgente no prazo
    updateStreak(atU.resp);
    pts+=(DB.gamification.streaks[atU.resp]||1)-1;
    addPontos(atU.resp,pts,'✅ Tarefa concluída!');
    saveDB();
  }
};
const _origSetStatus=window.setStatusAtividade;
window.setStatusAtividade=function(id,status){
  const at=DB.atividades.find(a=>a.id===id); const wasNotConcluida=at&&at.status!=='concluida';
  _origSetStatus(id,status);
  if(status==='concluida'&&wasNotConcluida&&at){
    const hoje=new Date().toISOString().split('T')[0];
    let pts=10;
    if(at.priority==='alta')    pts+=5;
    if(at.priority==='urgente') pts+=15;
    if(at.date>=hoje)           pts+=5;
    updateStreak(at.resp);
    addPontos(at.resp,pts,'✅ Tarefa concluída!');
    saveDB();
  }
};
const _origCheckItem=window.checkItem;
window.checkItem=function(lIdx,iIdx){
  _origCheckItem(lIdx,iIdx);
  if(DB.membros.length>0) addPontos(DB.membros[0].name,2,'🛒 Item comprado!');
};

// =============================================================================
// 27. AUTH
// =============================================================================
function handleLogout() {
  if(Auth.isLoggedIn()){fetch(`${API_BASE}auth.php?action=logout`,{method:'POST',headers:{Authorization:`Bearer ${Auth.getToken()}`}}).catch(()=>{});}
  Auth.clear(); localStorage.removeItem('familyHubDB'); window.location.href='index.html';
}
function updateUserInfo() {
  const user=Auth.getUser(); if(!user)return;
  if(user.familyName&&DB.settings.familyName==='Família Gomes'){DB.settings.familyName=user.familyName;}
}

