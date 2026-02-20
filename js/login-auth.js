// =============================================================================
// FAMILYHUB — login-auth.js
// Autenticação híbrida: tenta backend PHP, cai para localStorage offline.
//
// Modo Híbrido:
//   1. Tenta auth.php com timeout de 4s.
//   2. Se o servidor não responder, usa autenticação local (localStorage).
// Isso permite usar o app tanto com XAMPP/servidor quanto abrindo
// o index.html diretamente no navegador.
// =============================================================================

const API_BASE = './';

// ─── Chave de armazenamento de contas locais ──────────────────────────────────
const LOCAL_ACCOUNTS_KEY = 'fh_local_accounts';

// ─── Hash simples djb2 — apenas para modo demo/offline ───────────────────────
// NÃO use em produção com PHP. O backend usa bcrypt.
function localHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

// ─── Gerenciamento de contas locais ──────────────────────────────────────────
function getLocalAccounts() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ACCOUNTS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveLocalAccounts(accounts) {
  localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
}

/** Garante que a conta de demo existe sempre */
function ensureDemoAccount() {
  const accounts = getLocalAccounts();
  if (!accounts['admin@familyhub.com']) {
    accounts['admin@familyhub.com'] = {
      id:           'local_admin',
      name:         'Admin Demo',
      email:        'admin@familyhub.com',
      passwordHash: localHash('123456'),
      familyName:   'Família Demo',
      phone:        '(11) 99999-9999',
      age:          30,
    };
    saveLocalAccounts(accounts);
  }
}

// ─── Login offline ────────────────────────────────────────────────────────────
function loginOffline(email, pass) {
  ensureDemoAccount();
  const accounts = getLocalAccounts();
  const account  = accounts[email.toLowerCase()];

  if (!account)
    return { ok: false, error: 'E-mail não encontrado.' };
  if (account.passwordHash !== localHash(pass))
    return { ok: false, error: 'Senha incorreta.' };

  const token = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  const user  = {
    id:         account.id,
    name:       account.name,
    email:      account.email,
    familyName: account.familyName,
  };
  return { ok: true, token, user };
}

// ─── Registro offline ─────────────────────────────────────────────────────────
function registerOffline(name, email, pass, phone, age) {
  ensureDemoAccount();
  const accounts = getLocalAccounts();
  const key      = email.toLowerCase();

  if (accounts[key])
    return { ok: false, error: 'Este e-mail já está cadastrado.' };

  const newAccount = {
    id:           'local_' + Date.now(),
    name,
    email:        key,
    passwordHash: localHash(pass),
    familyName:   name + "'s Family",
    phone:        phone || '',
    age:          age || null,
  };
  accounts[key] = newAccount;
  saveLocalAccounts(accounts);

  const token = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  const user  = { id: newAccount.id, name, email: key, familyName: newAccount.familyName };
  return { ok: true, token, user };
}

// ─── Persistência após login bem-sucedido ────────────────────────────────────
function applyLoginSuccess(data) {
  localStorage.setItem('fh_token', data.token);
  localStorage.setItem('fh_user',  JSON.stringify(data.user));

  const userEmail = data.user?.email?.toLowerCase() || '';
  const dbKey     = userEmail ? `familyHubDB_${userEmail}` : 'familyHubDB';

  if (data.family_data) {
    localStorage.setItem(dbKey, JSON.stringify(data.family_data));
  }

  // Migração de dados legados do admin
  if (userEmail === 'admin@familyhub.com') {
    const legacy = localStorage.getItem('familyHubDB');
    if (legacy && !localStorage.getItem(dbKey)) {
      localStorage.setItem(dbKey, legacy);
    }
  }

  window.location.href = 'dashboard.html';
}

// ─── Fetch com timeout ────────────────────────────────────────────────────────
async function tryFetch(url, options, timeoutMs = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// ─── Submissão de login ───────────────────────────────────────────────────────
async function submitLogin() {
  hideError('login');

  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;

  if (!email || !pass) {
    showError('login', 'Preencha e-mail e senha.');
    return;
  }

  setLoading('login', true);

  // 1. Tenta backend PHP
  try {
    const res  = await tryFetch(`${API_BASE}auth.php?action=login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password: pass }),
    });
    const data = await res.json();

    if (!data.ok && data.offline_fallback) {
      // banco indisponível — cai para offline
    } else if (!data.ok) {
      showError('login', data.error || 'Erro ao fazer login.');
      setLoading('login', false, 'Entrar na plataforma');
      return;
    } else {
      applyLoginSuccess(data);
      return;
    }
  } catch (_) {
    // servidor indisponível — cai para offline
  }

  // 2. Fallback offline
  const result = loginOffline(email, pass);
  if (!result.ok) {
    showError('login', result.error);
    setLoading('login', false, 'Entrar na plataforma');
    return;
  }
  applyLoginSuccess(result);
}

// ─── Submissão de registro ────────────────────────────────────────────────────
async function submitRegister() {
  hideError('reg');

  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-password').value;
  const phone = document.getElementById('reg-phone').value;
  const age   = document.getElementById('reg-age').value;

  if (!name) {
    showError('reg', 'Informe seu nome completo.');
    return;
  }

  setLoading('reg', true);

  // 1. Tenta backend PHP
  try {
    const res  = await tryFetch(`${API_BASE}auth.php?action=register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, password: pass, phone, age: parseInt(age) || null }),
    });
    const data = await res.json();

    if (!data.ok && data.offline_fallback) {
      // banco indisponível — cai para offline
    } else if (!data.ok) {
      showError('reg', data.error || 'Erro ao criar conta.');
      setLoading('reg', false, 'Criar Conta');
      return;
    } else {
      applyLoginSuccess(data);
      return;
    }
  } catch (_) {
    // servidor indisponível — cai para offline
  }

  // 2. Fallback offline
  const result = registerOffline(name, email, pass, phone, parseInt(age) || null);
  if (!result.ok) {
    showError('reg', result.error);
    setLoading('reg', false, 'Criar Conta');
    return;
  }
  applyLoginSuccess(result);
}
