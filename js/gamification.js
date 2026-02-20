// =============================================================================
// FAMILYHUB — gamification.js
// Sistema de pontos, níveis, conquistas e prêmios
// =============================================================================

function addPontos(membroName, pts, reason) {
  if(!DB.gamification.pontos[membroName]) DB.gamification.pontos[membroName]=0;
  const before=DB.gamification.pontos[membroName];
  DB.gamification.pontos[membroName]+=pts;
  const after=DB.gamification.pontos[membroName];
  const lvlBefore=getLevel(before); const lvlAfter=getLevel(after);
  if(lvlBefore.label!==lvlAfter.label) {
    addNotificacao(`${membroName} subiu de nível! ${lvlAfter.icon}`,`Parabéns! ${membroName} alcançou o nível **${lvlAfter.label}** com ${after} pontos!`,'achievement','trending-up');
  }
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

// ─── Interceptors de gamificação ──────────────────────────────────────────────
const _origToggle = window.toggleStatusAtividade;
window.toggleStatusAtividade = function(id){
  const at=DB.atividades.find(a=>a.id===id); const wasNotConcluida=at&&at.status!=='concluida';
  _origToggle(id);
  const atU=DB.atividades.find(a=>a.id===id);
  if(atU&&atU.status==='concluida'&&wasNotConcluida){
    const hoje=new Date().toISOString().split('T')[0];
    let pts=10;
    if(atU.priority==='alta')     pts+=5;
    if(atU.priority==='urgente')  pts+=15;
    if(atU.date>=hoje)            pts+=5;
    if(atU.priority==='urgente'&&atU.date>=hoje) pts+=5;
    updateStreak(atU.resp);
    pts+=(DB.gamification.streaks[atU.resp]||1)-1;
    addPontos(atU.resp,pts,'✅ Tarefa concluída!');
    // Salva log de atividade
    saveActivityLog(atU.resp, `Tarefa "${atU.title}" concluída`);
    saveDB();
  }
};

const _origSetStatus = window.setStatusAtividade;
window.setStatusAtividade = function(id,status){
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
    saveActivityLog(at.resp, `Tarefa "${at.title}" marcada como concluída`);
    saveDB();
  }
};

const _origCheckItem = window.checkItem;
window.checkItem = function(lIdx,iIdx){
  _origCheckItem(lIdx,iIdx);
  if(DB.membros.length>0) addPontos(DB.membros[0].name,2,'🛒 Item comprado!');
};

// ─── Salvar log no backend ────────────────────────────────────────────────────
function saveActivityLog(membroName, message) {
  if(!Auth.isLoggedIn()) return;
  API.post('logs', { description: `[${membroName}] ${message}` }).catch(()=>{});
}

// ─── Carregar logs ────────────────────────────────────────────────────────────
async function loadLogs() {
  const container = document.getElementById('logs-container');
  if (!container) return;
  container.innerHTML = `<div class="text-center py-8 text-slate-400"><i data-lucide="loader" class="w-6 h-6 mx-auto mb-2 animate-spin opacity-50"></i><p class="text-sm">Carregando...</p></div>`;
  lucide.createIcons({ nodes: [container] });

  if (!Auth.isLoggedIn()) {
    container.innerHTML = `<div class="text-center py-8 text-slate-400"><p class="text-sm">Faça login para ver o histórico.</p></div>`;
    return;
  }

  const res = await API.get('logs');
  if (!res.ok || !res.data) {
    container.innerHTML = `<div class="text-center py-8 text-slate-400"><i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 opacity-30"></i><p class="text-sm">Nenhum registro encontrado.</p></div>`;
    lucide.createIcons({ nodes: [container] });
    return;
  }

  if (res.data.length === 0) {
    container.innerHTML = `<div class="text-center py-8 text-slate-400"><i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 opacity-30"></i><p class="text-sm">Nenhum histórico ainda. Complete algumas atividades!</p></div>`;
    lucide.createIcons({ nodes: [container] });
    return;
  }

  container.innerHTML = res.data.map(log => {
    const date = new Date(log.created_at).toLocaleString('pt-BR');
    return `<div class="flex items-start gap-3 p-4 bg-panel-light dark:bg-panel-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
      <div class="p-2 bg-brand-main/10 rounded-lg flex-shrink-0">
        <i data-lucide="clock" class="w-4 h-4 text-brand-main"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-[14px] font-medium text-slate-700 dark:text-slate-200">${log.description}</p>
        <p class="text-[11px] text-slate-400 mt-1">${date}</p>
      </div>
    </div>`;
  }).join('');
  lucide.createIcons({ nodes: [container] });
}
