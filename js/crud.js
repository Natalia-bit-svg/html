// =============================================================================
// FAMILYHUB — crud.js
// Operações CRUD para atividades, listas, receitas e membros
// =============================================================================

// ─── ATIVIDADES ───────────────────────────────────────────────────────────────
function deleteAtividade(id) {
  const at = DB.atividades.find(a => a.id === id);
  confirmDialog('Excluir esta atividade?', () => {
    const title = at ? at.title : 'atividade';
    DB.atividades = DB.atividades.filter(a => a.id !== id);
    saveActivityLog('Sistema', `Excluiu a atividade "${title}"`, 'excluir');
    saveDB(); renderApp(); toast('Atividade excluída.');
  });
}
function toggleStatusAtividade(id) {
  const at = DB.atividades.find(a => a.id === id);
  if (!at) return;
  at.status = at.status === 'concluida' ? 'pendente' : 'concluida';
  saveDB(); renderApp();
}
function setStatusAtividade(id, status) {
  const at = DB.atividades.find(a => a.id === id);
  if (!at) return;
  at.status = status;
  saveActivityLog(at.resp || 'Sistema', `Alterou status de "${at.title}" para ${statusConfig[status]?.label || status}`, 'status');
  saveDB(); renderApp();
  toast(`Status: ${statusConfig[status].label}`, 'info');
}

// ─── LISTAS DE COMPRAS ────────────────────────────────────────────────────────
function addListItem(lIdx) {
  const input = document.getElementById(`add-item-${lIdx}`);
  if (!input.value.trim()) return;
  const item = input.value.trim();
  const lista = DB.listas[lIdx];
  lista.pendentes.push(item); input.value = '';
  saveActivityLog('Sistema', `Adicionou item "${item}" na lista "${lista.title}"`, 'lista');
  saveDB(); renderApp();
}
function checkItem(lIdx, iIdx) {
  const item = DB.listas[lIdx].pendentes.splice(iIdx, 1)[0];
  DB.listas[lIdx].carrinho.push(item);
  saveActivityLog('Sistema', `Marcou "${item}" como comprado na lista "${DB.listas[lIdx].title}"`, 'lista');
  saveDB(); setTimeout(renderApp, 100);
}
function uncheckItem(lIdx, iIdx) {
  const item = DB.listas[lIdx].carrinho.splice(iIdx, 1)[0];
  DB.listas[lIdx].pendentes.push(item);
  saveDB(); setTimeout(renderApp, 100);
}
function deleteListItem(lIdx, iIdx, isCarrinho) {
  const item = isCarrinho ? DB.listas[lIdx].carrinho[iIdx] : DB.listas[lIdx].pendentes[iIdx];
  if (isCarrinho) DB.listas[lIdx].carrinho.splice(iIdx, 1);
  else DB.listas[lIdx].pendentes.splice(iIdx, 1);
  saveActivityLog('Sistema', `Removeu item "${item}" da lista "${DB.listas[lIdx].title}"`, 'excluir');
  saveDB(); renderApp();
}
function limparCarrinho(lIdx) {
  const count = DB.listas[lIdx].carrinho.length;
  const nome  = DB.listas[lIdx].title;
  DB.listas[lIdx].carrinho = [];
  saveActivityLog('Sistema', `Limpou o carrinho da lista "${nome}" (${count} item${count > 1 ? 's' : ''})`, 'lista');
  saveDB(); renderApp(); toast(`${count} item${count > 1 ? 'ns' : ''} removido${count > 1 ? 's' : ''}.`);
}
function deleteLista(lIdx) {
  const nome = DB.listas[lIdx].title;
  confirmDialog(`Remover a lista "${nome}"?`, () => {
    DB.listas.splice(lIdx, 1);
    saveActivityLog('Sistema', `Excluiu a lista "${nome}"`, 'excluir');
    saveDB(); renderApp(); toast('Lista removida.');
  });
}

// ─── RECEITAS E MEMBROS ───────────────────────────────────────────────────────
function deleteReceita(id) {
  const rec = DB.receitas.find(r => r.id === id);
  confirmDialog('Excluir esta receita?', () => {
    const title = rec ? rec.title : 'receita';
    DB.receitas = DB.receitas.filter(r => r.id !== id);
    saveActivityLog('Sistema', `Excluiu a receita "${title}"`, 'excluir');
    saveDB(); renderApp(); toast('Receita excluída.');
  });
}
function deleteMembro(id) {
  const mem = DB.membros.find(m => m.id === id);
  confirmDialog('Remover este membro?', () => {
    const nome = mem ? mem.name : 'membro';
    DB.membros = DB.membros.filter(m => m.id !== id);
    saveActivityLog('Sistema', `Removeu o membro "${nome}"`, 'excluir');
    saveDB(); renderApp(); toast('Membro removido.');
  });
}

// ─── CONFIGURAÇÕES ────────────────────────────────────────────────────────────
function saveSettings() {
  const oldName  = DB.settings.familyName;
  const newName  = document.getElementById('cfg-name').value;
  const oldEmail = DB.settings.email;
  const newEmail = document.getElementById('cfg-email').value;
  const imgSrc   = document.getElementById('cfg-photo-preview').src;
  const hasNewPhoto = !imgSrc.includes('via.placeholder') && imgSrc !== DB.settings.photo;

  DB.settings.familyName = newName;
  DB.settings.email      = newEmail;
  if (!imgSrc.includes('via.placeholder')) DB.settings.photo = imgSrc;

  const changes = [];
  if (oldName  !== newName)  changes.push(`nome da família alterado para "${newName}"`);
  if (oldEmail !== newEmail) changes.push(`e-mail atualizado`);
  if (hasNewPhoto)           changes.push(`foto da família atualizada`);

  if (changes.length > 0) {
    saveActivityLog('Sistema', `Configurações: ${changes.join(', ')}`, hasNewPhoto ? 'foto' : 'config');
  } else {
    saveActivityLog('Sistema', 'Configurações salvas sem alterações', 'config');
  }

  saveDB(); toast('Configurações salvas com sucesso!');
}
