// =============================================================================
// FAMILYHUB — views/view-calendar.js
// =============================================================================

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
  const catOpts     = ['Todas','Tarefa Doméstica','Escola','Esporte','Saúde', 'Social', ].map(c=>`<option ${calFilterCat===c?'selected':''}>${c}</option>`).join('');

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