// =============================================================================
// FAMILYHUB — ui.js
// UI helpers: Toasts, Dialogs, Dark Mode, Sidebar, Header
// =============================================================================

// ─── Toasts ───────────────────────────────────────────────────────────────────
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

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
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

// ─── Dark Mode ────────────────────────────────────────────────────────────────
function toggleDarkMode() { isDarkMode=!isDarkMode; localStorage.setItem('familyHubDarkMode',isDarkMode); applyDarkMode(); if(currentView==='configuracoes')renderApp(); }
function applyDarkMode()  { document.documentElement.classList.toggle('dark',isDarkMode); }

// ─── Sidebar ──────────────────────────────────────────────────────────────────
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

// ─── Header ───────────────────────────────────────────────────────────────────
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

// ─── Widget próximo evento ────────────────────────────────────────────────────
function updateNextEventWidget() {
  const hoje=new Date().toISOString().split('T')[0];
  const proximo=DB.atividades.filter(a=>a.date>=hoje&&a.status!=='concluida').sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time))[0];
  const titleEl=document.getElementById('next-event-title'); const dateEl=document.getElementById('next-event-date');
  if(!titleEl||!dateEl) return;
  if(proximo){titleEl.textContent=proximo.title; const {label}=formatDateLabel(proximo.date); dateEl.textContent=`${label} · ${proximo.time}`;}
  else{titleEl.textContent='Nenhum evento futuro'; dateEl.textContent='Tudo em dia! 🎉';}
}
