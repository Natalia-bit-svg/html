// =============================================================================
// FAMILYHUB — views/view-receitas.js
// =============================================================================

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