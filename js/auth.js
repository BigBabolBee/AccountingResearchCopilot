const SUPABASE_URL = 'https://gzchpndcueapysozwqjq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tO4yZczJ0wWvQb3_r4IQRw_KjenVJ6S';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let appInitialized = false;

// ── Auth state listener ──
supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    currentUser = session.user;
    if (!appInitialized) {
      await initData();
      initUI();
      appInitialized = true;
    }
    showApp();
  } else {
    currentUser = null;
    showAuth();
  }
});

// ── UI toggle ──
function showApp() {
  const authEl = document.getElementById('authContainer');
  const appEl = document.getElementById('appContent');
  if (authEl) authEl.style.display = 'none';
  if (appEl) appEl.style.display = 'flex';
  // Set user email in header
  const el = document.getElementById('userEmail');
  if (el && currentUser) el.textContent = currentUser.email;
}

function showAuth() {
  const authEl = document.getElementById('authContainer');
  const appEl = document.getElementById('appContent');
  if (authEl) authEl.style.display = 'flex';
  if (appEl) appEl.style.display = 'none';
}

// ── Auth actions ──
async function handleSignUp() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  if (!email || !password) { showAuthError('请填写邮箱和密码'); return; }
  if (password.length < 6) { showAuthError('密码至少 6 位'); return; }
  setAuthLoading(true);
  const { error } = await supabase.auth.signUp({ email, password });
  setAuthLoading(false);
  if (error) { showAuthError(error.message); return; }
  showAuthError('');
  showAuthMessage('注册成功！请检查邮箱确认链接（如已关闭邮件确认，则直接登录）。');
}

async function handleSignIn() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  if (!email || !password) { showAuthError('请填写邮箱和密码'); return; }
  setAuthLoading(true);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  setAuthLoading(false);
  if (error) { showAuthError(error.message); return; }
}

async function handleSignOut() {
  await supabase.auth.signOut();
}

function setAuthLoading(loading) {
  const btn = document.getElementById('authSubmitBtn');
  if (btn) {
    btn.disabled = loading;
    btn.textContent = loading ? '处理中...' : (window._authMode === 'signup' ? '注册' : '登录');
  }
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  if (el) el.textContent = msg;
}

function showAuthMessage(msg) {
  const el = document.getElementById('authMessage');
  if (el) el.textContent = msg;
}

function switchAuthMode(mode) {
  window._authMode = mode;
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('authTab' + (mode === 'signup' ? 'SignUp' : 'SignIn')).classList.add('active');
  document.getElementById('authTitle').textContent = mode === 'signup' ? '创建账号' : '登录';
  document.getElementById('authSubmitBtn').textContent = mode === 'signup' ? '注册' : '登录';
  document.getElementById('authSwitchText').innerHTML = mode === 'signup'
    ? '已有账号？<span class="auth-switch-link" onclick="switchAuthMode(\'signin\')">去登录</span>'
    : '没有账号？<span class="auth-switch-link" onclick="switchAuthMode(\'signup\')">去注册</span>';
  document.getElementById('authError').textContent = '';
  document.getElementById('authMessage').textContent = '';
}
