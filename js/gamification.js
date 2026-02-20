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
    saveActivityLog(membroName, `Resgatou o prêmio "${premio.title}" (${premio.custo} pts)`, 'premio');
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
    saveActivityLog(atU.resp, `Concluiu a atividade "${atU.title}"`, 'concluir');
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
    saveActivityLog(at.resp, `Concluiu a atividade "${at.title}"`, 'concluir');
    saveDB();
  }
};

const _origCheckItem = window.checkItem;
window.checkItem = function(lIdx,iIdx){
  _origCheckItem(lIdx,iIdx);
  if(DB.membros.length>0) addPontos(DB.membros[0].name,2,'🛒 Item comprado!');
};

// ─── Sistema de logs local + backend ─────────────────────────────────────────
// Tipos de ação com ícone e cor
const LOG_ICONS = {
  criar:     { icon: 'plus-circle',   color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20'  },
  editar:    { icon: 'edit-3',        color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20'        },
  excluir:   { icon: 'trash-2',       color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-900/20'          },
  concluir:  { icon: 'check-circle',  color: 'text-brand-main',  bg: 'bg-brand-main/10'                      },
  status:    { icon: 'refresh-cw',    color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20'      },
  foto:      { icon: 'camera',        color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/20'    },
  config:    { icon: 'settings',      color: 'text-slate-500',   bg: 'bg-slate-100 dark:bg-slate-800'        },
  premio:    { icon: 'gift',          color: 'text-rose-500',    bg: 'bg-rose-50 dark:bg-rose-900/20'        },
  conquista: { icon: 'award',         color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20'      },
  lista:     { icon: 'shopping-cart', color: 'text-cyan-500',    bg: 'bg-cyan-50 dark:bg-cyan-900/20'        },
  receita:   { icon: 'utensils',      color: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-900/20'    },
  membro:    { icon: 'user',          color: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-900/20'    },
  default:   { icon: 'clock',         color: 'text-brand-main',  bg: 'bg-brand-main/10'                      },
};

function saveActivityLog(actor, message, tipo) {
  // Inicializa array de logs locais se não existir
  if (!DB.logs) DB.logs = [];

  const entry = {
    id:          Date.now() + Math.random(),
    actor:       actor || 'Sistema',
    description: message,
    tipo:        tipo || 'default',
    created_at:  new Date().toISOString(),
  };

  // Insere no início e limita a 200 entradas locais
  DB.logs.unshift(entry);
  if (DB.logs.length > 200) DB.logs = DB.logs.slice(0, 200);

  saveDB(false); // salva localmente sem sincronizar (evita loop)

  // Tenta enviar ao backend também (não bloqueia)
  if (Auth.isLoggedIn()) {
    API.post('logs', { description: `[${actor}] ${message}` }).catch(() => {});
  }
}

// ─── Carregar e renderizar logs ───────────────────────────────────────────────
async function loadLogs() {
  const container = document.getElementById('logs-container');
  if (!container) return;

  container.innerHTML = `<div class="text-center py-8 text-slate-400">
    <i data-lucide="loader" class="w-6 h-6 mx-auto mb-2 animate-spin opacity-50"></i>
    <p class="text-sm">Carregando...</p>
  </div>`;
  lucide.createIcons({ nodes: [container] });

  // Tenta carregar logs do backend se estiver logado
  if (Auth.isLoggedIn()) {
    try {
      const res = await API.get('logs');
      if (res.ok && res.data && res.data.length > 0) {
        // Mescla logs do backend com os locais, removendo duplicatas por descrição+data
        const backendLogs = res.data.map(l => ({
          id:          l.id || Date.now() + Math.random(),
          actor:       'Sistema',
          description: l.description,
          tipo:        detectTipo(l.description),
          created_at:  l.created_at,
        }));
        renderLogsHTML(container, backendLogs);
        return;
      }
    } catch (_) {}
  }

  // Fallback: logs locais do DB
  const localLogs = DB.logs || [];
  if (localLogs.length === 0) {
    container.innerHTML = `<div class="text-center py-12 text-slate-400">
      <i data-lucide="inbox" class="w-10 h-10 mx-auto mb-3 opacity-30"></i>
      <p class="font-medium text-sm">Nenhuma ação registrada ainda.</p>
      <p class="text-xs mt-1">As ações aparecem aqui automaticamente.</p>
    </div>`;
    lucide.createIcons({ nodes: [container] });
    return;
  }

  renderLogsHTML(container, localLogs);
}

function detectTipo(description) {
  const d = (description || '').toLowerCase();
  if (d.includes('criou') || d.includes('criada') || d.includes('criado') || d.includes('adicionou') || d.includes('adicionada'))  return 'criar';
  if (d.includes('editou') || d.includes('editada') || d.includes('atualizado') || d.includes('atualizada')) return 'editar';
  if (d.includes('excluiu') || d.includes('excluída') || d.includes('removeu') || d.includes('removida')) return 'excluir';
  if (d.includes('concluída') || d.includes('concluiu')) return 'concluir';
  if (d.includes('foto') || d.includes('imagem') || d.includes('photo')) return 'foto';
  if (d.includes('status') || d.includes('andamento') || d.includes('pendente')) return 'status';
  if (d.includes('receita')) return 'receita';
  if (d.includes('lista')) return 'lista';
  if (d.includes('membro')) return 'membro';
  if (d.includes('configuração') || d.includes('configuracoes') || d.includes('família')) return 'config';
  if (d.includes('prêmio') || d.includes('resgatou')) return 'premio';
  if (d.includes('conquista')) return 'conquista';
  return 'default';
}

function renderLogsHTML(container, logs) {
  const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1)  return 'agora mesmo';
    if (m < 60) return `há ${m} min`;
    if (h < 24) return `há ${h}h`;
    if (d < 7)  return `há ${d} dia${d > 1 ? 's' : ''}`;
    return new Date(iso).toLocaleDateString('pt-BR');
  };

  const formatDate = (iso) => {
    try { return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
    catch { return iso; }
  };

  container.innerHTML = logs.slice(0, 50).map(log => {
    const tipo  = LOG_ICONS[log.tipo] || LOG_ICONS.default;
    const ago   = timeAgo(log.created_at);
    const full  = formatDate(log.created_at);
    // Remove o prefixo [Actor] se já estiver na descrição
    const desc  = (log.description || '').replace(/^\[.*?\]\s*/, '');
    const actor = log.actor && log.actor !== 'Sistema' ? log.actor : '';

    return `<div class="flex items-start gap-3 p-4 bg-panel-light dark:bg-panel-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm hover:shadow-md transition-shadow">
      <div class="p-2 ${tipo.bg} rounded-lg flex-shrink-0 mt-0.5">
        <i data-lucide="${tipo.icon}" class="w-4 h-4 ${tipo.color}"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-[13px] font-medium text-slate-700 dark:text-slate-200">${desc}</p>
        ${actor ? `<p class="text-[11px] text-slate-400 mt-0.5">👤 ${actor}</p>` : ''}
      </div>
      <div class="text-right flex-shrink-0">
        <p class="text-[11px] font-medium text-slate-400" title="${full}">${ago}</p>
      </div>
    </div>`;
  }).join('');

  lucide.createIcons({ nodes: [container] });
}
