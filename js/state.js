// =============================================================================
// FAMILYHUB — state.js
// Estado global da aplicação
// =============================================================================

let currentView = 'dashboard';
let isDarkMode  = localStorage.getItem('familyHubDarkMode') === 'true';

// ─── Filtros de Atividades ────────────────────────────────────────────────────
let filterAtividades          = 'Todas';
let filterAtividadesMembro    = 'Todos';
let filterAtividadesStatus    = 'Todas';
let filterAtividadesPrioridade= 'Todas';
let sortAtividades            = 'data';
let searchAtividades          = '';

// ─── Filtros de Receitas ──────────────────────────────────────────────────────
let filterReceitas = 'Todas';
let searchReceitas = '';

// ─── Estado do Calendário ─────────────────────────────────────────────────────
let calMonth       = new Date().getMonth();
let calYear        = new Date().getFullYear();
let calFilterMembro= 'Todos';
let calFilterCat   = 'Todas';

// ─── Busca global ─────────────────────────────────────────────────────────────
let globalSearch     = '';
let globalSearchOpen = false;
