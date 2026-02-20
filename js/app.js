// =============================================================================
// FAMILYHUB — app.js  (Orquestrador Principal)
// Importa todos os módulos e inicializa a aplicação
// =============================================================================

// ─── Navegação ────────────────────────────────────────────────────────────────
function changeView(viewId) {
  currentView      = viewId;
  globalSearchOpen = false;
  globalSearch     = '';
  const searchInput = document.getElementById('global-search');
  if (searchInput) searchInput.value = '';
  closeSearchDropdown();
  // Reseta filtros do calendário ao sair da view
  if (viewId !== 'calendario') {
    calFilterMembro = 'Todos';
    calFilterCat    = 'Todas';
  }
  renderApp();
  // Sincroniza leaderboard com servidor ao abrir a view de ranking
  if (viewId === 'ranking') syncLeaderboardFromServer();
}

// ─── Render principal ─────────────────────────────────────────────────────────
function renderApp() {
  renderSidebar(); updateHeader(); updateSidebarSettings(); updateNextEventWidget();
  const content=document.getElementById('page-content');
  const views={
    dashboard:    renderDashboard,
    calendario:   renderCalendar,
    atividades:   renderAtividades,
    compras:      renderListas,
    receitas:     renderReceitas,
    membros:      renderMembros,
    ranking:      renderRanking,
    estatisticas: renderEstatisticas,
    configuracoes:renderConfiguracoes,
    logs:         renderLogs,
  };
  content.innerHTML = views[currentView]?views[currentView]():'';

  // Auto-carrega logs ao abrir a seção
  if (currentView === 'logs') {
    setTimeout(() => loadLogs(), 100);
  }

  lucide.createIcons();
}

// ─── Eventos globais de teclado ───────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if(e.key!=='Escape') return;
  const overlay=document.getElementById('modal-overlay');
  if(overlay&&!overlay.classList.contains('hidden')){closeModal();return;}
  const confirmOverlay=document.getElementById('confirm-overlay');
  if(confirmOverlay&&!confirmOverlay.classList.contains('hidden'))closeConfirm();
  closeSearchDropdown();
});

// ─── Inicialização ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  applyDarkMode(); updateUserInfo(); checkAutoNotificacoes();

  if (Auth.isLoggedIn()) {
    const serverLoaded = await API.loadUserData().catch(() => false);
    if (serverLoaded) {
      DB.atividades = (DB.atividades||[]).map(a => ({ status:'pendente', priority:'media', notes:'', ...a }));
      DB.listas     = (DB.listas    ||[]).map((l,i) => ({ id: l.id||Date.now()+i, icon: l.icon||'shopping-cart', ...l }));
      DB.receitas   = (DB.receitas  ||[]).map(r => ({ porcoes:4, ...r }));
      DB.membros    = (DB.membros   ||[]).map(m => ({ borderHex:'#3b82f6', ...m }));
      if (!DB.gamification)                    DB.gamification = JSON.parse(JSON.stringify(emptyDB.gamification));
      if (!DB.gamification.pontos)             DB.gamification.pontos = {};
      if (!DB.gamification.conquistas)         DB.gamification.conquistas = [];
      if (!DB.gamification.streaks)            DB.gamification.streaks = {};
      if (!DB.gamification.lastActivityDate)   DB.gamification.lastActivityDate = {};
      if (!DB.gamification.premios_resgatados) DB.gamification.premios_resgatados = [];
      if (!DB.gamification.desafios)           DB.gamification.desafios = [];
      if (!DB.notificacoes)                    DB.notificacoes = [];
    }
    API.loadNotifications().catch(() => {});
  }

  renderApp();
  initGlobalSearch();

  // Mensagem de boas-vindas (apenas uma vez por sessão)
  const welcomeKey = `fh_welcomed_${Auth.getUser()?.id || 'guest'}`;
  if (!localStorage.getItem(welcomeKey)) {
    const user = Auth.getUser();
    const nome = user?.name || DB.settings.familyName;
    addNotificacao(
      'Bem-vindo, ' + nome + '! 👋',
      'Seu FamilyHub está pronto. Comece adicionando membros e atividades!',
      'success', 'smile'
    );
    localStorage.setItem(welcomeKey, '1');
    saveDB(false);
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
