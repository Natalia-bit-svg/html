// =============================================================================
// FAMILYHUB — views/view-logs.js
// View: Histórico de Alterações
// =============================================================================

function renderLogs() {
  return `<div class="max-w-3xl mx-auto space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold">Histórico de Alterações</h2>
        <p class="text-slate-400 text-sm mt-1">Últimas 20 ações registradas no sistema</p>
      </div>
      <button onclick="loadLogs()" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-main/10 text-brand-main hover:bg-brand-main/20 font-bold text-sm transition-colors">
        <i data-lucide="refresh-cw" class="w-4 h-4"></i> Atualizar
      </button>
    </div>
    <div id="logs-container" class="space-y-3">
      <div class="text-center py-12 text-slate-400">
        <i data-lucide="history" class="w-10 h-10 mx-auto mb-3 opacity-30"></i>
        <p class="font-medium text-sm">Clique em "Atualizar" para carregar o histórico.</p>
      </div>
    </div>
  </div>`;
}
