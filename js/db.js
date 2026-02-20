// =============================================================================
// FAMILYHUB — db.js
// Banco de dados local (localStorage) + dados padrão
// =============================================================================

// ─── Banco vazio para usuários novos ─────────────────────────────────────────
const emptyDB = {
  settings: { familyName: 'Minha Família', email: '', photo: '' },
  gamification: {
    pontos: {},
    conquistas: [],
    streaks: {},
    lastActivityDate: {},
    premios_resgatados: [],
    desafios: [],
  },
  notificacoes: [],
  logs:       [],
  atividades: [],
  listas:     [],
  receitas:   [],
  membros:    [],
};

// ─── Dados demo para o usuário admin@familyhub.com ────────────────────────────
const adminDemoData = {
  settings: { familyName: 'Família Gomes', email: 'admin@familyhub.com', photo: '' },
  gamification: {
    pontos: {},
    conquistas: [],
    streaks: {},
    lastActivityDate: {},
    premios_resgatados: [],
    desafios: [],
  },
  notificacoes: [],
  atividades: [
    { id: 1, title: 'Compras do Mês',    date: '2026-02-19', time: '09:00', tag: 'TAREFA DOMÉSTICA', resp: 'Papai', status: 'pendente',  priority: 'media',  notes: '', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { id: 2, title: 'Natação do Lucas',  date: '2026-02-19', time: '14:00', tag: 'ESPORTE',          resp: 'Lucas', status: 'andamento', priority: 'alta',   notes: 'Levar toalha e óculos', color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400' },
    { id: 3, title: 'Dentista (Revisão)',date: '2026-02-22', time: '15:30', tag: 'SAÚDE',            resp: 'Lucas', status: 'concluida', priority: 'alta',   notes: '', color: 'text-red-500 bg-red-50 dark:bg-red-900/30 dark:text-red-400' },
  ],
  listas: [
    { id: 1, title: 'Compras do Mês',     border: 'border-blue-500',    icon: 'shopping-cart', pendentes: ['Arroz 5kg','Feijão Carioca','Café 500g','Óleo de Soja'], carrinho: ['Azeite Extra Virgem','Sal'] },
    { id: 2, title: 'Feira & Hortifruti', border: 'border-emerald-500', icon: 'leaf',          pendentes: ['Tomate Italiano','Bananas Prata','Cebola','Alho'],         carrinho: [] },
    { id: 3, title: 'Farmácia & Geral',   border: 'border-purple-500',  icon: 'pill',          pendentes: ['Dipirona Gotas','Fio Dental','Shampoo'],                    carrinho: ['Vitamina C'] },
  ],
  receitas: [
    { id: 1, title: 'Bolo de Milho Cremoso', tag: 'DOCES',   time: '45 min',   diff: 'Fácil', porcoes: 8, img: 'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=800', ingredients: ['3 espigas de milho verde','1 xícara de açúcar','1 xícara de leite','1/2 xícara de óleo','3 ovos','1 colher de fermento'], steps: '1. Retire os grãos da espiga.\n2. Bata tudo no liquidificador.\n3. Misture o fermento.\n4. Asse a 180°C por 40 minutos.' },
    { id: 2, title: 'Lasanha à Bolonhesa',   tag: 'SALGADOS',time: '1h 20min', diff: 'Médio', porcoes: 6, img: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800', ingredients: ['500g de massa para lasanha','500g de carne moída','300g de mussarela','300g de presunto','2 sachês de molho de tomate','Alho e cebola'], steps: '1. Refogue alho, cebola e carne.\n2. Adicione molho e tempere.\n3. Monte em camadas: molho, massa, presunto, queijo.\n4. Asse por 30 min.' },
  ],
  membros: [
    { id: 1, name: 'Papai', role: 'PAI',   photo: 'https://i.pravatar.cc/150?img=11', border: 'border-blue-500',   borderHex: '#3b82f6' },
    { id: 2, name: 'Mamãe', role: 'MÃE',   photo: 'https://i.pravatar.cc/150?img=5',  border: 'border-pink-400',   borderHex: '#f472b6' },
    { id: 3, name: 'Lucas', role: 'FILHO', photo: 'https://i.pravatar.cc/150?img=12', border: 'border-orange-400', borderHex: '#fb923c' },
  ],
};

// Alias mantido para compatibilidade
const defaultDB = emptyDB;

// ─── Inicialização do DB ──────────────────────────────────────────────────────
function getInitialDB() {
  const loggedUser  = Auth.getUser();
  const userEmail   = loggedUser?.email?.toLowerCase() || '';
  const storageKey  = userEmail ? `familyHubDB_${userEmail}` : 'familyHubDB';

  window._dbStorageKey = storageKey;

  if (userEmail === 'admin@familyhub.com') {
    const legacyData = localStorage.getItem('familyHubDB');
    if (legacyData && !localStorage.getItem(storageKey)) {
      localStorage.setItem(storageKey, legacyData);
    }
  }

  const stored = localStorage.getItem(storageKey);
  const template = (userEmail === 'admin@familyhub.com') ? adminDemoData : emptyDB;
  const db = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(template));

  if (!db.settings)   db.settings   = { ...template.settings };
  db.atividades = (db.atividades || []).map(a  => ({ status: 'pendente', priority: 'media', notes: '', ...a }));
  db.listas     = (db.listas     || []).map((l, i) => ({ id: l.id || Date.now() + i, icon: l.icon || 'shopping-cart', ...l }));
  db.receitas   = (db.receitas   || []).map(r  => ({ porcoes: 4, ...r }));
  db.membros    = (db.membros    || []).map(m  => ({ borderHex: '#3b82f6', ...m }));
  if (!db.gamification)                    db.gamification = JSON.parse(JSON.stringify(emptyDB.gamification));
  if (!db.gamification.pontos)             db.gamification.pontos = {};
  if (!db.gamification.conquistas)         db.gamification.conquistas = [];
  if (!db.gamification.streaks)            db.gamification.streaks = {};
  if (!db.gamification.lastActivityDate)   db.gamification.lastActivityDate = {};
  if (!db.gamification.premios_resgatados) db.gamification.premios_resgatados = [];
  if (!db.gamification.desafios)           db.gamification.desafios = [];
  if (!db.notificacoes)                    db.notificacoes = [];
  if (!db.logs)                            db.logs = [];
  return db;
}

let DB = getInitialDB();

function saveDB(sync = true) {
  const key = window._dbStorageKey || 'familyHubDB';
  localStorage.setItem(key, JSON.stringify(DB));
  updateSidebarSettings();
  if (sync) API.syncData();
}
