// =============================================================================
// FAMILYHUB — notifications.js
// Sistema de notificações e alertas automáticos
// =============================================================================

function addNotificacao(title, msg, type='info', icon='bell') {
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

function toggleNotifPanel() {
  const panel=document.getElementById('notif-panel'); if(!panel)return;
  panel.classList.contains('translate-x-full')?openNotifPanel():closeNotifPanel();
}

function openNotifPanel() {
  const panel=document.getElementById('notif-panel'); const overlay=document.getElementById('notif-overlay'); if(!panel)return;
  renderNotifPanel(); panel.classList.remove('translate-x-full'); overlay.classList.remove('hidden');
  DB.notificacoes.forEach(n=>n.read=true); updateNotifBadge(); saveDB(false);
  if(Auth.isLoggedIn())API.markAllRead();
}

function closeNotifPanel() {
  document.getElementById('notif-panel')?.classList.add('translate-x-full');
  document.getElementById('notif-overlay')?.classList.add('hidden');
}

function renderNotifPanel() {
  const list=document.getElementById('notif-list'); if(!list)return;
  const typeConfig={
    achievement:{bg:'bg-amber-50 dark:bg-amber-900/20',border:'border-amber-200 dark:border-amber-800/40',iconColor:'text-amber-500'},
    success:{bg:'bg-emerald-50 dark:bg-emerald-900/20',border:'border-emerald-200 dark:border-emerald-800/40',iconColor:'text-emerald-500'},
    warning:{bg:'bg-red-50 dark:bg-red-900/20',border:'border-red-200 dark:border-red-800/40',iconColor:'text-red-500'},
    info:{bg:'bg-blue-50 dark:bg-blue-900/20',border:'border-blue-200 dark:border-blue-800/40',iconColor:'text-blue-500'}
  };
  if(!DB.notificacoes.length){
    list.innerHTML=`<div class="text-center py-16 text-slate-400"><i data-lucide="bell-off" class="w-10 h-10 mx-auto mb-3 opacity-30"></i><p class="font-medium text-sm">Nenhuma notificação</p></div>`;
    lucide.createIcons({nodes:[list]});return;
  }
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
