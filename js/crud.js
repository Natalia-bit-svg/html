// =============================================================================
// FAMILYHUB — crud.js
// Operações CRUD para atividades, listas, receitas e membros
// =============================================================================

// ─── ATIVIDADES ───────────────────────────────────────────────────────────────
function deleteAtividade(id) {
  confirmDialog('Excluir esta atividade?', () => { DB.atividades=DB.atividades.filter(a=>a.id!==id); saveDB(); renderApp(); toast('Atividade excluída.'); });
}
function toggleStatusAtividade(id) {
  const at = DB.atividades.find(a=>a.id===id);
  if (!at) return;
  at.status = at.status==='concluida'?'pendente':'concluida';
  saveDB(); renderApp();
}
function setStatusAtividade(id, status) {
  const at = DB.atividades.find(a=>a.id===id);
  if (!at) return;
  at.status = status;
  saveDB(); renderApp();
  toast(`Status: ${statusConfig[status].label}`, 'info');
}

// ─── LISTAS DE COMPRAS ────────────────────────────────────────────────────────
function addListItem(lIdx) {
  const input = document.getElementById(`add-item-${lIdx}`);
  if (!input.value.trim()) return;
  DB.listas[lIdx].pendentes.push(input.value.trim()); input.value='';
  saveDB(); renderApp();
}
function checkItem(lIdx, iIdx) { const item=DB.listas[lIdx].pendentes.splice(iIdx,1)[0]; DB.listas[lIdx].carrinho.push(item); saveDB(); setTimeout(renderApp,100); }
function uncheckItem(lIdx, iIdx) { const item=DB.listas[lIdx].carrinho.splice(iIdx,1)[0]; DB.listas[lIdx].pendentes.push(item); saveDB(); setTimeout(renderApp,100); }
function deleteListItem(lIdx, iIdx, isCarrinho) { if(isCarrinho)DB.listas[lIdx].carrinho.splice(iIdx,1); else DB.listas[lIdx].pendentes.splice(iIdx,1); saveDB(); renderApp(); }
function limparCarrinho(lIdx) { const count=DB.listas[lIdx].carrinho.length; DB.listas[lIdx].carrinho=[]; saveDB(); renderApp(); toast(`${count} item${count>1?'ns':''} removido${count>1?'s':''}.`); }
function deleteLista(lIdx) { confirmDialog(`Remover a lista "${DB.listas[lIdx].title}"?`, ()=>{ DB.listas.splice(lIdx,1); saveDB(); renderApp(); toast('Lista removida.'); }); }

// ─── RECEITAS E MEMBROS ───────────────────────────────────────────────────────
function deleteReceita(id) { confirmDialog('Excluir esta receita?', ()=>{ DB.receitas=DB.receitas.filter(r=>r.id!==id); saveDB(); renderApp(); toast('Receita excluída.'); }); }
function deleteMembro(id)  { confirmDialog('Remover este membro?', ()=>{ DB.membros=DB.membros.filter(m=>m.id!==id); saveDB(); renderApp(); toast('Membro removido.'); }); }

// ─── CONFIGURAÇÕES ────────────────────────────────────────────────────────────
function saveSettings() {
  DB.settings.familyName = document.getElementById('cfg-name').value;
  DB.settings.email      = document.getElementById('cfg-email').value;
  const imgSrc = document.getElementById('cfg-photo-preview').src;
  if (!imgSrc.includes('via.placeholder')) DB.settings.photo = imgSrc;
  saveDB(); toast('Configurações salvas com sucesso!');
}
