// =============================================================================
// FAMILYHUB — modals.js
// Sistema de modais: abertura, fechamento e salvamento de formulários
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
            ${['Tarefa Doméstica','Escola','Esporte','Saúde','Social'].map(c=>`<option ${at&&at.tag===c.toUpperCase()?'selected':''}>${c}</option>`).join('')}
          </select></div>
        <div><label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Responsável *</label>
          ${DB.membros.length===0
            ? `<div class="w-full p-3 border border-red-200 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">⚠️ Nenhum membro cadastrado. <a href="#" onclick="closeModal();navigate('membros');" class="underline font-bold">Cadastre um membro</a> antes de criar atividades.</div><input type="hidden" id="mod-resp" value="">`
            : `<select id="mod-resp" class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm">
            ${DB.membros.map(m=>`<option ${at&&at.resp===m.name?'selected':''}>${m.name}</option>`).join('')}
          </select>`
          }</div>
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

// ─── Salvar formulários ───────────────────────────────────────────────────────
function saveFormAtividade() {
  const idVal=document.getElementById('mod-at-id').value;
  const title=document.getElementById('mod-title').value.trim();
  const date =document.getElementById('mod-date').value;
  if (!title){toast('Informe o título!','error');return;} if(!date){toast('Informe a data!','error');return;}
  const respVal=document.getElementById('mod-resp').value;
  if(!respVal){toast('Selecione um responsável!','error');return;}
  if(DB.membros.length===0){toast('Cadastre um membro antes de criar atividades!','error');return;}
  const cat=document.getElementById('mod-cat').value;
  const atData={title,date,time:document.getElementById('mod-time').value,tag:cat.toUpperCase(),resp:document.getElementById('mod-resp').value,priority:document.getElementById('mod-prio').value,status:document.getElementById('mod-status').value,notes:document.getElementById('mod-notes').value,color:getTagColor(cat.toUpperCase())};
  if(idVal){const idx=DB.atividades.findIndex(a=>a.id==idVal); DB.atividades[idx]={...DB.atividades[idx],...atData}; saveActivityLog(atData.resp||'Sistema',`Editou a atividade "${atData.title}"`, 'editar'); toast('Atividade atualizada!');}
  else{
    DB.atividades.push({id:Date.now(),...atData});
    saveActivityLog(atData.resp||'Sistema', `Criou a atividade "${atData.title}" para ${atData.date}`, 'criar');
    toast('Atividade criada!');
  }
  saveDB(); closeModal(); renderApp();
}

function saveFormLista() {
  const idVal=document.getElementById('mod-l-id').value;
  const title=document.getElementById('mod-l-title').value.trim();
  if(!title){toast('Informe o nome!','error');return;}
  const listData={title,border:document.getElementById('mod-l-border').value,icon:document.getElementById('mod-l-icon').value};
  if(idVal){
    const idx=DB.listas.findIndex(l=>l.id==idVal);
    DB.listas[idx]={...DB.listas[idx],...listData};
    saveActivityLog('Sistema', `Editou a lista "${listData.title}"`, 'editar');
    toast('Lista atualizada!');
  } else {
    DB.listas.push({id:Date.now(),pendentes:[],carrinho:[],...listData});
    saveActivityLog('Sistema', `Criou a lista "${listData.title}"`, 'lista');
    toast('Lista criada!');
  }
  saveDB(); closeModal(); renderApp();
}

function saveFormMembro() {
  const idVal=document.getElementById('mod-m-id').value;
  const name=document.getElementById('mod-m-name').value.trim();
  if(!name){toast('Informe o nome!','error');return;}
  const imgSrc=document.getElementById('mod-m-preview').src;
  const photo=imgSrc.includes('via.placeholder')?`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`:imgSrc;
  const memData={name,role:(document.getElementById('mod-m-role').value||'').toUpperCase(),photo,border:document.getElementById('mod-m-border').value,borderHex:document.getElementById('mod-m-borderhex').value};
  const oldMem = idVal ? DB.membros.find(m=>m.id==idVal) : null;
  if(idVal){
    const idx=DB.membros.findIndex(m=>m.id==idVal);
    const hadPhoto = oldMem && oldMem.photo && !oldMem.photo.includes('ui-avatars');
    const hasNewPhoto = memData.photo && !memData.photo.includes('ui-avatars') && memData.photo !== (oldMem && oldMem.photo);
    DB.membros[idx]={...DB.membros[idx],...memData};
    if(hasNewPhoto) saveActivityLog('Sistema', `Atualizou a foto de "${memData.name}"`, 'foto');
    else saveActivityLog('Sistema', `Editou o membro "${memData.name}"`, 'editar');
    toast('Membro atualizado!');
  } else {
    DB.membros.push({id:Date.now(),...memData});
    saveActivityLog('Sistema', `Adicionou o membro "${memData.name}" (${memData.role})`, 'membro');
    toast('Membro adicionado!');
  }
  saveDB(); closeModal(); renderApp();
}

function saveFormReceita() {
  const idVal=document.getElementById('mod-r-id').value;
  const title=document.getElementById('mod-r-title').value.trim();
  if(!title){toast('Informe o título!','error');return;}
  const imgSrc=document.getElementById('mod-r-preview').src;
  const recData={title,tag:document.getElementById('mod-r-tag').value.toUpperCase(),time:document.getElementById('mod-r-time').value,diff:document.getElementById('mod-r-diff').value,porcoes:parseInt(document.getElementById('mod-r-porcoes').value)||4,img:imgSrc.includes('via.placeholder')?'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800':imgSrc,steps:document.getElementById('mod-r-steps').value,ingredients:document.getElementById('mod-r-ing').value.split('\n').filter(i=>i.trim())};
  if(idVal){
    const idx=DB.receitas.findIndex(r=>r.id==idVal);
    DB.receitas[idx]={...DB.receitas[idx],...recData};
    saveActivityLog('Sistema', `Editou a receita "${recData.title}"`, 'editar');
    toast('Receita atualizada!');
  } else {
    DB.receitas.push({id:Date.now(),...recData});
    saveActivityLog('Sistema', `Criou a receita "${recData.title}" (${recData.tag})`, 'receita');
    toast('Receita criada!');
  }
  saveDB(); closeModal(); renderApp();
}
