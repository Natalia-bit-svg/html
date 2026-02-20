// =============================================================================
// FAMILYHUB — utils.js
// Funções utilitárias e helpers
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
    'SOCIAL':           'text-purple-500 bg-purple-50 dark:bg-purple-900/30',
  };
  return map[cat] || 'text-slate-500 bg-slate-100';
}

function highlight(text, query) {
  if (!query) return text;
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>');
}

function getLevel(pts) { return LEVELS.slice().reverse().find(l=>pts>=l.min)||LEVELS[0]; }

// ─── Exportar/Importar Dados ──────────────────────────────────────────────────
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
  confirmDialog('ATENÇÃO: Isso apagará TODOS os dados desta conta. Tem certeza?', ()=>{ const k=window._dbStorageKey||'familyHubDB'; localStorage.removeItem(k); DB=JSON.parse(JSON.stringify(emptyDB)); window._dbStorageKey=k; saveDB(); renderApp(); toast('Sistema resetado.','warning'); });
}
