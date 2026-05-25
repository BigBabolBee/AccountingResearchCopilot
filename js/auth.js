const SUPABASE_URL = 'https://gzchpndcueapysozwqjq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tO4yZczJ0wWvQb3_r4IQRw_KjenVJ6S';
window._supabaseClient = (window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

let currentUser = null;   // { id, email, role }
let appInitialized = false;

// ── Auth state listener ──
if (window._supabaseClient) {
  window._supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const profile = await db_getProfile(session.user.id);
      currentUser = {
        id: session.user.id,
        email: session.user.email,
        role: profile?.role || 'researcher'
      };
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
}

// ── Profile lookup ──
async function db_getProfile(userId) {
  if (!window._supabaseClient) return null;
  const { data, error } = await window._supabaseClient.from('profiles').select('*').eq('user_id', userId).maybeSingle();
  return error ? null : data;
}

// ── UI toggle ──
function showApp() {
  const authEl = document.getElementById('authContainer');
  const appEl = document.getElementById('appContent');
  if (authEl) authEl.style.display = 'none';
  if (appEl) { appEl.style.display = 'flex'; appEl.style.flexDirection = 'column'; appEl.style.height = '100vh'; }
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
  const role = document.getElementById('authRole').value;
  if (!email || !password) { showAuthError('请填写邮箱和密码'); return; }
  if (password.length < 6) { showAuthError('密码至少 6 位'); return; }
  const passwordConfirm = document.getElementById('authPasswordConfirm').value;
  if (password !== passwordConfirm) { showAuthError('两次输入的密码不一致'); return; }
  if (!window._supabaseClient) { showAuthError('服务未就绪，请刷新页面后重试'); return; }
  setAuthLoading(true);
  try {
    const { data, error } = await window._supabaseClient.auth.signUp({
      email, password,
      options: { emailRedirectTo: 'https://bigbabolbee.github.io/AccountingResearchCopilot' }
    });
    if (error) { showAuthError(error.message); return; }
    if (data.user) {
      await window._supabaseClient.from('profiles').insert({ id: crypto.randomUUID(), user_id: data.user.id, email, role });
    }
    showAuthError('');
    showAuthMessage('注册成功！请检查邮箱确认链接。');
  } catch (e) {
    showAuthError(e.message || '注册失败，请稍后重试');
    console.error('signUp error:', e);
  } finally {
    setAuthLoading(false);
  }
}

async function handleSignIn() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  if (!email || !password) { showAuthError('请填写邮箱和密码'); return; }
  if (!window._supabaseClient) { showAuthError('服务未就绪，请刷新页面后重试'); return; }
  setAuthLoading(true);
  try {
    const { error } = await window._supabaseClient.auth.signInWithPassword({ email, password });
    if (error) { showAuthError(error.message); return; }
  } catch (e) {
    showAuthError(e.message || '登录失败，请稍后重试');
    console.error('signIn error:', e);
  } finally {
    setAuthLoading(false);
  }
}

async function handleSignOut() {
  await window._supabaseClient.auth.signOut();
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
  if (el) el.textContent = translateAuthError(msg);
}

function translateAuthError(msg) {
  const map = {
    'Invalid login credentials': '邮箱或密码错误',
    'User already registered': '该邮箱已注册，请直接登录',
    'Email not confirmed': '邮箱未验证，请先点击邮件中的确认链接',
    'Unable to validate email address: invalid format': '邮箱格式不正确',
    'Password should be at least 6 characters': '密码至少需要 6 位'
  };
  return map[msg] || msg;
}

function showAuthMessage(msg) {
  const el = document.getElementById('authMessage');
  if (el) el.textContent = msg;
}

