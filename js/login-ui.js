// =============================================================================
// FAMILYHUB — login-ui.js
// UI da tela de login: abas, toggle de senha, validação de formulário
// =============================================================================

// Inicialização após DOM pronto
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();

  // Redireciona se já logado
  if (localStorage.getItem('fh_token')) {
    window.location.href = 'dashboard.html';
  }

  // Máscara de telefone
  document.getElementById('reg-phone')?.addEventListener('input', maskPhone);
});

// ─── Preenchimento automático das credenciais demo ────────────────────────────
function fillLogin(email, pass) {
  document.getElementById('login-email').value = email;
  document.getElementById('login-pass').value  = pass;
  showForm('login');
}

// ─── Alternância entre abas Login / Registro ──────────────────────────────────
function showForm(which) {
  const isLogin = which === 'login';

  document.getElementById('form-login').classList.toggle('hidden', !isLogin);
  document.getElementById('form-register').classList.toggle('hidden', isLogin);

  // Aba login
  const tabLogin = document.getElementById('tab-login');
  tabLogin.classList.toggle('tab-active', isLogin);
  tabLogin.classList.toggle('text-brand-main', isLogin);
  tabLogin.classList.toggle('text-slate-400', !isLogin);

  // Aba registro
  const tabReg = document.getElementById('tab-register');
  tabReg.classList.toggle('tab-active', !isLogin);
  tabReg.classList.toggle('text-brand-main', !isLogin);
  tabReg.classList.toggle('text-slate-400', isLogin);
}

// ─── Toggle visibilidade da senha ─────────────────────────────────────────────
function togglePassVis(inputId, btn) {
  const input  = document.getElementById(inputId);
  const isPass = input.type === 'password';
  input.type   = isPass ? 'text' : 'password';
  btn.innerHTML = isPass
    ? '<i data-lucide="eye-off" class="w-4 h-4"></i>'
    : '<i data-lucide="eye"     class="w-4 h-4"></i>';
  lucide.createIcons({ nodes: [btn] });
}

// ─── Máscara de telefone ──────────────────────────────────────────────────────
function maskPhone(e) {
  const x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
  e.target.value = !x[2] ? x[1] : `(${x[1]}) ${x[2]}${x[3] ? '-' + x[3] : ''}`;
}

// ─── Validação de senha em tempo real ────────────────────────────────────────
const PASSWORD_RULES = {
  len:  /.{8,}/,
  caps: /[A-Z]/,
  num:  /[0-9]/,
  spec: /[@$!%*?&]/,
};

function validatePassword() {
  const passVal    = document.getElementById('reg-password').value;
  const confirmVal = document.getElementById('reg-confirm').value;
  let count = 0;

  // Verifica cada regra
  Object.entries(PASSWORD_RULES).forEach(([key, regex]) => {
    const el = document.querySelector(`[data-req="${key}"]`);
    const ok = regex.test(passVal);
    if (ok) count++;
    el.classList.toggle('text-brand-main', ok);
    el.classList.toggle('text-slate-400',  !ok);
  });

  // Barra de força
  const bar = document.getElementById('strength-bar');
  bar.style.width = (count / 4 * 100) + '%';
  bar.className   = 'h-full transition-all duration-500 rounded-full '
    + (count < 2 ? 'bg-red-400' : count < 4 ? 'bg-amber-400' : 'bg-brand-main');

  // Confirmação de senha
  const matches = passVal === confirmVal && passVal !== '';
  document.getElementById('match-error').classList.toggle('hidden', confirmVal === '' || matches);

  // Habilita botão apenas se tudo ok
  const allOk = count === 4 && matches;
  const btn   = document.getElementById('reg-btn');
  btn.disabled  = !allOk;
  btn.className = `w-full ${
    allOk
      ? 'bg-brand-main hover:bg-brand-dark cursor-pointer shadow-lg shadow-brand-main/20'
      : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
  } text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2`;
}

// ─── Exibição e ocultação de erros inline ─────────────────────────────────────
function showError(prefix, msg) {
  const box  = document.getElementById(`${prefix}-error`);
  const span = document.getElementById(`${prefix}-error-msg`);
  span.textContent = msg;
  box.classList.remove('hidden');
  box.classList.add('shake');
  setTimeout(() => box.classList.remove('shake'), 400);
  lucide.createIcons({ nodes: [box] });
}

function hideError(prefix) {
  document.getElementById(`${prefix}-error`).classList.add('hidden');
}

// ─── Estado de carregamento dos botões ───────────────────────────────────────
function setLoading(prefix, isLoading, label = '') {
  const btn = document.getElementById(`${prefix}-btn`);
  const txt = document.getElementById(`${prefix}-btn-text`);
  btn.disabled = isLoading;
  if (isLoading) {
    txt.textContent = 'Aguarde...';
    btn.classList.add('opacity-70');
  } else {
    txt.textContent = label;
    btn.classList.remove('opacity-70');
  }
}
