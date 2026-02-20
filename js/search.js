// =============================================================================
// FAMILYHUB — search.js
// Busca global com dropdown
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
